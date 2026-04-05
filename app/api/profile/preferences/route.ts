// ── PATCH /api/profile/preferences ────────────────────────────────────────────
// Saves notification preferences (phone, email) to behavioral_profiles.
// Called from the Profile page when user sets their WhatsApp phone.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.email ?? null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    notification_phone?: string | null;
    notification_email?: string | null;
  };

  const update: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (body.notification_phone !== undefined) update.notification_phone = body.notification_phone;
  if (body.notification_email !== undefined) update.notification_email = body.notification_email;

  const { error } = await supabase
    .from("behavioral_profiles")
    .upsert(update, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
