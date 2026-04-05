// ── Multi-source research pipeline ─────────────────────────────────────────────
// Pre-flight searches for tender portals and developer monitoring signals.
// These run before the main Scout chat call to inject structured context.

import Anthropic from "@anthropic-ai/sdk";

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SEARCH_TOOL: any[] = [{ type: "web_search_20250305", name: "web_search" }];

/**
 * Search Canadian tender portals (MERX, BCBid, Biddingo) for active
 * construction tenders in the given cities.
 * Returns a formatted context string or null if nothing found.
 */
export async function fetchTenderContext(
  cities: string[],
  trades: string[] = []
): Promise<string | null> {
  const client = getClient();
  if (!client || !cities.length) return null;

  const cityStr = cities.slice(0, 3).join(", ");
  const tradeStr = trades.length ? trades.slice(0, 2).join(", ") : "construction";

  const systemPrompt = `You are a construction tender researcher. Search for active construction tenders in ${cityStr} on these portals: merx.com, bcbid.gov.bc.ca, biddingo.com. Focus on tenders relevant to ${tradeStr}. Return ONLY a plain-text list of up to 5 tenders you find, each on a new line in this format: "- [Project name] · [Portal] · [Closing: date if found] · [Value: amount if found]". If you find nothing, return the single word: NONE.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      tools: SEARCH_TOOL,
      system: systemPrompt,
      messages: [{ role: "user", content: `Find active construction tenders in ${cityStr} on MERX, BCBid, and Biddingo.` }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    if (!text || text === "NONE" || text.toLowerCase().includes("none")) return null;

    return `ACTIVE TENDERS — from MERX, BCBid, and Biddingo:\n${text}\n\nSurface these tender opportunities when relevant. For each tender, note the portal, closing date, and suggest the best angle of approach for the user's trade.`;
  } catch {
    return null;
  }
}

/**
 * Search for developer monitoring signals: recent planning applications,
 * rezoning activity, and LinkedIn job postings as construction activity proxies.
 * Returns a formatted context string or null.
 */
export async function fetchWebProjectContext(
  cities: string[],
  topCompanies: string[] = [],
  trades: string[] = []
): Promise<string | null> {
  const client = getClient();
  if (!client || !cities.length) return null;

  const cityStr = cities.slice(0, 3).join(", ");
  const companyStr = topCompanies.slice(0, 3).join(", ");
  const tradeStr = trades.length ? trades.slice(0, 2).join(", ") : "construction";

  const queries: string[] = [
    `${cityStr} development permit application OR rezoning application 2025`,
    `${cityStr} new construction project announcement 2025`,
  ];
  if (companyStr) {
    queries.push(`${companyStr} new construction project 2025`);
  }
  // LinkedIn job postings as pre-construction activity signal
  queries.push(`site:linkedin.com/jobs "project manager" OR "site superintendent" ${cityStr} construction`);

  const systemPrompt = `You are a construction market intelligence researcher. Search for pre-permit and early-stage construction signals in ${cityStr}. Focus on: (1) planning/rezoning applications, (2) new project announcements, (3) LinkedIn job postings that signal upcoming construction starts${companyStr ? `, (4) new projects from these developers: ${companyStr}` : ""}. Return ONLY a plain-text list of up to 6 signals, each on a new line: "- [Signal type] · [Project/company name] · [Location] · [Detail]". Signal types: REZONING, PLANNING, PROJECT, LINKEDIN_HIRE. If nothing found, return NONE.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      tools: SEARCH_TOOL,
      system: systemPrompt,
      messages: [{ role: "user", content: queries[0] }],
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    if (!text || text === "NONE" || text.toLowerCase().includes("none")) return null;

    return `MARKET SIGNALS — pre-permit and early-stage construction activity:\n${text}\n\nThese signals indicate upcoming work before permits are filed. Rezoning and planning applications typically lead construction starts by 3-12 months. LinkedIn hiring signals often precede permit issuance by 4-8 weeks. Surface these as early-mover opportunities — the earlier the user reaches out, the less competition.`;
  } catch {
    return null;
  }
}

/**
 * Lightweight check: is this message asking about tenders/bids/RFPs?
 */
export function isTenderRelated(message: string): boolean {
  const lower = message.toLowerCase();
  const TENDER_KEYWORDS = [
    "tender", "tenders", "rfp", "rfq", "bid", "bids", "bidding",
    "merx", "bcbid", "biddingo", "procurement", "rfp", "request for proposal",
    "public contract", "government contract", "public tender",
  ];
  return TENDER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Is this a market/developer research query?
 */
export function isMarketResearchRelated(message: string): boolean {
  const lower = message.toLowerCase();
  const MARKET_KEYWORDS = [
    "developer", "developers", "rezoning", "planning application",
    "pre-permit", "pre permit", "what's coming", "whats coming",
    "pipeline", "upcoming projects", "new development", "market activity",
    "who's building", "whos building", "active developers",
    "linkedin", "hiring", "job posting",
  ];
  return MARKET_KEYWORDS.some((kw) => lower.includes(kw));
}
