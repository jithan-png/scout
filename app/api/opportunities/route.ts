import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import type { ScoutOpportunity } from "@/lib/types";

// ── GET /api/opportunities ────────────────────────────────────────────────────
// Returns all non-dismissed opportunities for the current user, sorted by score.

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  if (!userId) return NextResponse.json([], { status: 200 });

  const showDismissed = req.nextUrl.searchParams.get("dismissed") === "true";

  let q = supabase
    .from("scout_opportunities")
    .select("*")
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (!showDismissed) q = q.eq("dismissed", false);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Unwrap project_data → ScoutOpportunity, merge in live flags
  const opps = (data ?? []).map((row) => ({
    ...(row.project_data as ScoutOpportunity),
    id: row.id,
    score: row.score,
    priority: row.priority,
    _pipeline_stage: row.pipeline_stage,
    _dismissed: row.dismissed,
    _liked: row.liked,
    _contacted: row.contacted,
    _source: row.source,
  }));

  return NextResponse.json(opps);
}

// ── POST /api/opportunities ───────────────────────────────────────────────────
// Upsert a Scout-found opportunity. Called from PermitTablePanel when user
// clicks "Add to pipeline" and from the cron background scanner.

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const opp = body as ScoutOpportunity & { source?: string };

  if (!opp?.id) return NextResponse.json({ error: "Missing opportunity id" }, { status: 400 });

  const { error } = await supabase.from("scout_opportunities").upsert(
    {
      id: opp.id,
      user_id: userId,
      source: opp.source ?? opp.primarySource ?? "permit",
      score: opp.score ?? 0,
      priority: opp.priority ?? "watch",
      project_data: opp,
      relationship_data: opp.relationship ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
