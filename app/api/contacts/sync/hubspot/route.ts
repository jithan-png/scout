import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { normalizeCompany } from "@/lib/normalize";

// ── HubSpot CRM API helpers ───────────────────────────────────────────────────

interface HsContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    hs_email_last_send_date?: string;
    num_contacted_notes?: string;
  };
}

interface HsDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    createdate?: string;
    hubspot_owner_id?: string;
  };
  associations?: {
    companies?: { results: { id: string }[] };
    contacts?: { results: { id: string }[] };
  };
}

async function fetchAllPages<T>(
  url: string,
  token: string
): Promise<T[]> {
  const all: T[] = [];
  let after: string | undefined;

  do {
    const pageUrl = after ? `${url}&after=${after}` : url;
    const res = await fetch(pageUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`HubSpot API ${res.status}: ${await res.text()}`);
    const data = await res.json() as { results: T[]; paging?: { next?: { after: string } } };
    all.push(...(data.results ?? []));
    after = data.paging?.next?.after;
  } while (after);

  return all;
}

async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!res.ok) return null;

  const tokens = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await supabase.from("user_integrations").upsert(
    {
      user_id: userId,
      provider: "hubspot",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  return tokens.access_token;
}

// ── POST /api/contacts/sync/hubspot ───────────────────────────────────────────
// Pulls contacts + deals from HubSpot and upserts them into user_contacts /
// user_companies. Deals are stored in contact metadata so the relationship
// scoring can weight CRM interactions more heavily.

export async function POST() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load stored tokens
  const { data: integration, error: intErr } = await supabase
    .from("user_integrations")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "hubspot")
    .single();

  if (intErr || !integration) {
    return NextResponse.json(
      { error: "not_connected", message: "HubSpot is not connected. Please connect first." },
      { status: 403 }
    );
  }

  // Refresh token if expired (or expiring within 5 minutes)
  let accessToken = integration.access_token;
  if (integration.expires_at) {
    const expiresAt = new Date(integration.expires_at).getTime();
    if (Date.now() > expiresAt - 5 * 60 * 1000) {
      const refreshed = await refreshAccessToken(userId, integration.refresh_token);
      if (refreshed) accessToken = refreshed;
    }
  }

  // Log sync job
  const { data: job } = await supabase
    .from("contact_sync_jobs")
    .insert({ user_id: userId, source: "hubspot", status: "running" })
    .select("id")
    .single();
  const jobId = job?.id;

  try {
    // ── 1. Fetch contacts ────────────────────────────────────────────────────
    const hsContacts = await fetchAllPages<HsContact>(
      "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,phone,company,jobtitle,hs_email_last_send_date,num_contacted_notes",
      accessToken
    );

    // ── 2. Fetch deals (with company + contact associations) ─────────────────
    const hsDeals = await fetchAllPages<HsDeal>(
      "https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,createdate&associations=companies,contacts",
      accessToken
    );

    // Build a map: HubSpot contact ID → deal info (for interaction scoring)
    const contactDealMap = new Map<string, HsDeal[]>();
    for (const deal of hsDeals) {
      const contactIds = deal.associations?.contacts?.results?.map((r) => r.id) ?? [];
      for (const cid of contactIds) {
        const existing = contactDealMap.get(cid) ?? [];
        existing.push(deal);
        contactDealMap.set(cid, existing);
      }
    }

    // ── 3. Upsert contacts ───────────────────────────────────────────────────
    const companyMap = new Map<string, { count: number; domain: string | null }>();
    const contactRows: Record<string, unknown>[] = [];

    for (const c of hsContacts) {
      const p = c.properties;
      const firstName = p.firstname?.trim() ?? "";
      const lastName = p.lastname?.trim() ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ");
      if (!name) continue;

      const email = p.email?.toLowerCase().trim() ?? null;
      const phone = p.phone?.trim() ?? null;
      const companyName = p.company?.trim() ?? null;
      const role = p.jobtitle?.trim() ?? null;

      if (!email && !phone) continue;

      const deals = contactDealMap.get(c.id) ?? [];
      const interactionCount = Math.max(
        parseInt(p.num_contacted_notes ?? "0", 10),
        deals.length
      );
      const lastDealDate = deals
        .map((d) => d.properties.closedate ?? d.properties.createdate ?? "")
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;

      const companyNorm = companyName ? normalizeCompany(companyName) : null;
      const domain = email ? email.split("@")[1] ?? null : null;

      if (companyNorm) {
        const existing = companyMap.get(companyNorm) ?? { count: 0, domain: null };
        companyMap.set(companyNorm, {
          count: existing.count + 1,
          domain: existing.domain ?? domain,
        });
      }

      contactRows.push({
        user_id: userId,
        source: "hubspot",
        name,
        email,
        phone,
        company_name: companyName,
        company_normalized: companyNorm,
        role,
        interaction_count: interactionCount,
        last_interaction_at: lastDealDate
          ? new Date(lastDealDate).toISOString()
          : p.hs_email_last_send_date
          ? new Date(p.hs_email_last_send_date).toISOString()
          : null,
        created_at: new Date().toISOString(),
      });
    }

    // Batch upsert contacts (100 at a time)
    let synced = 0;
    for (let i = 0; i < contactRows.length; i += 100) {
      const { data, error } = await supabase
        .from("user_contacts")
        .upsert(contactRows.slice(i, i + 100), {
          onConflict: "user_id,email",
          ignoreDuplicates: false,
        })
        .select("id");
      if (!error) synced += data?.length ?? 0;
    }

    // Upsert companies
    const companyRows = [...companyMap.entries()].map(([norm, { count, domain }]) => ({
      user_id: userId,
      name_normalized: norm,
      domain,
      contact_count: count,
      last_interaction_at: new Date().toISOString(),
    }));

    for (let i = 0; i < companyRows.length; i += 100) {
      await supabase
        .from("user_companies")
        .upsert(companyRows.slice(i, i + 100), { onConflict: "user_id,name_normalized" });
    }

    if (jobId) {
      await supabase
        .from("contact_sync_jobs")
        .update({ status: "done", contacts_synced: synced, completed_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    return NextResponse.json({
      synced,
      deals: hsDeals.length,
      companies: companyMap.size,
      message: `Synced ${synced} contacts and ${hsDeals.length} deals from HubSpot.`,
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (jobId) {
      await supabase
        .from("contact_sync_jobs")
        .update({ status: "failed", error: msg, completed_at: new Date().toISOString() })
        .eq("id", jobId);
    }
    console.error("[hubspot/sync] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET /api/contacts/sync/hubspot ────────────────────────────────────────────
// Returns connection status + last sync info.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) return NextResponse.json(null);

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("metadata, expires_at, updated_at")
    .eq("user_id", userId)
    .eq("provider", "hubspot")
    .single();

  const { data: lastJob } = await supabase
    .from("contact_sync_jobs")
    .select("status, contacts_synced, completed_at, error")
    .eq("user_id", userId)
    .eq("source", "hubspot")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: counts } = await supabase
    .from("user_contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", "hubspot");

  return NextResponse.json({
    connected: !!integration,
    lastSync: lastJob ?? null,
    totalContacts: (counts as unknown as { count: number } | null)?.count ?? 0,
    portalId: integration?.metadata?.portal_id ?? null,
  });
}
