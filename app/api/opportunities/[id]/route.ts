import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// ── PATCH /api/opportunities/[id] ────────────────────────────────────────────
// Update flags: dismissed, liked, contacted, pipeline_stage

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    dismissed?: boolean;
    liked?: boolean;
    contacted?: boolean;
    pipeline_stage?: string;
  };

  const allowed = ["dismissed", "liked", "contacted", "pipeline_stage"] as const;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const { error } = await supabase
    .from("scout_opportunities")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId); // security: only update own rows

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trigger behavioral profile recompute in background (fire and forget)
  if (body.pipeline_stage === "won" || body.pipeline_stage === "lost") {
    fetch(`${process.env.NEXTAUTH_URL}/api/profile/behavioral`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal": "1" },
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => {}); // non-blocking
  }

  return NextResponse.json({ ok: true });
}
