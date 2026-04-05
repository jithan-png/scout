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
  "plex", "unit", "duplex", "triplex", "fourplex", "sixplex", "multiplex",
];

function isPermitRelated(message: string): boolean {
  const lower = message.toLowerCase();
  return PERMIT_KEYWORDS.some((kw) => lower.includes(kw));
}

// ── Semantic search dictionaries ─────────────────────────────────────────────

// Maps unit count → all written-form variants
const UNIT_NAMES: Record<number, string[]> = {
  2:  ["two", "dual", "double"],
  3:  ["three", "tri"],
  4:  ["four", "quad", "quadru"],
  5:  ["five"],
  6:  ["six"],
  7:  ["seven"],
  8:  ["eight"],
  9:  ["nine"],
  10: ["ten"],
  12: ["twelve"],
};

// Named plex terms → count (check these before numeric match)
const NAMED_PLEX: [RegExp, number][] = [
  [/\bduplex\b/,       2], [/\btwo[- ]?plex\b/,     2], [/\b2[- ]?plex\b/,    2],
  [/\btriplex\b/,      3], [/\btri[- ]?plex\b/,      3], [/\b3[- ]?plex\b/,    3], [/\bthree[- ]?plex\b/, 3],
  [/\bfourplex\b/,     4], [/\bfour[- ]?plex\b/,     4], [/\b4[- ]?plex\b/,    4], [/\bquadruplex\b/,    4], [/\bquad[- ]?plex\b/, 4],
  [/\bfiveplex\b/,     5], [/\bfive[- ]?plex\b/,     5], [/\b5[- ]?plex\b/,    5],
  [/\bsixplex\b/,      6], [/\bsix[- ]?plex\b/,      6], [/\b6[- ]?plex\b/,    6],
  [/\bsevenplex\b/,    7], [/\bseven[- ]?plex\b/,    7], [/\b7[- ]?plex\b/,    7],
  [/\beightplex\b/,    8], [/\beight[- ]?plex\b/,    8], [/\b8[- ]?plex\b/,    8],
  [/\bmultiplex\b/,    4], // generic — search 4+
];

// Given a unit count, produce every synonym we should search for
function expandUnitCount(count: number): string[] {
  const terms: Set<string> = new Set([
    `${count} unit`, `${count}-unit`, `${count}unit`,
    `${count} plex`, `${count}-plex`, `${count}plex`,
    `${count} suite`, `${count}-suite`,
  ]);
  for (const name of (UNIT_NAMES[count] ?? [])) {
    terms.add(`${name}plex`);
    terms.add(`${name}-plex`);
    terms.add(`${name} plex`);
    terms.add(`${name} unit`);
  }
  return [...terms];
}

// Project type synonym groups (trigger word → all search variants)
const TYPE_SYNONYMS: Record<string, string[]> = {
  // Townhouse cluster
  "townhouse":       ["townhome", "townhouse", "row home", "rowhouse", "town home", "stacked townhouse"],
  "townhome":        ["townhome", "townhouse", "row home", "rowhouse", "town home", "stacked townhouse"],
  "rowhouse":        ["townhome", "townhouse", "row home", "rowhouse"],
  "row home":        ["townhome", "townhouse", "row home", "rowhouse"],
  "stacked":         ["stacked townhouse", "stacked townhome", "stacked"],
  // Condo / apartment / strata
  "condo":           ["condo", "condominium", "strata"],
  "condominium":     ["condo", "condominium", "strata"],
  "strata":          ["condo", "condominium", "strata"],
  "apartment":       ["apartment", "multi-family", "multifamily", "rental", "residential"],
  "rental":          ["rental", "purpose built rental", "pbr", "apartment", "multi-family"],
  "multi-family":    ["multi-family", "multifamily", "apartment", "residential"],
  "multifamily":     ["multi-family", "multifamily", "apartment", "residential"],
  // Height descriptors
  "highrise":        ["highrise", "high-rise", "high rise", "tower", "high-rise residential"],
  "high rise":       ["highrise", "high-rise", "high rise", "tower"],
  "lowrise":         ["lowrise", "low-rise", "low rise", "garden", "walkup", "walk-up"],
  "low rise":        ["lowrise", "low-rise", "low rise", "walkup"],
  "midrise":         ["midrise", "mid-rise", "mid rise"],
  "mid rise":        ["midrise", "mid-rise", "mid rise"],
  "tower":           ["tower", "highrise", "high-rise"],
  // Commercial
  "commercial":      ["commercial", "retail", "office", "business"],
  "retail":          ["retail", "commercial", "storefront", "strip mall"],
  "office":          ["office", "commercial", "professional", "business park"],
  // Industrial
  "industrial":      ["industrial", "warehouse", "distribution", "light industrial", "manufacturing"],
  "warehouse":       ["warehouse", "industrial", "distribution", "storage", "logistics"],
  "distribution":    ["distribution", "warehouse", "industrial", "logistics", "fulfillment"],
  "manufacturing":   ["manufacturing", "industrial", "production", "fabrication"],
  // Single family
  "single family":   ["single family", "sfh", "detached", "house", "single detached"],
  "sfh":             ["single family", "sfh", "detached", "house"],
  "detached":        ["single family", "sfh", "detached", "house", "single detached"],
  "house":           ["house", "single family", "detached", "sfh", "single detached"],
  // Duplex (type synonym — unit count handled separately)
  "duplex":          ["duplex", "semi-detached", "two-family", "2-unit"],
  "semi-detached":   ["semi-detached", "duplex", "two-family"],
  // Mixed use
  "mixed use":       ["mixed use", "mixed-use", "live work", "live-work"],
  "mixed-use":       ["mixed use", "mixed-use", "live work"],
  // Laneway / ADU
  "laneway":         ["laneway", "laneway house", "coach house", "carriage house", "garden suite", "adu"],
  "garden suite":    ["garden suite", "laneway", "accessory dwelling", "adu", "secondary suite"],
  "secondary suite": ["secondary suite", "basement suite", "in-law suite", "accessory dwelling"],
  "adu":             ["adu", "accessory dwelling", "garden suite", "laneway", "secondary suite"],
  // Institutional
  "school":          ["school", "education", "educational", "institutional", "learning centre"],
  "hospital":        ["hospital", "medical", "healthcare", "clinic", "health centre"],
  "hotel":           ["hotel", "motel", "hospitality", "accommodation"],
  // Other
  "seniors":         ["seniors", "assisted living", "care home", "retirement", "supportive housing"],
  "affordable":      ["affordable", "social housing", "below market", "non-market"],
};

// Known cities — multi-word entries FIRST to prevent partial matches
const KNOWN_CITIES = [
  "north vancouver", "west vancouver", "new westminster", "port moody", "port coquitlam",
  "maple ridge", "white rock", "pitt meadows", "fort langley",
  "vancouver", "surrey", "burnaby", "richmond", "abbotsford", "kelowna",
  "langley", "delta", "coquitlam", "chilliwack", "mission", "hope",
  "calgary", "edmonton", "toronto", "ottawa", "hamilton", "winnipeg",
  "victoria", "nanaimo", "kamloops", "prince george",
  "seattle", "houston", "dallas", "austin", "phoenix", "denver",
  "chicago", "miami", "orlando", "los angeles", "san francisco",
  "new york", "san jose", "san antonio",
];

// Capitalize a city string to match typical DB casing
function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function fetchPermitContext(message: string, profileCities: string[]): Promise<{ text: string; companies: string[] } | null> {
  const db = getSupabase();
  if (!db) return null;

  try {
    const lower = message.toLowerCase();

    // ── 1. City: extract from message (exact), fall back to profile ──────────
    // Check multi-word cities first to avoid "vancouver" matching "north vancouver"
    const mentionedCities: string[] = [];
    for (const city of KNOWN_CITIES) {
      if (lower.includes(city) && !mentionedCities.some((c) => c.includes(city))) {
        mentionedCities.push(toTitleCase(city));
      }
    }
    const cityFilter = mentionedCities.length > 0 ? mentionedCities : profileCities;

    // ── 2. Unit count expansion ───────────────────────────────────────────────
    const unitTerms: string[] = [];
    // Named plex (regex-based, most specific)
    for (const [rx, count] of NAMED_PLEX) {
      if (rx.test(lower)) { unitTerms.push(...expandUnitCount(count)); break; }
    }
    // Numeric "N unit" / "N plex" / "N-plex" not caught above
    if (unitTerms.length === 0) {
      const numMatch = lower.match(/\b(\d+)\s*[-]?\s*(unit|plex|suite)s?\b/);
      if (numMatch) unitTerms.push(...expandUnitCount(parseInt(numMatch[1])));
    }
    // Range: "3 to 6 unit" → expand all counts in range
    const unitRangeMatch = lower.match(/\b(\d+)\s*[-–to]+\s*(\d+)\s*(unit|plex|suite)/);
    if (unitRangeMatch) {
      const min = parseInt(unitRangeMatch[1]);
      const max = parseInt(unitRangeMatch[2]);
      for (let n = min; n <= max && n <= 20; n++) unitTerms.push(...expandUnitCount(n));
    }

    // ── 3. Project type synonyms ──────────────────────────────────────────────
    const typeTerms = new Set<string>();
    for (const [key, variants] of Object.entries(TYPE_SYNONYMS)) {
      if (lower.includes(key)) variants.forEach((v) => typeTerms.add(v));
    }

    // ── 4. Storey range ───────────────────────────────────────────────────────
    const storeyTerms: string[] = [];
    const storeyRange = lower.match(/\b(\d+)\s*[-–to]+\s*(\d+)\s*stor/);
    if (storeyRange) {
      for (let s = parseInt(storeyRange[1]); s <= parseInt(storeyRange[2]) && s <= 30; s++) {
        storeyTerms.push(`${s} stor`, `${s}-stor`, `${s} story`);
      }
    } else {
      const singleSt = lower.match(/\b(\d+)\s*[-]?\s*stor/);
      if (singleSt) {
        const s = parseInt(singleSt[1]);
        storeyTerms.push(`${s} stor`, `${s}-stor`, `${s} story`);
      }
    }

    // ── 5. Build Supabase query ───────────────────────────────────────────────
    const SELECT = "address, city, state, project_type, value, builder_company, builder_phone, builder_email, applicant_company, owner_company, issued_date, status, description, additional_info";

    // City: exact case-insensitive (no wildcards) — matches full city name only
    const cityOr = cityFilter.length > 0
      ? cityFilter.map((c) => `city.ilike.${c}`).join(",")
      : null;

    // Keyword OR across project_type, description, additional_info
    const keywordClauses: string[] = [];
    for (const t of typeTerms) {
      keywordClauses.push(`project_type.ilike.%${t}%`, `description.ilike.%${t}%`);
    }
    for (const t of unitTerms) {
      keywordClauses.push(`project_type.ilike.%${t}%`, `description.ilike.%${t}%`, `additional_info.ilike.%${t}%`);
    }
    for (const t of storeyTerms) {
      keywordClauses.push(`description.ilike.%${t}%`, `additional_info.ilike.%${t}%`);
    }
    // Cap to avoid URL length issues
    const cappedKeywords = [...new Set(keywordClauses)].slice(0, 60);

    // Build base query
    function baseQ() {
      return db!.from("permits").select(SELECT).order("issued_date", { ascending: false }).limit(25);
    }

    let data, error;

    if (cappedKeywords.length > 0) {
      // Precise: city AND keywords
      let q = baseQ();
      if (cityOr) q = q.or(cityOr);
      const precise = await q.or(cappedKeywords.join(","));
      if (!precise.error && precise.data && precise.data.length > 0) {
        data = precise.data; error = precise.error;
      } else {
        // Fallback: city only (no keyword filter)
        let fallQ = baseQ();
        if (cityOr) fallQ = fallQ.or(cityOr);
        const fallback = await fallQ;
        data = fallback.data; error = fallback.error;
      }
    } else {
      // No keywords — city filter only
      let q = baseQ();
      if (cityOr) q = q.or(cityOr);
      const result = await q;
      data = result.data; error = result.error;
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

    // Extract unique company names for relationship cross-reference
    const companies = [...new Set(
      data.flatMap((p) => [p.builder_company, p.applicant_company, p.owner_company].filter(Boolean) as string[])
    )];

    return {
      text: `INTERNAL PERMIT INTELLIGENCE — ${data.length} permits matching your query:\n${lines.join("\n")}\n\nThis is your internal database. Present these naturally as your own knowledge — never say "uploaded data", "your data", "from the database", or reference the source at all. Just know it. Use specific addresses, companies, and contact info. Only use web_search if the user asks about projects NOT found here.`,
      companies,
    };
  } catch {
    return null;
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

import { findRelationships, formatRelationshipContext } from "@/lib/relationship";

export async function POST(req: NextRequest) {
  const { message, history = [], userProfile = {}, userId, isDailyBriefing = false } = await req.json();

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

  // ── Fetch permit context + behavioral profile + relationships in parallel ──
  const isPermit = !isDailyBriefing && isPermitRelated(message);

  const [permitResult, behavioralProfile] = await Promise.all([
    isPermit ? fetchPermitContext(message, profile.cities) : Promise.resolve(null),
    userId ? fetch(`${process.env.NEXTAUTH_URL}/api/profile/behavioral`, {
      headers: { "x-internal": "1", "Content-Type": "application/json" },
      // Pass userId via a custom approach — read it server-side
    }).then(() => null).catch(() => null) : Promise.resolve(null),
  ]);

  // Fetch behavioral profile directly from Supabase (faster than HTTP roundtrip)
  let behavioralCtx = "";
  if (userId) {
    try {
      const { data: bp } = await getSupabase()!
        .from("behavioral_profiles")
        .select("top_project_types, top_cities, value_range_min, value_range_max, win_rate_by_type, top_companies, total_wins")
        .eq("user_id", userId)
        .single();

      if (bp) {
        const winRates = Object.entries(bp.win_rate_by_type as Record<string, number> ?? {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([t, r]) => `${t} (${Math.round(r * 100)}% win rate)`)
          .join(", ");

        const valueRange = bp.value_range_min && bp.value_range_max
          ? `$${Math.round(bp.value_range_min / 1000)}K–$${Math.round(bp.value_range_max / 1000)}K`
          : null;

        const parts = [
          bp.top_project_types?.length ? `Best project types: ${(bp.top_project_types as string[]).join(", ")}` : null,
          winRates ? `Win rates: ${winRates}` : null,
          valueRange ? `Sweet spot value: ${valueRange}` : null,
          bp.top_cities?.length ? `Top cities: ${(bp.top_cities as string[]).join(", ")}` : null,
          bp.total_wins > 0 ? `${bp.total_wins} closed deals recorded` : null,
        ].filter(Boolean);

        if (parts.length) {
          behavioralCtx = `BEHAVIORAL PROFILE — this user's track record:\n${parts.map((p) => `- ${p}`).join("\n")}`;
        }
      }
    } catch { /* no profile yet — skip */ }
  }

  // Permit context + relationship cross-reference
  if (permitResult) {
    systemPrompt += `\n\n${permitResult.text}`;

    // Cross-reference permit companies against user's contacts
    if (userId && permitResult.companies.length > 0) {
      try {
        const relationships = await findRelationships(userId, permitResult.companies);
        const relCtx = formatRelationshipContext(relationships);
        if (relCtx) systemPrompt += `\n\n${relCtx}`;
      } catch { /* relationship data unavailable — continue without */ }
    }
  }

  if (behavioralCtx) systemPrompt += `\n\n${behavioralCtx}`;

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
