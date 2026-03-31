import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

function buildSystemPrompt(profile: {
  trades: string[];
  cities: string[];
  projectTypes: string[];
}): string {
  const trades = profile.trades.length ? profile.trades.join(", ") : "general construction services";
  const cities = profile.cities.length ? profile.cities.join(", ") : "your area";
  const types = profile.projectTypes.length ? profile.projectTypes.join(", ") : "all project types";

  return `You are Scout, BuildMapper's construction intelligence AI. You are direct, sharp, and practical — speak like a trusted colleague who knows the construction industry inside out. No corporate language. No fluff.

User profile: sells ${trades} · works in ${cities} · targets ${types} projects.

You have web search and can find:
- Live permit filings in any city or region
- Active construction tenders and procurement postings
- Company news, recent project wins, and key personnel
- Market activity and construction trends for any trade or region
- Subcontractor and supplier relationships

You can also:
- Draft intro emails, follow-up messages, and outreach tailored to specific leads
- Analyze whether a lead is worth pursuing and why
- Identify the best angle for approaching a company or GC
- Map relationship paths between the user and a target company
- Suggest next steps based on project stage and timing

When the user explicitly asks to "find leads", "search for opportunities", "run a scan", "find me work", or similar — use web search to give them real intelligence first, then end your response with this exact string on its own line: __ACTION:run_scout__

Formatting rules:
- Short paragraphs. No bullet points unless the user asks for a list.
- When drafting emails or messages, write them immediately — don't ask for clarification unless a name or company is completely missing.
- When you search the web, weave the results naturally into your answer. Don't just dump links.
- Always tie answers back to the user's trade and location context.`;
}

export async function POST(req: NextRequest) {
  const { message, history = [], userProfile = {} } = await req.json();

  if (!message?.trim()) {
    return new Response("message required", { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("Scout is offline — API key not configured.", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const client = new Anthropic({ apiKey });

  const profile = {
    trades: (userProfile.trades as string[]) ?? [],
    cities: (userProfile.cities as string[]) ?? [],
    projectTypes: (userProfile.projectTypes as string[]) ?? [],
  };

  const messages: Anthropic.MessageParam[] = [
    ...(history as { role: string; content: string }[])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: message.trim() },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tools: any[] = [{ type: "web_search_20250305", name: "web_search" }];

        const messageStream = client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          tools,
          system: buildSystemPrompt(profile),
          messages,
        });

        for await (const event of messageStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      } catch (err) {
        console.error("scout API error:", err);
        controller.enqueue(encoder.encode("Scout ran into an issue. Try again."));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
