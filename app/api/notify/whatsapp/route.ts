// ── POST /api/notify/whatsapp ──────────────────────────────────────────────────
// Sends a notification via Twilio. Attempts WhatsApp first (if sandbox configured),
// falls back to SMS. Called internally by the cron scanner and profile setup.

import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 7) return `+${digits}`;
  return null;
}

function isInternal(req: NextRequest): boolean {
  return req.headers.get("x-internal") === "1";
}

export async function POST(req: NextRequest) {
  if (!isInternal(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phone, message } = await req.json();
  if (!phone || !message) {
    return NextResponse.json({ error: "phone and message required" }, { status: 400 });
  }

  const e164 = toE164(String(phone));
  if (!e164) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromSMS = process.env.TWILIO_PHONE_NUMBER;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER; // optional: "whatsapp:+14155238886"

  if (!sid || !token || !fromSMS) {
    console.warn("[notify/whatsapp] Twilio env vars not set — skipping");
    return NextResponse.json({ status: "skipped" });
  }

  const client = twilio(sid, token);

  // Try WhatsApp first if a WhatsApp sender is configured
  if (fromWhatsApp) {
    try {
      await client.messages.create({
        body: message,
        from: fromWhatsApp.startsWith("whatsapp:") ? fromWhatsApp : `whatsapp:${fromWhatsApp}`,
        to: `whatsapp:${e164}`,
      });
      return NextResponse.json({ status: "sent", channel: "whatsapp", phone: e164 });
    } catch (err) {
      console.warn("[notify/whatsapp] WhatsApp failed, falling back to SMS:", err);
    }
  }

  // Fallback: regular SMS
  try {
    await client.messages.create({ body: message, from: fromSMS, to: e164 });
    return NextResponse.json({ status: "sent", channel: "sms", phone: e164 });
  } catch (err) {
    console.error("[notify/whatsapp] SMS also failed:", err);
    return NextResponse.json({ status: "failed", error: String(err) }, { status: 500 });
  }
}
