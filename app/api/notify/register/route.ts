import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 7) return `+${digits}`;
  return null;
}

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const e164 = toE164(String(phone));
  if (!e164) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.warn("Twilio env vars not set — skipping SMS");
    return NextResponse.json({ status: "skipped", phone: e164 });
  }

  try {
    const client = twilio(sid, token);
    await client.messages.create({
      body: "👋 Scout here — I'm scanning permits and live construction activity in your area. You'll get your first leads shortly.",
      from,
      to: e164,
    });
    return NextResponse.json({ status: "sent", phone: e164 });
  } catch (err) {
    console.error("Twilio SMS failed:", err);
    return NextResponse.json({ status: "failed", error: String(err) }, { status: 500 });
  }
}
