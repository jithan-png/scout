import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { normalizeCompany } from "@/lib/normalize";

interface GooglePerson {
  names?: { displayName?: string; familyName?: string; givenName?: string }[];
  emailAddresses?: { value?: string }[];
  phoneNumbers?: { value?: string; canonicalForm?: string }[];
  organizations?: { name?: string; title?: string }[];
}

// ── POST /api/contacts/sync/gmail ─────────────────────────────────────────────
// Pulls the user's Google Contacts via People API and stores them in
// user_contacts + user_companies for relationship intelligence.

export async function POST() {
  const session = await auth();
  const userId = session?.user?.email;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessToken = (session as any)?.accessToken as string | undefined;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!accessToken) {
    return NextResponse.json(
      { error: "no_token", message: "Please sign out and sign back in to grant contacts access." },
      { status: 403 }
    );
  }

  // Log sync job start
  const { data: job } = await supabase
    .from("contact_sync_jobs")
    .insert({ user_id: userId, source: "gmail", status: "running" })
    .select("id")
    .single();
  const jobId = job?.id;

  try {
    // Fetch all pages of Google Contacts
    const allPeople: GooglePerson[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL("https://people.googleapis.com/v1/people/me/connections");
      url.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,organizations");
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 403 || res.status === 401) {
        throw new Error("no_scope");
      }
      if (!res.ok) throw new Error(`Google API error ${res.status}`);

      const data = await res.json();
      allPeople.push(...(data.connections ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    if (!allPeople.length) {
      await supabase
        .from("contact_sync_jobs")
        .update({ status: "done", contacts_synced: 0, completed_at: new Date().toISOString() })
        .eq("id", jobId);
      return NextResponse.json({ synced: 0, message: "No contacts found in Google account." });
    }

    // ── Parse and upsert contacts ─────────────────────────────────────────────
    const companyMap = new Map<string, { count: number; domain: string | null }>();
    const contactRows: Record<string, unknown>[] = [];

    for (const person of allPeople) {
      const name = person.names?.[0]?.displayName?.trim();
      const email = person.emailAddresses?.[0]?.value?.toLowerCase().trim();
      const phone = person.phoneNumbers?.[0]?.canonicalForm ?? person.phoneNumbers?.[0]?.value ?? null;
      const companyName = person.organizations?.[0]?.name?.trim() ?? null;
      const role = person.organizations?.[0]?.title?.trim() ?? null;

      if (!name) continue; // skip nameless contacts
      if (!email && !phone) continue; // need at least one contact method

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
        source: "gmail",
        name,
        email: email ?? null,
        phone: phone ?? null,
        company_name: companyName,
        company_normalized: companyNorm,
        role,
        created_at: new Date().toISOString(),
      });
    }

    // Batch upsert contacts (100 at a time)
    let synced = 0;
    for (let i = 0; i < contactRows.length; i += 100) {
      const chunk = contactRows.slice(i, i + 100);
      const { data, error } = await supabase
        .from("user_contacts")
        .upsert(chunk, { onConflict: "user_id,email", ignoreDuplicates: false })
        .select("id");
      if (!error) synced += data?.length ?? 0;
    }

    // Upsert normalized companies
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

    // Mark job done
    if (jobId) {
      await supabase
        .from("contact_sync_jobs")
        .update({ status: "done", contacts_synced: synced, completed_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    return NextResponse.json({
      synced,
      companies: companyMap.size,
      message: `Synced ${synced} contacts from ${companyMap.size} companies.`,
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (jobId) {
      await supabase
        .from("contact_sync_jobs")
        .update({ status: "failed", error: msg, completed_at: new Date().toISOString() })
        .eq("id", jobId);
    }
    if (msg === "no_scope") {
      return NextResponse.json(
        { error: "no_scope", message: "Please sign out and sign back in to grant contacts access." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET /api/contacts/sync/gmail ──────────────────────────────────────────────
// Returns the last sync job status for the current user.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) return NextResponse.json(null);

  const { data } = await supabase
    .from("contact_sync_jobs")
    .select("status, contacts_synced, completed_at, created_at, error")
    .eq("user_id", userId)
    .eq("source", "gmail")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: counts } = await supabase
    .from("user_contacts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("source", "gmail");

  return NextResponse.json({
    lastSync: data ?? null,
    totalContacts: (counts as unknown as { count: number } | null)?.count ?? 0,
  });
}
