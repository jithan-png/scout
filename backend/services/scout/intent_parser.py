"""
Scout Intent Parser
Converts a natural language query into a structured UserIntent.
Primary: Claude Haiku with a JSON extraction prompt.
Fallback: deterministic keyword + pattern matching (no API required).
"""
from __future__ import annotations
import asyncio
import json
import logging
import os
import re
from typing import Optional

from models.scout_models import (
    Geography, Urgency, UserIntent, WarmthPreference, WorkType,
)

logger = logging.getLogger(__name__)

# ─── Claude prompt ────────────────────────────────────────────────────────────

_SYSTEM = """You are a construction intelligence assistant. Extract structured search intent from a user query about construction projects or sales opportunities. Return ONLY valid JSON — no markdown, no explanation."""

_USER_TEMPLATE = """Extract search intent from this query: "{query}"

Return JSON with exactly these fields:
{{
  "geographies": [{{"city": null, "state": null, "country": "Canada", "region": null}}],
  "trade_categories": [],
  "project_types": [],
  "project_classes": [],
  "stage_preferences": [],
  "warmth_preference": "any",
  "work_type": "any",
  "value_min": null,
  "value_max": null,
  "company_types": [],
  "urgency": "normal"
}}

Rules:
- geographies: extract every city, province/state, region, country mentioned. Use separate objects per location.
- trade_categories: materials/services the user sells — e.g. "HVAC", "drywall", "framing", "electrical", "roofing", "windows"
- project_types: building type — e.g. "multifamily", "townhome", "apartment", "commercial", "industrial", "sfr"
- project_classes: "residential", "commercial", "institutional", "industrial"
- stage_preferences: construction phase — "pre_construction", "framing", "envelope", "finishing"
- warmth_preference: "warm_only" if user says warm/existing/accounts/my, else "warm_first" if they prefer warm, else "any"
- work_type: "public" if government/municipal/institutional, "private" if private/developer, else "any"
- value_min/value_max: dollar amounts if mentioned (as numbers, not strings)
- company_types: "gc", "developer", "owner", "architect" — who the user wants to reach
- urgency: "urgent" if user says "right now/ASAP/urgent", "future" if planning ahead, else "normal"
- Canadian provinces: BC, AB, ON, QC etc. US states: AZ, TX, FL etc.
- "BC Interior" or "Okanagan" → region field
"""


async def parse_intent(query: str) -> UserIntent:
    """Parse a natural language query into a UserIntent. Falls back to keyword parsing."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if api_key:
        try:
            return await _claude_parse(query, api_key)
        except Exception as e:
            logger.warning(f"Scout intent parse (Claude) failed: {e} — using fallback")
    return _keyword_parse(query)


# ─── Claude extraction ────────────────────────────────────────────────────────

async def _claude_parse(query: str, api_key: str) -> UserIntent:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key, max_retries=1, timeout=10.0)
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=_SYSTEM,
        messages=[{"role": "user", "content": _USER_TEMPLATE.format(query=query)}],
    )
    raw = response.content[0].text.strip()
    # Strip any accidental markdown
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip("` \n")
    data = json.loads(raw)
    return _build_intent(query, data, parsed_by="claude")


def _build_intent(query: str, data: dict, parsed_by: str) -> UserIntent:
    geos = []
    for g in (data.get("geographies") or []):
        if any(v for v in g.values() if v):
            geos.append(Geography(
                city=g.get("city"),
                state=g.get("state"),
                country=g.get("country") or "Canada",
                region=g.get("region"),
            ))
    return UserIntent(
        raw_query=query,
        geographies=geos,
        trade_categories=[str(t) for t in (data.get("trade_categories") or [])],
        project_types=[str(t) for t in (data.get("project_types") or [])],
        project_classes=[str(t) for t in (data.get("project_classes") or [])],
        stage_preferences=[str(t) for t in (data.get("stage_preferences") or [])],
        warmth_preference=WarmthPreference(data.get("warmth_preference") or "any"),
        work_type=WorkType(data.get("work_type") or "any"),
        value_min=_safe_float(data.get("value_min")),
        value_max=_safe_float(data.get("value_max")),
        company_types=[str(t) for t in (data.get("company_types") or [])],
        urgency=Urgency(data.get("urgency") or "normal"),
        parsed_by=parsed_by,
    )


# ─── Keyword fallback ─────────────────────────────────────────────────────────

_CANADIAN_PROVINCES = {"bc", "ab", "on", "qc", "sk", "mb", "ns", "nb", "nl", "pe", "yt", "nt", "nu",
                        "british columbia", "alberta", "ontario", "quebec", "saskatchewan", "manitoba"}
_US_STATES = {"az", "tx", "fl", "ca", "wa", "or", "co", "ny", "nc", "ga", "il", "oh", "mi", "pa"}

_TRADE_KEYWORDS: dict[str, list[str]] = {
    "HVAC":        ["hvac", "mechanical", "ductwork", "air handling", "heating", "cooling", "refrigeration"],
    "framing":     ["framing", "lumber", "wood frame", "structural", "truss", "timber"],
    "electrical":  ["electrical", "wiring", "panels", "conduit"],
    "plumbing":    ["plumbing", "piping", "drain", "sewer"],
    "roofing":     ["roofing", "roof", "membrane", "shingles"],
    "drywall":     ["drywall", "gypsum", "wallboard"],
    "concrete":    ["concrete", "formwork", "foundation", "rebar", "reinforcing"],
    "windows":     ["windows", "doors", "glazing", "fenestration"],
    "insulation":  ["insulation", "thermal", "spray foam"],
    "flooring":    ["flooring", "carpet", "hardwood", "tile", "laminate"],
    "millwork":    ["millwork", "cabinetry", "casework", "countertop"],
}

_PROJECT_TYPE_KEYWORDS: dict[str, list[str]] = {
    "multifamily": ["multifamily", "multi-family", "multi family", "apartment", "condo", "rental"],
    "townhome":    ["townhome", "townhouse", "row home", "rowhouse", "stacked"],
    "sfr":         ["single family", "sfr", "detached", "house"],
    "commercial":  ["commercial", "retail", "office", "mixed use", "mixed-use"],
    "industrial":  ["industrial", "warehouse", "distribution", "manufacturing"],
    "institutional":["institutional", "school", "hospital", "government", "municipal", "arena"],
    "renovation":  ["renovation", "retrofit", "reno", "alteration", "retrofit"],
}

_STAGE_KEYWORDS: dict[str, list[str]] = {
    "pre_construction": ["pre-construction", "pre construction", "planning", "application", "rezoning", "development permit"],
    "framing":          ["framing", "structure", "lumber", "wood frame"],
    "envelope":         ["envelope", "roofing", "windows", "mechanical", "plumbing", "electrical"],
    "finishing":        ["finishing", "drywall", "flooring", "interior", "fit-out"],
}

_WARM_TRIGGERS    = {"warm", "existing", "my account", "my client", "current", "relationship", "connected"}
_PUBLIC_TRIGGERS  = {"public", "government", "municipal", "tender", "rfp", "rfq", "bid", "institutional", "school", "hospital"}
_URGENT_TRIGGERS  = {"urgent", "asap", "right now", "immediately", "active", "bidding now", "closing soon"}
_FUTURE_TRIGGERS  = {"planning", "future", "upcoming", "next year", "eventually"}

_CANADIAN_CITIES = {
    "kelowna", "west kelowna", "penticton", "vernon", "kamloops", "vancouver",
    "victoria", "surrey", "burnaby", "richmond", "abbotsford", "chilliwack",
    "nanaimo", "prince george", "calgary", "edmonton", "toronto", "ottawa",
    "hamilton", "london", "winnipeg", "regina", "saskatoon", "halifax",
}
_CANADIAN_REGIONS = {
    "okanagan", "bc interior", "fraser valley", "lower mainland", "vancouver island",
    "greater vancouver", "gta", "golden horseshoe",
}


def _keyword_parse(query: str) -> UserIntent:
    q = query.lower()

    # Geography
    geos: list[Geography] = []
    for city in _CANADIAN_CITIES:
        if city in q:
            geos.append(Geography(city=city.title(), country="Canada"))
    for region in _CANADIAN_REGIONS:
        if region in q:
            geos.append(Geography(region=region.title(), country="Canada"))
    for prov in _CANADIAN_PROVINCES:
        if re.search(rf"\b{re.escape(prov)}\b", q):
            geos.append(Geography(state=prov.upper(), country="Canada"))
    for state in _US_STATES:
        if re.search(rf"\b{re.escape(state)}\b", q):
            geos.append(Geography(state=state.upper(), country="USA"))

    # Deduplicate geos
    seen_geos: list[Geography] = []
    for g in geos:
        if g not in seen_geos:
            seen_geos.append(g)

    # Trades
    trades = [label for label, kws in _TRADE_KEYWORDS.items() if any(kw in q for kw in kws)]

    # Project types
    ptypes = [label for label, kws in _PROJECT_TYPE_KEYWORDS.items() if any(kw in q for kw in kws)]

    # Stages
    stages = [label for label, kws in _STAGE_KEYWORDS.items() if any(kw in q for kw in kws)]

    # Warmth
    if any(t in q for t in _WARM_TRIGGERS):
        warmth = WarmthPreference.WARM_FIRST
    else:
        warmth = WarmthPreference.ANY

    # Work type
    if any(t in q for t in _PUBLIC_TRIGGERS):
        work_type = WorkType.PUBLIC
    else:
        work_type = WorkType.ANY

    # Urgency
    if any(t in q for t in _URGENT_TRIGGERS):
        urgency = Urgency.URGENT
    elif any(t in q for t in _FUTURE_TRIGGERS):
        urgency = Urgency.FUTURE
    else:
        urgency = Urgency.NORMAL

    # Value extraction: "$500K", "$2M", "500,000", etc.
    value_min, value_max = None, None
    value_matches = re.findall(r"\$?\s*(\d[\d,]*\.?\d*)\s*([MKmk]?)", q)
    parsed_values = []
    for num_str, suffix in value_matches:
        try:
            num = float(num_str.replace(",", ""))
            if suffix.lower() == "m":
                num *= 1_000_000
            elif suffix.lower() == "k":
                num *= 1_000
            if num > 1000:
                parsed_values.append(num)
        except ValueError:
            pass
    if len(parsed_values) >= 2:
        value_min, value_max = min(parsed_values), max(parsed_values)
    elif len(parsed_values) == 1:
        value_min = parsed_values[0]

    return UserIntent(
        raw_query=query,
        geographies=seen_geos,
        trade_categories=trades,
        project_types=ptypes,
        project_classes=[],
        stage_preferences=stages,
        warmth_preference=warmth,
        work_type=work_type,
        value_min=value_min,
        value_max=value_max,
        company_types=[],
        urgency=urgency,
        parsed_by="fallback",
    )


def _safe_float(v: Optional[object]) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None
