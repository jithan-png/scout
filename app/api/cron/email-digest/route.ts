// ── Vercel Cron — Weekly Email Digest ─────────────────────────────────────────
// Runs Monday at 8am PT. Sends top 5 opportunities from the past week.
// Uses Resend (free tier: 3k emails/month). Set RESEND_API_KEY in Vercel env.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

function getDB() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function fmtValue(v: unknown): string {
  const n = Number(v ?? 0);
  if (!n) return "Value TBD";
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;
}

function buildEmailHtml(opps: Array<{
  score: number;
  priority: string;
  project_data: { project?: { address?: string; city?: string; type?: string; value?: number; issuedDate?: string }; company?: { name?: string }; suggestedAction?: string };
}>): string {
  const items = opps.slice(0, 5).map((o) => {
    const p = o.project_data?.project ?? {};
    const c = o.project_data?.company ?? {};
    const color = o.priority === "hot" ? "#EF4444" : o.priority === "warm" ? "#F59E0B" : "#52525B";
    return `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #27272A;vertical-align:top;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="background:${color}22;color:${color};font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.05em;">${o.priority}</span>
            <span style="color:#71717A;font-size:11px;">${o.score}/100</span>
          </div>
          <div style="font-size:14px;font-weight:600;color:#F4F4F5;margin-bottom:3px;">${p.address ?? "Unknown address"}</div>
          <div style="font-size:12px;color:#A1A1AA;margin-bottom:3px;">${p.city ?? ""} · ${p.type ?? ""} · ${fmtValue(p.value)}</div>
          <div style="font-size:12px;color:#71717A;">${c.name ?? "Unknown builder"}</div>
          ${o.project_data?.suggestedAction ? `<div style="font-size:12px;color:#00C875;margin-top:6px;">→ ${o.project_data.suggestedAction}</div>` : ""}
        </td>
      </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#09090B;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <tr>
      <td style="padding-bottom:24px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <span style="font-size:20px;font-weight:800;color:#F4F4F5;letter-spacing:-0.03em;">Scout</span>
          <span style="width:8px;height:8px;border-radius:50%;background:#00C875;display:inline-block;box-shadow:0 0 6px rgba(0,200,117,0.6);"></span>
        </div>
        <div style="font-size:13px;color:#52525B;">Your weekly construction intelligence digest</div>
      </td>
    </tr>

    <!-- Intro -->
    <tr>
      <td style="padding-bottom:16px;">
        <div style="background:#1C1C22;border:1px solid rgba(0,200,117,0.15);border-radius:16px;padding:16px 20px;">
          <div style="font-size:14px;font-weight:600;color:#34D399;margin-bottom:4px;">
            ${opps.length} new lead${opps.length !== 1 ? "s" : ""} this week
          </div>
          <div style="font-size:13px;color:#71717A;">Here are the top opportunities Scout found while you were away.</div>
        </div>
      </td>
    </tr>

    <!-- Opportunities -->
    <tr>
      <td>
        <div style="background:#1C1C22;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${items}
          </table>
        </div>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding-top:20px;text-align:center;">
        <a href="${process.env.NEXTAUTH_URL ?? "https://scout.buildmapper.ca"}/opportunities"
           style="display:inline-block;background:linear-gradient(135deg,#00C875 0%,#00A65F 100%);color:#fff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:14px;text-decoration:none;letter-spacing:-0.01em;">
          Review in BuildMapper →
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding-top:24px;text-align:center;">
        <div style="font-size:11px;color:#3F3F46;">BuildMapper · You're receiving this because Scout is active on your account.</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ ok: true, message: "RESEND_API_KEY not configured — skipping email digest" });
  }

  const db = getDB();
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  // Get all users with notification_email set
  const { data: profiles } = await db
    .from("behavioral_profiles")
    .select("user_id, notification_email")
    .not("notification_email", "is", null)
    .gt("updated_at", new Date(Date.now() - 30 * 86400000).toISOString());

  if (!profiles?.length) {
    return NextResponse.json({ ok: true, message: "No users with email notifications" });
  }

  let sent = 0;

  for (const profile of profiles) {
    if (!profile.notification_email) continue;

    // Get their top opportunities from the past week
    const { data: opps } = await db
      .from("scout_opportunities")
      .select("score, priority, project_data")
      .eq("user_id", profile.user_id)
      .eq("dismissed", false)
      .gte("created_at", oneWeekAgo)
      .order("score", { ascending: false })
      .limit(5);

    if (!opps?.length) continue;

    const html = buildEmailHtml(opps as Parameters<typeof buildEmailHtml>[0]);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Scout <scout@buildmapper.ca>",
          to: profile.notification_email,
          subject: `Scout found ${opps.length} new lead${opps.length !== 1 ? "s" : ""} this week`,
          html,
        }),
      });
      if (res.ok) sent++;
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ ok: true, sent, total: profiles.length });
}
