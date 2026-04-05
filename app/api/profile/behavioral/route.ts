import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { normalizeCompany } from "@/lib/normalize";

async function computeAndSave(userId: string) {
  const { data: opps } = await supabase
    .from("scout_opportunities")
    .select("score, priority, pipeline_stage, project_data, liked, contacted")
    .eq("user_id", userId)
    .eq("dismissed", false);

  if (!opps?.length) return null;

  // ── Count by project type ─────────────────────────────────────────────────
  const typeCounts: Record<string, { total: number; won: number }> = {};
  const cityCounts: Record<string, number> = {};
  const companyCounts: Record<string, number> = {};
  const wonValues: number[] = [];

  for (const row of opps) {
    const d = row.project_data as {
      project?: { type?: string; city?: string; value?: number };
      company?: { name?: string };
      pipeline_stage?: string;
    };
    const type = d?.project?.type ?? "Unknown";
    const city = d?.project?.city ?? "";
    const company = d?.company?.name ?? "";
    const stage = row.pipeline_stage;
    const isWon = stage === "won";
    const isEngaged = stage === "won" || stage === "contacted" || row.liked || row.contacted;

    if (type) {
      typeCounts[type] = typeCounts[type] ?? { total: 0, won: 0 };
      typeCounts[type].total++;
      if (isWon) typeCounts[type].won++;
    }
    if (city && isEngaged) cityCounts[city] = (cityCounts[city] ?? 0) + 1;
    if (company && isEngaged) {
      const norm = normalizeCompany(company);
      companyCounts[norm] = (companyCounts[norm] ?? 0) + 1;
    }
    if (isWon && d?.project?.value) wonValues.push(d.project.value);
  }

  // Win rate by type
  const winRateByType: Record<string, number> = {};
  for (const [type, { total, won }] of Object.entries(typeCounts)) {
    if (total >= 2) winRateByType[type] = Math.round((won / total) * 100) / 100;
  }

  // Top cities/companies by engagement frequency
  const topCities = Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([c]) => c);

  const topProjectTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([t]) => t);

  const wonCount = opps.filter((o) => o.pipeline_stage === "won").length;
  const valueRange = wonValues.length
    ? { min: Math.min(...wonValues), max: Math.max(...wonValues) }
    : { min: null, max: null };

  const profile = {
    user_id: userId,
    top_project_types: topProjectTypes,
    top_cities: topCities,
    value_range_min: valueRange.min,
    value_range_max: valueRange.max,
    win_rate_by_type: winRateByType,
    top_companies: topCompanies,
    total_wins: wonCount,
    total_opportunities: opps.length,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("behavioral_profiles").upsert(profile, { onConflict: "user_id" });
  return profile;
}

// ── GET /api/profile/behavioral ──────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) return NextResponse.json(null);

  const { data } = await supabase
    .from("behavioral_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  return NextResponse.json(data ?? null);
}

// ── POST /api/profile/behavioral ─────────────────────────────────────────────
// Recompute profile from current opportunity history.
// Called after won/lost outcomes or from internal trigger (x-internal header).
export async function POST(req: NextRequest) {
  // Allow internal calls (from PATCH handler) or authenticated users
  const isInternal = req.headers.get("x-internal") === "1";
  let userId: string | null = null;

  if (isInternal) {
    const body = await req.json().catch(() => ({}));
    userId = body.user_id ?? null;
  } else {
    const session = await auth();
    userId = session?.user?.email ?? null;
  }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await computeAndSave(userId);
  return NextResponse.json(profile ?? { ok: true, message: "No data yet" });
}
