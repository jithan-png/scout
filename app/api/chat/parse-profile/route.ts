import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const KNOWN_TRADES = [
  "Mechanical / HVAC",
  "Electrical",
  "Plumbing",
  "Framing / Structure",
  "Roofing",
  "Concrete / Foundation",
  "Drywall / Insulation",
  "Windows & Doors",
  "Painting & Finishing",
  "Fire Protection",
  "General Contracting",
  "Materials & Supply",
];

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ trades: [], cities: [] });
  }

  const client = new Anthropic({ apiKey });

  const system =
    `You are a profile parser for a construction lead intelligence app. ` +
    `Extract the user's trade/service category and geographic area(s) from their message. ` +
    `Map trades to the closest match from this list (return the exact label): ${JSON.stringify(KNOWN_TRADES)}. ` +
    `If no close match exists, use the user's own words. ` +
    `Cities/regions should be returned as the user wrote them (proper case). ` +
    `Return ONLY valid JSON: {"trades": [...], "cities": [...]}. No explanation.`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system,
      messages: [{ role: "user", content: message.trim() }],
    });

    let raw = (response.content[0] as { type: string; text: string }).text.trim();
    if (raw.startsWith("```")) {
      raw = raw.split("```")[1];
      if (raw.startsWith("json")) raw = raw.slice(4).trim();
    }
    const data = JSON.parse(raw);
    return NextResponse.json({
      trades: data.trades ?? [],
      cities: data.cities ?? [],
    });
  } catch (err) {
    console.warn("parse-profile failed:", err);
    return NextResponse.json({ trades: [], cities: [] });
  }
}
