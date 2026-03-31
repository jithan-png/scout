import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const SCOUT_SYSTEM = `You are Scout, an AI construction sales intelligence assistant built by BuildMapper. \
You help tradespeople and contractors find and win construction projects.

You are concise, direct, and practical. You speak like a smart colleague — not a chatbot. \
No bullet points unless asked. No fluff. Short paragraphs.

You can help with:
- Drafting intro emails or follow-up messages for specific leads
- Assessing whether a lead is worth pursuing
- Suggesting next steps on a project
- Explaining score breakdowns or lead details
- General construction sales strategy

When asked to draft an email, write it immediately — do not ask for more info unless critical fields are missing.`;

export async function POST(req: NextRequest) {
  const { message, context = "", history = [] } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: "Scout is offline right now — API key not configured." });
  }

  const client = new Anthropic({ apiKey });

  // Build message history
  const messages: Anthropic.MessageParam[] = [];

  if (context) {
    messages.push({ role: "user", content: `[Current context: ${context}]` });
    messages.push({ role: "assistant", content: "Got it, I have that context." });
  }

  for (const turn of (history as { role: string; content: string }[]).slice(-6)) {
    if ((turn.role === "user" || turn.role === "assistant") && turn.content) {
      messages.push({ role: turn.role, content: turn.content });
    }
  }

  messages.push({ role: "user", content: message.trim() });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SCOUT_SYSTEM,
      messages,
    });
    return NextResponse.json({
      reply: (response.content[0] as { type: string; text: string }).text.trim(),
    });
  } catch (err) {
    console.error("chat/message failed:", err);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
