// GET  /api/profile/setup — fetch saved setup preferences from Supabase
// POST /api/profile/setup — save setup preferences to Supabase on completion

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

function getDB() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.SUPABASE_URL) {
    return NextResponse.json({ setup_completed: false });
  }

  const { data, error } = await getDB()
    .from("behavioral_profiles")
    .select("user_trades, user_cities, user_project_types, setup_completed")
    .eq("user_id", userId)
    .single();

  if (error || !data) return NextResponse.json({ setup_completed: false });

  return NextResponse.json({
    setup_completed: data.setup_completed ?? false,
    user_trades: data.user_trades ?? [],
    user_cities: data.user_cities ?? [],
    user_project_types: data.user_project_types ?? [],
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.SUPABASE_URL) {
    return NextResponse.json({ ok: true }); // no-op if Supabase not configured
  }

  const { trades = [], cities = [], projectTypes = [] } = await req.json();

  const { error } = await getDB()
    .from("behavioral_profiles")
    .upsert(
      {
        user_id: userId,
        user_trades: trades,
        user_cities: cities,
        user_project_types: projectTypes,
        setup_completed: true,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[profile/setup] upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
