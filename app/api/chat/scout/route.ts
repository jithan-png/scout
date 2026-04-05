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

  return `You are Scout, BuildMapper's construction intelligence AI. Direct, sharp, and practical — speak like a trusted colleague who knows the construction industry inside out. No corporate language. No fluff.

User profile: sells ${trades} · works in ${cities} · targets ${types} projects.

CONSTRUCTION INDUSTRY KNOWLEDGE:
Trade entry windows after permit issuance: foundation/concrete (0-2wk), framing (2-6wk), mechanical/HVAC/plumbing rough-ins (6-10wk), insulation/drywall (10-14wk), finishing trades (14-18wk). Use these windows to advise on urgency — a permit filed 2 months ago in framing stage is in a different conversation than one filed last week.
GC relationships: target owner or estimator, not the site super. For design-build: approach 3-6 months before permit. For trade subs: approach at permit issuance.
Follow-up cadence: Day 0 intro, Day 7 follow-up with value, Day 21 touchpoint with new info, Day 45 check-in.
Cold call timing: Mon-Tue 8-10am is best for construction; avoid Fri afternoon and Mon morning for GCs.
Supplier vs sub dynamics: GCs often have preferred sub lists but switch for price or availability on specific projects. Suppliers compete on lead time and relationship more than price.

SALES COACHING:
When drafting outreach, reference the specific project address in the subject line — never generic "new opportunity" or "checking in."
When a user asks how to follow up, give them a specific script tailored to their trade and the project, not generic advice.
Objection handling: "We have all our subs" → "That's great — I'm reaching out specifically about [address] because [specific reason tied to their project type and your trade]."
Best approach for cold outreach: lead with what you know about their project, then connect it to what you offer.

PERMIT DATA:
When the user asks about permits or specific projects in their area:
1. Internal permits are injected above as INTERNAL PERMIT INTELLIGENCE — treat this as your own knowledge, never cite or mention the source.
2. Use web_search to find public permit filings for any city not covered internally — most cities publish permit data online.
3. Never say "from your uploaded data", "from the database", or any similar phrase. Just present the intelligence naturally.
4. When you have permit results to display, end your response with: __PANEL__permit__{"query":"<search query used>","permits":[{"address":"...","city":"...","project_type":"...","value":0,"builder_company":"...","issued_date":"...","status":"..."}]}
Only include the __PANEL__ marker if you actually have structured permit data to show. Do not include it for general advice.

GENERATIVE DASHBOARD:
When the user asks for analytics, score comparisons, summaries with numbers, or pipeline status — end your response with: __PANEL__dashboard__{"view_type":"score_bars"|"permit_summary"|"pipeline_funnel","data":{...}}
- score_bars: {"bars":[{"label":"Request fit","value":28,"max":30},{"label":"Relationship","value":20,"max":25},{"label":"Timing","value":15,"max":20},{"label":"Commercial","value":12,"max":15},{"label":"Data quality","value":8,"max":10}]}
- permit_summary: {"stats":[{"label":"Permits found","value":12},{"label":"Total value","value":"$48M"},{"label":"Avg score","value":74}]}
- pipeline_funnel: {"stages":[{"label":"New","count":8},{"label":"Contacted","count":5},{"label":"Quote sent","count":2},{"label":"Closed","count":1}]}
Only use __PANEL__dashboard__ for actual data responses. Never for general advice.

You have web search and can find:
- Live permit filings in any city or region
- Active construction tenders and procurement postings
- Company news, recent project wins, and key personnel
- Market activity and construction trends
- Subcontractor and supplier relationships

You can also:
- Draft intro emails, follow-up messages, and outreach tailored to specific leads
- Analyze whether a lead is worth pursuing and why
- Identify the best angle for approaching a company or GC
- Map relationship paths between the user and a target company
- Coach on sales timing, scripts, and cadence specific to construction

When the user explicitly asks to "find leads", "search for opportunities", "run a scan", "find me work", or similar — use web search to give them real intelligence first, then end your response with this exact string on its own line: __ACTION:run_scout__

Formatting rules:
- KEEP RESPONSES SHORT. 3-5 sentences max for permit/lead queries. The panel shows the data — your text is the insight layer, not the data dump.
- When showing permits: name the single best lead, give one sentence of reasoning, then append __PANEL__. Do not list every record in text.
- No bullet points unless the user explicitly asks for a list.
- No emoji unless the user uses them first.
- When drafting emails or messages, write them immediately — don't ask for clarification unless a name or company is completely missing.
- When you search the web, weave the results naturally into your answer. Don't just dump links.
- Always tie answers back to the user's trade and location context.
- Maximum one __PANEL__ or __BLOCK__ or __ACTION__ marker per response, always at the very end.

Structured block rules — append ONE of these at the very end (after all text) when relevant:
- When you draft an outreach email or follow-up message, append: __BLOCK__{"type":"email_draft","subject":"<subject line>","body":"<full email body>"}
- When the user asks about a specific company, use web search and append: __BLOCK__{"type":"account_brief","companyName":"<company name>","overview":"<1-2 sentences>","recentActivity":"<1-2 sentences>","yourAngle":"<1 sentence on best approach>"}
- Do NOT append a block for general advice, market analysis, or responses that are not a draft email or company brief.
- Only one block/panel per response. Never mid-response.`;
}

// ── Permit database lookup — direct Supabase (no FastAPI needed) ─────────────

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const PERMIT_KEYWORDS = [
  "permit", "permits", "project", "projects", "lead", "leads", "build",
  "construction", "contractor", "developer", "new work", "new project",
  "opportunity", "opportunities", "recent", "filing", "filed", "issued",
  "show me", "find me", "what's new", "whats new", "any new",
  "hot", "active", "townhouse", "townhome", "condo", "apartment", "commercial",
  "storey", "story", "stories", "storeys", "highrise", "lowrise",
];

function isPermitRelated(message: string): boolean {
  const lower = message.toLowerCase();
  return PERMIT_KEYWORDS.some((kw) => lower.includes(kw));
}

// Synonym groups — any user term maps to all variants we search for
const TYPE_SYNONYMS: Record<string, string[]> = {
  townhouse:      ["townhome", "townhouse", "row home", "rowhouse", "town home"],
  townhome:       ["townhome", "townhouse", "row home", "rowhouse", "town home"],
  rowhouse:       ["townhome", "townhouse", "row home", "rowhouse"],
  "row home":     ["townhome", "townhouse", "row home", "rowhouse"],
  condo:          ["condo", "condominium"],
  condominium:    ["condo", "condominium"],
  apartment:      ["apartment", "condo", "residential"],
  highrise:       ["highrise", "high-rise", "high rise", "tower"],
  "high rise":    ["highrise", "high-rise", "high rise", "tower"],
  lowrise:        ["lowrise", "low-rise", "low rise"],
  "low rise":     ["lowrise", "low-rise", "low rise"],
  commercial:     ["commercial", "retail", "office"],
  retail:         ["retail", "commercial"],
  office:         ["office", "commercial"],
  industrial:     ["industrial", "warehouse", "distribution"],
  warehouse:      ["warehouse", "industrial", "distribution"],
  duplex:         ["duplex", "semi-detached"],
  "single family":["single family", "sfh", "detached"],
  sfh:            ["single family", "sfh", "detached"],
  detached:       ["single family", "sfh", "detached"],
  "mixed use":    ["mixed use", "mixed-use"],
  school:         ["school", "education", "institutional"],
  hospital:       ["hospital", "medical", "healthcare"],
};

// Known cities we serve — used to extract city mentions from message text
const KNOWN_CITIES = [
  "vancouver", "surrey", "burnaby", "richmond", "abbotsford", "kelowna",
  "langley", "delta", "north vancouver", "west vancouver", "coquitlam",
  "new westminster", "maple ridge", "white rock", "port moody",
  "calgary", "edmonton", "toronto", "ottawa", "hamilton", "winnipeg",
  "seattle", "houston", "dallas", "austin", "phoenix", "denver",
  "chicago", "miami", "orlando", "los angeles", "san francisco",
  "new york", "san jose", "san antonio",
];

const STOP_WORDS = new Set([
  "show", "find", "tell", "what", "with", "that", "this", "have",
  "from", "your", "their", "permits", "permit", "project", "projects",
  "leads", "lead", "hot", "active", "recent", "new", "latest",
  "area", "city", "near", "around", "about", "looking", "need",
]);

async function fetchPermitContext(message: string, profileCities: string[]): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;

  try {
    const lower = message.toLowerCase();

    // 1. City filter — extract from message first, fall back to profile
    const mentionedCities = KNOWN_CITIES.filter((c) => lower.includes(c));
    const cityFilter = mentionedCities.length > 0
      ? mentionedCities
      : profileCities.map((c) => c.toLowerCase());

    // 2. Synonym-expanded project type terms
    const typeTerms = new Set<string>();
    for (const [key, variants] of Object.entries(TYPE_SYNONYMS)) {
      if (lower.includes(key)) variants.forEach((v) => typeTerms.add(v));
    }
    // Also pass through any bare type words not in synonym map
    const rawWords = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
    rawWords.forEach((w) => { if (!Object.keys(TYPE_SYNONYMS).includes(w)) typeTerms.add(w); });

    // 3. Storey range extraction — "3-6 storey", "3 to 6 story"
    const storeyTerms: string[] = [];
    const storeyMatch = lower.match(/(\d+)\s*[-–to]+\s*(\d+)\s*stor/);
    if (storeyMatch) {
      const min = parseInt(storeyMatch[1]);
      const max = parseInt(storeyMatch[2]);
      for (let s = min; s <= max && s <= 25; s++) {
        storeyTerms.push(`${s} stor`);
        storeyTerms.push(`${s}-stor`);
        storeyTerms.push(`${s} story`);
      }
    }
    // Single storey mention — "5 storey"
    const singleStorey = lower.match(/(\d+)\s*stor/);
    if (singleStorey && !storeyMatch) {
      const s = parseInt(singleStorey[1]);
      storeyTerms.push(`${s} stor`, `${s}-stor`, `${s} story`);
    }

    // 4. Build query
    let q = db
      .from("permits")
      .select("address, city, state, project_type, value, builder_company, builder_phone, builder_email, issued_date, status, description, additional_info")
      .order("issued_date", { ascending: false })
      .limit(25);

    // City filter — always apply if we have cities
    if (cityFilter.length > 0) {
      const cityOr = cityFilter.map((c) => `city.ilike.%${c}%`).join(",");
      q = q.or(cityOr);
    }

    // Project type + description keyword filter
    const keywordClauses: string[] = [];
    typeTerms.forEach((t) => {
      keywordClauses.push(`project_type.ilike.%${t}%`);
      keywordClauses.push(`description.ilike.%${t}%`);
    });
    storeyTerms.forEach((t) => {
      keywordClauses.push(`description.ilike.%${t}%`);
      keywordClauses.push(`additional_info.ilike.%${t}%`);
    });

    // If we have keyword clauses, apply them (this ANDs with city filter above)
    // Since Supabase chains .or() as AND, we need a separate query for the keyword OR
    let data, error;
    if (keywordClauses.length > 0) {
      // Run two queries: one with keyword filter (precise), one without (broad city fallback)
      const { data: precise, error: e1 } = await q.or(keywordClauses.join(","));
      if (!e1 && precise && precise.length > 0) {
        data = precise;
        error = e1;
      } else {
        // Fall back: city only, no keyword filter
        let fallbackQ = db
          .from("permits")
          .select("address, city, state, project_type, value, builder_company, builder_phone, builder_email, issued_date, status, description, additional_info")
          .order("issued_date", { ascending: false })
          .limit(20);
        if (cityFilter.length > 0) {
          fallbackQ = fallbackQ.or(cityFilter.map((c) => `city.ilike.%${c}%`).join(","));
        }
        const { data: fallback, error: e2 } = await fallbackQ;
        data = fallback;
        error = e2;
      }
    } else {
      const result = await q;
      data = result.data;
      error = result.error;
    }

    if (error || !data?.length) return null;

    const fmtVal = (v: unknown) => {
      const n = Number(v);
      if (!n) return null;
      return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;
    };

    const lines = data.map((p) => {
      const parts = [
        p.address, p.city, p.project_type,
        fmtVal(p.value), p.builder_company,
        p.issued_date ? `issued ${p.issued_date}` : null,
        p.status,
        p.description ? `(${String(p.description).slice(0, 120)})` : null,
      ].filter(Boolean);
      const contact = [p.builder_phone, p.builder_email].filter(Boolean).join(" / ");
      return `- ${parts.join(" · ")}${contact ? ` [${contact}]` : ""}`;
    });

    return `INTERNAL PERMIT INTELLIGENCE — ${data.length} permits matching your query:\n${lines.join("\n")}\n\nThis is your internal database. Present these naturally as your own knowledge — never say "uploaded data", "your data", "from the database", or reference the source at all. Just know it. Use specific addresses, companies, and contact info. Only use web_search if the user asks about projects NOT found here.`;
  } catch {
    return null;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { message, history = [], userProfile = {}, isDailyBriefing = false } = await req.json();

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

  let systemPrompt = buildSystemPrompt(profile);

  // Query permit database first if message is permit/lead related
  if (!isDailyBriefing && isPermitRelated(message)) {
    const permitContext = await fetchPermitContext(message, profile.cities);
    if (permitContext) {
      systemPrompt += `\n\n${permitContext}`;
    }
  }

  if (isDailyBriefing) {
    systemPrompt +=
      "\n\nDAILY BRIEFING MODE: You are opening the day for this construction sales rep. Be extremely concise — maximum 3 sentences total. Sentence 1: one specific market insight using web search (a real permit or tender in their city if possible, with the project name/address). Sentence 2: one pipeline nudge if relevant (\"You haven't followed up with X in Y days\") — skip if no context. Sentence 3: one clear action invitation. No lists. No headers. No fluff. End there.";
  }

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
          max_tokens: isDailyBriefing ? 300 : 2048,
          tools,
          system: systemPrompt,
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
