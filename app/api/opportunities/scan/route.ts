// ── POST /api/opportunities/scan ──────────────────────────────────────────────
// User-triggered permit scan. Runs the same scoring logic as the daily cron
// but for the authenticated user only. Returns { found, added, message }.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import type { ScoutOpportunity, ScoreBreakdown } from "@/lib/types";

function getDB() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

interface PermitRow {
  id?: string;
  address: string;
  city: string;
  state?: string;
  project_type: string;
  value?: number;
  builder_company?: string;
  builder_phone?: string;
  builder_email?: string;
  applicant_company?: string;
  owner_company?: string;
  issued_date?: string;
  status?: string;
  description?: string;
}

interface BehavioralProfile {
  user_id: string;
  top_project_types: string[];
  top_cities: string[];
  value_range_min?: number;
  value_range_max?: number;
  win_rate_by_type: Record<string, number>;
  top_companies: string[];
  total_wins: number;
}

function scorePermit(permit: PermitRow, profile: BehavioralProfile): ScoreBreakdown {
  let request_fit = 0;
  const ptLower = (permit.project_type ?? "").toLowerCase();
  const descLower = (permit.description ?? "").toLowerCase();
  if (profile.top_project_types?.length) {
    for (const type of profile.top_project_types) {
      if (ptLower.includes(type.toLowerCase()) || descLower.includes(type.toLowerCase())) {
        const wr = profile.win_rate_by_type?.[type] ?? 0;
        request_fit = Math.min(30, 20 + Math.round(wr * 10));
        break;
      }
    }
    if (!request_fit) request_fit = 8;
  } else {
    request_fit = 15;
  }

  let timing = 0;
  if (permit.issued_date) {
    const daysAgo = Math.floor((Date.now() - new Date(permit.issued_date).getTime()) / 86400000);
    if (daysAgo <= 3) timing = 20;
    else if (daysAgo <= 7) timing = 17;
    else if (daysAgo <= 14) timing = 13;
    else if (daysAgo <= 30) timing = 8;
    else timing = 3;
  } else {
    timing = 5;
  }

  let commercial = 0;
  const v = Number(permit.value ?? 0);
  if (v > 0 && profile.value_range_min && profile.value_range_max) {
    if (v >= profile.value_range_min && v <= profile.value_range_max) commercial = 15;
    else if (v >= profile.value_range_min * 0.5 && v <= profile.value_range_max * 2) commercial = 8;
    else commercial = 3;
  } else if (v > 50_000) {
    commercial = 8;
  } else {
    commercial = 5;
  }

  let relationship = 0;
  const companyName = (permit.builder_company ?? permit.applicant_company ?? "").toLowerCase();
  if (profile.top_companies?.length && companyName) {
    for (const c of profile.top_companies) {
      if (companyName.includes(c.toLowerCase()) || c.toLowerCase().includes(companyName)) {
        relationship = 20;
        break;
      }
    }
  }
  if (!relationship) relationship = 5;

  let confidence = 0;
  if (permit.builder_company) confidence += 3;
  if (permit.builder_phone || permit.builder_email) confidence += 4;
  if (permit.value) confidence += 3;

  const total = request_fit + timing + commercial + relationship + confidence;
  const priority: ScoreBreakdown["priority"] = total >= 70 ? "hot" : total >= 50 ? "warm" : "watch";
  return { total, request_fit, timing, commercial, relationship, confidence, priority };
}

function permitToOpportunity(permit: PermitRow, score: ScoreBreakdown, userId: string): ScoutOpportunity {
  const priority = score.total >= 70 ? "hot" : score.total >= 50 ? "warm" : "watch";
  const id = `scan-${userId.split("@")[0]}-${(permit.address ?? "unknown").replace(/\W+/g, "-").slice(0, 30)}-${permit.issued_date?.slice(0, 10) ?? "nodate"}`;

  const matchReasons = [];
  if (score.request_fit >= 20) matchReasons.push({ label: "Strong type match", detail: `Matches your ${permit.project_type} experience`, type: "trade" as const });
  if (score.timing >= 17) matchReasons.push({ label: "Just issued", detail: "Permit filed in the last 3 days", type: "timing" as const });
  if (score.commercial >= 12) matchReasons.push({ label: "In your value range", detail: `$${(Number(permit.value) / 1000).toFixed(0)}K project`, type: "value" as const });
  if (score.relationship >= 18) matchReasons.push({ label: "Known company", detail: "This builder is in your contact history", type: "relationship" as const });

  const daysAgo = permit.issued_date
    ? Math.floor((Date.now() - new Date(permit.issued_date).getTime()) / 86400000)
    : null;
  const timing = daysAgo !== null ? (daysAgo === 0 ? "just filed" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`) : "recently";

  return {
    id,
    score: score.total,
    priority,
    timing,
    matchReasons,
    suggestedAction: score.relationship >= 18
      ? "Reach out — you know this builder"
      : score.timing >= 17
      ? "Contact now while it's fresh"
      : "Research and reach out this week",
    actionType: permit.builder_phone ? "call" : permit.builder_email ? "email" : "research",
    scoreBreakdown: score,
    primarySource: "permit",
    sourceRecords: [],
    project: {
      id,
      name: permit.project_type ?? "Construction Project",
      address: permit.address ?? "",
      city: permit.city ?? "",
      type: permit.project_type ?? "",
      value: Number(permit.value ?? 0),
      stage: "permitted",
      issuedDate: permit.issued_date ?? "",
      description: permit.description ?? "",
    },
    company: {
      id: `co-${(permit.builder_company ?? "unknown").replace(/\W+/g, "-").slice(0, 20)}`,
      name: permit.builder_company ?? permit.applicant_company ?? "Unknown Builder",
      type: "gc",
      recentProjects: 0,
    },
    relationship: {
      hasWarmPath: score.relationship >= 18,
      strength: score.relationship >= 18 ? "direct" : "none",
      summary: score.relationship >= 18 ? "Known company" : "No warm path detected",
      path: [],
      confidence: score.relationship,
    },
  } as ScoutOpportunity;
}

export async function POST() {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDB();

  // Fetch behavioral profile for this user
  const { data: profile, error: profileErr } = await db
    .from("behavioral_profiles")
    .select("user_id, top_project_types, top_cities, value_range_min, value_range_max, win_rate_by_type, top_companies, total_wins")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({
      found: 0,
      added: 0,
      message: "Set up your profile first so Scout knows what to look for.",
    });
  }

  const cities = (profile.top_cities as string[]) ?? [];
  if (!cities.length) {
    return NextResponse.json({
      found: 0,
      added: 0,
      message: "Add your target cities in profile settings so Scout knows where to search.",
    });
  }

  // Query recent permits for this user's cities (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const cityOr = cities.slice(0, 5).map((c: string) => `city.ilike.${c}`).join(",");
  const { data: permits } = await db
    .from("permits")
    .select("address, city, state, project_type, value, builder_company, builder_phone, builder_email, applicant_company, owner_company, issued_date, status, description")
    .or(cityOr)
    .gte("issued_date", thirtyDaysAgo)
    .order("issued_date", { ascending: false })
    .limit(100);

  if (!permits?.length) {
    return NextResponse.json({
      found: 0,
      added: 0,
      message: `No recent permits found in ${cities.slice(0, 2).join(" or ")}. Check back tomorrow.`,
    });
  }

  // Score and filter
  const scored = permits
    .map((p) => ({ permit: p as PermitRow, score: scorePermit(p as PermitRow, profile as BehavioralProfile) }))
    .filter(({ score }) => score.total >= 40)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 15);

  if (!scored.length) {
    return NextResponse.json({
      found: permits.length,
      added: 0,
      message: `Scanned ${permits.length} recent permits — none strong enough to surface yet.`,
    });
  }

  // Upsert to scout_opportunities
  const upsertRows = scored.map(({ permit, score }) => {
    const opp = permitToOpportunity(permit, score, userId);
    return {
      id: opp.id,
      user_id: userId,
      source: "cron_scan",
      score: score.total,
      priority: opp.priority,
      project_data: opp,
      dismissed: false,
      liked: false,
      contacted: false,
      pipeline_stage: "new",
      updated_at: new Date().toISOString(),
    };
  });

  let added = 0;
  for (let i = 0; i < upsertRows.length; i += 50) {
    const { data } = await db
      .from("scout_opportunities")
      .upsert(upsertRows.slice(i, i + 50), { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    if (data) added += data.length;
  }

  const hot = scored.filter(({ score }) => score.priority === "hot").length;
  const warm = scored.filter(({ score }) => score.priority === "warm").length;

  const summary = [
    hot > 0 ? `${hot} hot` : null,
    warm > 0 ? `${warm} warm` : null,
  ].filter(Boolean).join(", ");

  return NextResponse.json({
    found: permits.length,
    added,
    message: added > 0
      ? `Found ${added} new lead${added !== 1 ? "s" : ""}${summary ? ` (${summary})` : ""} in ${cities.slice(0, 2).join(" & ")}.`
      : `Scanned ${permits.length} permits — your list is already up to date.`,
  });
}
