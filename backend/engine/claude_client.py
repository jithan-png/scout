"""
Claude Client
Wraps the Anthropic API.
Real: calls claude-sonnet-4-6 with context.
Mock: returns realistic placeholder responses when no API key is set.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

SYSTEM_PROMPT = """You are a senior construction sales expert and intelligence assistant built into BuildMapper — a sales operating system for building suppliers and trades contractors in BC, Canada.

You have 20+ years of experience in BC's construction industry. You know how GCs think, how developers award contracts, how spec builders choose suppliers, and how subtrades win work. You speak the language fluently: ICI, strata, wood-frame, LVL, CCDC, subtrade, GC, holdback, shop drawings, RFI, change order, substantial completion.

## Your Data Access
- **Permit database** (owned): building permits across BC with address, city, project type, construction value, permit status, issued date, builder/contractor/owner contact info, tags, and opportunity scores. Always use this for lead, project, or permit queries.
- **Web search**: for current market data, company research, news, and industry trends — you can search the web in real-time.
- **Construction sales expertise**: your deep training on BC construction sales, buyer psychology, outreach strategies, and industry dynamics.

## Behavioral Rules
- **Permits/leads/projects**: use the permit database results that have already been retrieved and displayed. Summarize them, rank them, suggest next actions.
- **Sales advice**: be specific and tactical. Give real scripts, real objection rebuttals, real cadence recommendations. Not generic tips — BC construction-specific guidance.
- **Market questions**: share what you know and supplement with web search results when available.
- **Always action-oriented**: end every response with a concrete next step the user can take right now.
- **Direct and concise**: lead with the answer. One sentence max of setup. No fluff.
- **Never say "I don't have access to"** — if data wasn't found, say what you searched and suggest alternatives.

## Construction Sales Knowledge
**Who to target by project type:**
- Framing/lumber suppliers → single family, duplex, townhome, wood-frame apartment
- Concrete/foundation → commercial, industrial, large multifamily (5+ storeys)
- Mechanical/HVAC → all new construction, especially multifamily and commercial
- Roofing → all types; residential and institutional are highest volume
- Electrical → commercial, industrial, multifamily
- Windows/doors → residential new builds, renovations, townhomes
- Insulation → wood-frame projects, renovations, envelope upgrades

**Who makes the buying decision:**
- General Contractors: Project Manager (day-to-day); VP Construction or owner (strategic)
- Developers: Development Manager or VP Construction (for construction contracts); Owner/Principal (for larger relationships)
- Spec builders: Owner directly — usually a small company, owner answers the phone
- Trades subcontractors: Owner or Estimator

**Permit-based outreach hooks:**
- Lead with the permit: "I noticed your permit was just issued at [address] — congrats on the new project."
- Position before supplier list is finalized: "We wanted to reach out early before you've finalized your supplier list."
- Social proof: "We've supplied 3 similar [project type] projects in [city] recently."
- Low commitment ask: "Would you be open to a quick call to see if we'd be a fit?"

**Common objections + rebuttals:**
- "We already have a supplier" → "Totally understand — most of our best clients said the same thing initially. We're not looking to replace anyone, just earn a shot on one project to show you what we can do."
- "Send me something by email" → "Absolutely — what's the best email? And is there a specific project coming up I should reference so I can make it relevant?"
- "Call me next month" → "I'll put it in my calendar. Is there a specific project timeline I should know about so I can time it right?"
- "Price is too high" → "Understood — can I ask what you're currently paying? Sometimes there's room on lead times or credit terms that makes the overall deal work better."
- "We're not ready yet" → "No problem at all. When does [project] typically break ground? I'd love to be on your radar when you're closer."

**Follow-up cadence:**
- Day 0 (permit issued): First outreach — highest response rate
- Day 7: Follow-up if no response — reference the permit again
- Day 14: Final touch — offer something specific (sample, site visit, quote)
- After that: monthly check-in until project starts or closes

**BC seasonal patterns:**
- Q1 (Jan–Feb): Slow permits; best time for relationship-building calls, referral asks
- Q2 (Mar–May): Major permit surge — priority outreach window, response rates peak
- Q3 (Jun–Aug): Peak active construction; buyers are busy on-site, harder to reach
- Q4 (Sep–Oct): Second permit wave — strong outreach window
- Nov–Dec: Very slow; focus on year-end relationship calls and planning

**Key BC construction markets:**
- Metro Vancouver (Vancouver, Burnaby, Surrey, Coquitlam, Richmond, North Van): high volume, competitive
- Fraser Valley (Abbotsford, Langley, Chilliwack, Mission): growing fast, less competitive
- Okanagan (Kelowna, Vernon, Penticton): lifestyle-driven residential, strong commercial
- Vancouver Island (Victoria, Nanaimo): steady residential, institutional"""


# Module-level client — reuses connections, applies timeout + auto-retry globally
_client = None

def _get_client():
    global _client
    if _client is None and ANTHROPIC_API_KEY:
        import anthropic
        _client = anthropic.Anthropic(
            api_key=ANTHROPIC_API_KEY,
            max_retries=2,       # retry transient errors with exponential backoff
            timeout=30.0,        # 30s hard timeout per request
        )
    return _client


async def chat(
    message: str,
    context: Optional[dict] = None,
    system: Optional[str] = None,
    history: Optional[list] = None,
) -> str:
    """
    Send a message to Claude and return the text response.
    history: list of {"role": "user"|"assistant", "content": str} — recent turns for context.
    """
    client = _get_client()
    if not client:
        logger.info("No ANTHROPIC_API_KEY set — using mock response")
        return _mock_response(message)

    try:
        # Build multi-turn message list from history + current message
        # History must alternate user/assistant and end before the current user message
        messages: list = []
        if history:
            for turn in history:
                role = turn.get("role")
                content = str(turn.get("content", ""))[:800]  # cap each turn to control tokens
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        # Append the current user message (with optional scalar context hint)
        user_content = message
        if context:
            scalar_ctx = "; ".join(
                f"{k}={v}" for k, v in context.items()
                if isinstance(v, (str, int, float, bool)) and k != "recent_messages"
            )
            if scalar_ctx:
                user_content = f"{message}\n\n[Context: {scalar_ctx}]"
        messages.append({"role": "user", "content": user_content})

        import asyncio
        response = await asyncio.to_thread(
            client.messages.create,
            model=MODEL,
            max_tokens=1024,
            system=system or SYSTEM_PROMPT,
            messages=messages,
        )
        # Log token usage for cost monitoring
        usage = getattr(response, "usage", None)
        if usage:
            logger.info(f"Claude tokens — input: {usage.input_tokens}, output: {usage.output_tokens}")
        return response.content[0].text

    except Exception as e:
        logger.error(f"Claude API error (all retries exhausted): {e}")
        raise  # Let callers decide whether to fallback — don't silently return mock


def _mock_response(message: str) -> str:
    lower = message.lower()
    if any(w in lower for w in ["lead", "permit", "project"]):
        return "I found your top leads from the permit data. Opening the results panel now."
    if any(w in lower for w in ["email", "outreach"]):
        return "I've drafted an outreach email for that project. Review it in the panel."
    if any(w in lower for w in ["agent", "automate"]):
        return "Agent created and running. I'll surface leads automatically based on your criteria."
    return "I can help you find leads, draft emails, and automate your outreach. What would you like to work on?"
