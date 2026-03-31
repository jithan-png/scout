"""
Chat Routes
  POST /api/chat/parse-profile  — extract trades + cities from a free-text message (onboarding)
  POST /api/chat/message        — conversational Scout AI (floating chat)
"""
import json
import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

# ── Known trades (must match setup page TRADE_OPTIONS) ───────────────────────

_KNOWN_TRADES = [
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
]

# ── Parse profile ─────────────────────────────────────────────────────────────

class ParseProfileRequest(BaseModel):
    message: str


@router.post("/parse-profile")
async def parse_profile(request: ParseProfileRequest):
    """
    Extract trades and cities from a user's free-text description.
    Returns lists that map to the setup wizard chip/tag options.
    """
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"trades": [], "cities": []}

    import anthropic
    client = anthropic.AsyncAnthropic(api_key=api_key, max_retries=1, timeout=10.0)

    system = (
        "You are a profile parser for a construction lead intelligence app. "
        "Extract the user's trade/service category and geographic area(s) from their message. "
        f"Map trades to the closest match from this list (return the exact label): {json.dumps(_KNOWN_TRADES)}. "
        "If no close match exists, use the user's own words. "
        "Cities/regions should be returned as the user wrote them (proper case). "
        'Return ONLY valid JSON: {"trades": [...], "cities": [...]}. No explanation.'
    )

    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            system=system,
            messages=[{"role": "user", "content": message}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:].strip()
        data = json.loads(raw)
        return {
            "trades": data.get("trades", []),
            "cities": data.get("cities", []),
        }
    except Exception as e:
        logger.warning(f"parse-profile failed: {e}")
        return {"trades": [], "cities": []}


# ── Conversational chat ───────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    message: str
    context: str = ""   # e.g. "Lead: Capstone apartment, Kelowna, $24M, score 72"
    history: list = []  # [{role, content}, ...] — last N turns


_SCOUT_SYSTEM = """\
You are Scout, an AI construction sales intelligence assistant built by BuildMapper. \
You help tradespeople and contractors find and win construction projects.

You are concise, direct, and practical. You speak like a smart colleague — not a chatbot. \
No bullet points unless asked. No fluff. Short paragraphs.

You can help with:
- Drafting intro emails or follow-up messages for specific leads
- Assessing whether a lead is worth pursuing
- Suggesting next steps on a project
- Explaining score breakdowns or lead details
- General construction sales strategy

When asked to draft an email, write it immediately — do not ask for more info unless critical fields are missing.
"""


@router.post("/message")
async def chat_message(request: ChatMessageRequest):
    """
    Conversational Scout AI. Accepts user message + optional lead context + history.
    Returns a single reply string.
    """
    message = request.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"reply": "Scout is offline right now — API key not configured."}

    import anthropic
    client = anthropic.AsyncAnthropic(api_key=api_key, max_retries=1, timeout=30.0)

    # Build message history
    messages = []

    # Inject context as a system-adjacent user/assistant exchange if present
    if request.context:
        messages.append({
            "role": "user",
            "content": f"[Current context: {request.context}]",
        })
        messages.append({
            "role": "assistant",
            "content": "Got it, I have that context.",
        })

    # Add conversation history (last 6 turns max to keep tokens low)
    for turn in request.history[-6:]:
        if turn.get("role") in ("user", "assistant") and turn.get("content"):
            messages.append({"role": turn["role"], "content": turn["content"]})

    # Add current message
    messages.append({"role": "user", "content": message})

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=_SCOUT_SYSTEM,
            messages=messages,
        )
        return {"reply": response.content[0].text.strip()}
    except Exception as e:
        logger.error(f"chat/message failed: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
