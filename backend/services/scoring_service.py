"""
Scoring Service
Scores projects as leads based on rule-based heuristics + optional user profile.
Emits a score_breakdown dict alongside each lead's total score.

Base scoring (no profile):
  Recency         — 30 pts
  Value           — 25 pts
  Contact info    — 15 pts
  Project type    — 20 pts (hardcoded HIGH/MED/LOW)
  Status          — 10 pts

With user profile (personalized):
  Recency         — 30 pts  (unchanged)
  Value           — 25 pts  (unchanged)
  Contact info    — 15 pts  (unchanged)
  Project type    — 25 pts  (profile-matched instead of hardcoded)
  Status          — 10 pts  (unchanged)
  Geographic match — +20 pts
  Timeline stage  — +15 pts
  Value range fit  — +5 pts
"""
from typing import List, Dict, Any, Optional
from datetime import date, datetime


# ─── Trade → Entry Stage Inference ────────────────────────────────────────────

# Keywords in products/trades text → construction entry stage
_TRADE_ENTRY_STAGE: Dict[str, List[str]] = {
    "pre_construction": [
        "excavat", "foundation", "concrete", "formwork", "grading", "site prep",
        "geotech", "civil", "rebar", "reinforc", "shoring", "underpinning",
    ],
    "framing": [
        "framing", "lumber", "wood frame", "structural", "steel stud", "truss",
        "engineered wood", "glulam", "paneliz", "timber", "wood supply",
    ],
    "envelope": [
        "roofing", "roof", "window", "door", "siding", "cladding", "waterproof",
        "membrane", "exterior", "envelope", "curtain wall", "glazing",
        "plumbing", "electrical", "hvac", "mechanical", "sprinkler",
        "fire suppression", "ductwork", "piping", "insulation board",
    ],
    "finishing": [
        "drywall", "insulation", "flooring", "cabinet", "millwork", "fixture",
        "appliance", "paint", "tile", "trim", "finish carpenter", "casework",
        "countertop", "bathroom", "kitchen", "lighting", "hardware", "carpet",
        "hardwood", "laminate", "stair", "railing",
    ],
}


def infer_entry_stage(products_trades: List[str], company_type: str = "") -> str:
    """Infer when this trade/supplier enters a project from their category keywords."""
    text = " ".join(products_trades).lower() + " " + (company_type or "").lower()
    for stage, keywords in _TRADE_ENTRY_STAGE.items():
        if any(kw in text for kw in keywords):
            return stage
    return "framing"  # default: most trades enter mid-construction


# ─── Construction Timeline Intelligence ───────────────────────────────────────

# Typical construction duration in months, keyed by (type_category, value_tier)
_DURATION_MONTHS = {
    ("single_family", "small"):   7,   # <$500K
    ("single_family", "medium"):  10,  # $500K–$1.5M
    ("single_family", "large"):   14,  # >$1.5M
    ("duplex",        "any"):     9,
    ("triplex",       "any"):     10,
    ("fourplex",      "any"):     11,
    ("sixplex",       "any"):     13,
    ("townhome",      "small"):   12,
    ("townhome",      "large"):   18,
    ("apartment",     "small"):   14,  # <$3M
    ("apartment",     "large"):   24,  # >$3M
    ("commercial",    "small"):   8,   # <$1M
    ("commercial",    "large"):   24,  # >$1M
    ("industrial",    "any"):     18,
    ("renovation",    "any"):     5,
    ("default",       "any"):     12,
}

_STAGES = [
    (0,  15, "pre_construction", "Pre-construction / Foundation"),
    (15, 35, "framing",          "Framing & Structure"),
    (35, 60, "envelope",         "Envelope & Mechanical"),
    (60, 80, "finishing",        "Interior Finishing"),
    (80, 95, "near_complete",    "Near Completion"),
    (95, 101,"complete",         "Complete"),
]

# How well does a user's entry_stage align with each project stage?
_STAGE_MATCH = {
    "pre_construction": {"pre_construction": 15, "framing": 10, "envelope": 4, "finishing": 0, "near_complete": 0, "complete": 0},
    "framing":          {"pre_construction": 10, "framing": 15, "envelope": 8, "finishing": 2, "near_complete": 0, "complete": 0},
    "envelope":         {"pre_construction": 4,  "framing": 8,  "envelope": 15,"finishing": 8, "near_complete": 2, "complete": 0},
    "finishing":        {"pre_construction": 0,  "framing": 2,  "envelope": 8, "finishing": 15,"near_complete": 12,"complete": 0},
}


def _timing_fit_score(project: Dict[str, Any], entry_stage: str) -> int:
    """
    30 pts max. Replaces fixed recency when a user profile is present.
    Scores how well the permit's age aligns with when this trade/supplier
    would actually need to be engaged, based on project type + value duration.

    A finishing contractor should score a 7-month-old permit on a 12-month house
    much higher than a 1-week-old permit — they'd be calling too early.
    """
    stage_lo, stage_hi = 15, 35  # default to framing range
    for lo, hi, key, _ in _STAGES:
        if key == entry_stage:
            stage_lo, stage_hi = lo, hi
            break

    stage_info = estimate_project_stage(project)
    duration = stage_info["duration_months"]
    months_elapsed = stage_info["months_elapsed"]

    # Ideal engagement window in months from permit issue
    ideal_start = (stage_lo / 100) * duration
    ideal_end = (stage_hi / 100) * duration

    # Open window 1 month early so user can get ahead; close 0.5 months late
    window_open = max(0, ideal_start - 1.0)
    window_close = ideal_end + 0.5

    if window_open <= months_elapsed <= window_close:
        return 30  # perfect timing
    elif months_elapsed < window_open:
        # Permit too new — upcoming opportunity, not at stage yet
        gap = window_open - months_elapsed
        if gap <= 1: return 22
        if gap <= 2: return 15
        if gap <= 3: return 10
        return 5
    else:
        # Permit too old — likely past this trade's window
        overdue = months_elapsed - window_close
        if overdue <= 1: return 18
        if overdue <= 2: return 10
        if overdue <= 4: return 5
        if overdue <= 6: return 2
        return 0


def _type_category(project: Dict[str, Any]) -> str:
    tags = [t.lower() for t in project.get("tags", [])]
    if "single_family" in tags:  return "single_family"
    if "duplex" in tags:         return "duplex"
    if "triplex" in tags:        return "triplex"
    if "fourplex" in tags:       return "fourplex"
    if "sixplex" in tags:        return "sixplex"
    if "townhome" in tags:       return "townhome"
    if any(t in tags for t in ["apartment", "condo", "multifamily"]): return "apartment"
    if "commercial" in tags:     return "commercial"
    if "industrial" in tags:     return "industrial"
    if "renovation" in tags:     return "renovation"
    return "default"


def _value_tier(value: float) -> str:
    if value < 500_000:   return "small"
    if value < 1_500_000: return "medium"
    if value < 3_000_000: return "large"
    return "large"


def estimate_project_stage(project: Dict[str, Any]) -> Dict[str, Any]:
    """
    Estimate what construction stage a project is currently at.
    Returns dict with: stage_pct, stage_key, stage_label, months_elapsed, months_remaining, duration_months
    """
    issued_date = project.get("issued_date", "")
    value = project.get("value", 0) or 0
    type_cat = _type_category(project)
    vtier = _value_tier(value)

    # Look up duration — try specific key, fall back to "any" tier, then default
    duration = (
        _DURATION_MONTHS.get((type_cat, vtier))
        or _DURATION_MONTHS.get((type_cat, "any"))
        or _DURATION_MONTHS[("default", "any")]
    )

    try:
        issued = datetime.strptime(issued_date, "%Y-%m-%d").date()
        days_elapsed = (date.today() - issued).days
    except Exception:
        days_elapsed = 30  # assume recently issued if date missing

    duration_days = duration * 30.44
    stage_pct = min(100, int((days_elapsed / duration_days) * 100))
    months_elapsed = round(days_elapsed / 30.44, 1)
    months_remaining = max(0, round((duration_days - days_elapsed) / 30.44, 1))

    stage_key = "complete"
    stage_label = "Complete"
    for lo, hi, key, label in _STAGES:
        if lo <= stage_pct < hi:
            stage_key = key
            stage_label = label
            break

    return {
        "stage_pct": stage_pct,
        "stage_key": stage_key,
        "stage_label": stage_label,
        "months_elapsed": months_elapsed,
        "months_remaining": months_remaining,
        "duration_months": duration,
    }


# ─── Personalized type scoring (replaces hardcoded HIGH/MED/LOW when profile present) ──

def _profile_type_score(project: Dict[str, Any], user_profile: Dict[str, Any]) -> int:
    """Score project type relevance against user's target project types. Max 25 pts."""
    target_types = [t.lower() for t in user_profile.get("target_project_types", [])]
    if not target_types:
        # No preference set — use hardcoded fallback
        tags = project.get("tags", [])
        return _type_score(project.get("permit_type", ""), tags)

    tags = [t.lower() for t in project.get("tags", [])]
    type_cat = _type_category(project)

    # Direct match
    if type_cat in target_types or any(t in target_types for t in tags):
        return 25
    # Partial / related match (e.g. user targets "multifamily", project is apartment)
    multifamily_cluster = {"apartment", "condo", "multifamily", "townhome", "fourplex", "sixplex", "triplex", "duplex"}
    residential_cluster = {"single_family", "duplex", "townhome"}
    if type_cat in multifamily_cluster and any(t in multifamily_cluster for t in target_types):
        return 15
    if type_cat in residential_cluster and any(t in residential_cluster for t in target_types):
        return 12
    return 3  # no match


# --- Recency (30 pts) ---
def _recency_score(issued_date: str) -> int:
    try:
        issued = datetime.strptime(issued_date, "%Y-%m-%d").date()
        days_ago = (date.today() - issued).days
        if days_ago <= 7:  return 30
        if days_ago <= 14: return 22
        if days_ago <= 30: return 14
        if days_ago <= 60: return 7
        return 2
    except Exception:
        return 5


# --- Value (25 pts) ---
VALUE_TIERS = [
    (2_000_000, 25),
    (1_000_000, 20),
    (500_000,   15),
    (200_000,   10),
    (100_000,    6),
    (50_000,     3),
    (0,          1),
]

def _value_score(value: float) -> int:
    if not value:
        return 0  # unknown value — no score, not penalised
    for threshold, pts in VALUE_TIERS:
        if value >= threshold:
            return pts
    return 0


# --- Contact completeness (15 pts) ---
def _contact_score(project: Dict[str, Any]) -> int:
    score = 0
    if project.get("contractor_email") or project.get("builder_email"):
        score += 10
    if project.get("contractor_phone") or project.get("builder_phone"):
        score += 5
    return score


# --- Project type opportunity (20 pts) ---
HIGH_OPP = {
    "apartment highrise", "apartment", "commercial building", "mixed use",
    "condo lowrise", "multifamily", "land development"
}
MEDIUM_OPP = {
    "townhomes/row homes", "townhome", "single family dwelling",
    "double family dwelling", "triplex", "fourplex", "institutional building"
}
LOW_OPP = {
    "demolition", "industrial building", "renovation", "alteration",
    "residential alteration", "commercial alteration"
}

def _type_score(permit_type: str, tags: List[str]) -> int:
    pt_lower = permit_type.lower().strip()

    # Check tags first (more specific)
    if any(t in tags for t in ["apartment", "condo", "commercial", "mixed_use", "land_dev"]):
        return 20
    if any(t in tags for t in ["townhome", "multifamily", "fourplex", "triplex", "duplex", "single_family"]):
        return 14
    if any(t in tags for t in ["demolition", "renovation"]):
        return 8

    # Fallback to raw permit type
    if pt_lower in HIGH_OPP:    return 20
    if pt_lower in MEDIUM_OPP:  return 14
    if pt_lower in LOW_OPP:     return 8
    return 10  # default


# --- Status (10 pts) ---
def _status_score(status: str) -> int:
    if status == "issued": return 10
    if status == "pending": return 5
    return 0


# --- Score reason (human-readable) ---
def _score_reason(project: Dict[str, Any], score: int) -> str:
    value = project.get("value", 0) or 0
    vstr = f"${value/1_000_000:.1f}M" if value >= 1_000_000 else (f"${value/1_000:.0f}K" if value > 0 else "Value TBD")
    ptype = project.get("permit_type", "project")
    city = project.get("city", "")
    tags = project.get("tags", [])

    tag_str = f" [{', '.join(tags[:3])}]" if tags else ""
    base = f"{vstr} {ptype} in {city}{tag_str}"

    if score >= 80:
        note = "Strong opportunity — high value, recent permit, contact info available."
    elif score >= 60:
        note = "Good lead worth pursuing."
    elif score >= 40:
        note = "Moderate opportunity — consider if capacity allows."
    else:
        note = "Lower priority lead."

    return f"{base}. {note}"


def _priority(score: int) -> str:
    if score >= 70: return "high"
    if score >= 45: return "medium"
    return "low"


def score_projects(
    projects: List[Dict[str, Any]],
    filters: Optional[Dict[str, Any]] = None,
    user_profile: Optional[Dict[str, Any]] = None,
    max_leads: int = 20,
    watchlist_entries: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Score and filter projects into leads.
    If user_profile is provided, scoring is personalized to their preferences.
    Returns list of lead dicts sorted by score descending.
    """
    filters = filters or {}
    cities       = [c.lower() for c in (filters.get("cities") or [])]
    permit_types = [t.lower() for t in (filters.get("permit_types") or [])]
    tags_filter  = [t.lower() for t in (filters.get("tags") or [])]
    min_value    = filters.get("min_value") or 0
    regions      = [r.lower() for r in (filters.get("regions") or [])]

    has_profile = bool(user_profile and user_profile.get("onboarding_complete"))

    leads = []
    for project in projects:
        # --- Apply filters ---
        if cities and project.get("city", "").lower() not in cities:
            continue
        if permit_types and project.get("permit_type", "").lower() not in permit_types:
            continue
        if project.get("value", 0) < min_value:
            continue
        if regions and project.get("region", "").lower() not in regions:
            continue
        if tags_filter:
            project_tags = [t.lower() for t in project.get("tags", [])]
            if not any(t in project_tags for t in tags_filter):
                continue

        # --- Calculate score ---
        tags = project.get("tags", [])

        if has_profile:
            # ── Personalized scoring ──────────────────────────────────────────
            type_pts = _profile_type_score(project, user_profile)

            # Geographic match (+20 pts)
            proj_city = project.get("city", "").strip()
            proj_region = project.get("region", "").strip()
            target_cities = [c.strip() for c in user_profile.get("target_cities", [])]
            target_regions = [r.strip() for r in user_profile.get("target_regions", [])]
            geo_pts = 0
            if target_cities and proj_city in target_cities:
                geo_pts = 20
            elif target_regions and proj_region in target_regions:
                geo_pts = 12

            # Infer entry stage from trade/supply category if not explicitly set
            user_entry = user_profile.get("entry_stage") or infer_entry_stage(
                user_profile.get("products_trades", []),
                user_profile.get("company_type", ""),
            )

            # Timing fit: replaces fixed recency — scores how well permit age
            # matches when this trade actually needs to be on site (30 pts)
            stage_info = estimate_project_stage(project)
            timing_pts = _timing_fit_score(project, user_entry)

            # Value range fit (+5 pts)
            pval = project.get("value", 0) or 0
            min_pv = user_profile.get("min_project_value") or 0
            max_pv = user_profile.get("max_project_value") or 999_999_999
            val_fit_pts = 5 if min_pv <= pval <= max_pv else 0

            val_pts = _value_score(pval)
            contact_pts = _contact_score(project)
            status_pts = _status_score(project.get("status", ""))

            score = timing_pts + val_pts + contact_pts + type_pts + status_pts + geo_pts + val_fit_pts

            breakdown = {
                "timing": timing_pts,
                "value": val_pts + val_fit_pts,
                "contact": contact_pts,
                "type_match": type_pts,
                "geographic": geo_pts,
                "status": status_pts,
                "watchlist_boost": 0,
                "ingest_bonus": 0,
            }
        else:
            # ── Generic scoring (no profile) ─────────────────────────────────
            stage_info = estimate_project_stage(project)
            recency_pts = _recency_score(project.get("issued_date", ""))
            val_pts = _value_score(project.get("value", 0))
            contact_pts = _contact_score(project)
            type_pts = _type_score(project.get("permit_type", ""), tags)
            status_pts = _status_score(project.get("status", ""))

            score = recency_pts + val_pts + contact_pts + type_pts + status_pts

            breakdown = {
                "timing": recency_pts,
                "value": val_pts,
                "contact": contact_pts,
                "type_match": type_pts,
                "geographic": 0,
                "status": status_pts,
                "watchlist_boost": 0,
                "ingest_bonus": 0,
            }

        # Blend with pre-computed ingestion signal (up to 8 bonus pts)
        ingest_opp = project.get("opportunity_score", 0)
        ingest_bonus = int(ingest_opp * 0.08)
        score += ingest_bonus
        breakdown["ingest_bonus"] = ingest_bonus

        # Watchlist boost: +30 pts for HIGH-confidence match against watched companies
        watchlist_match = False
        if watchlist_entries:
            try:
                from services.watchlist_service import match_company, confidence_band
                wconf, _ = match_company(project, watchlist_entries)
                if confidence_band(wconf) == "high":
                    score += 30
                    watchlist_match = True
                    breakdown["watchlist_boost"] = 30
            except Exception:
                pass

        score = min(score, 100)

        reason = _score_reason(project, score)
        if watchlist_match:
            reason = "**Watchlist match** — " + reason

        leads.append({
            "project": project,
            "score": score,
            "score_reason": reason,
            "priority": "high" if watchlist_match else _priority(score),
            "contacted": False,
            "stage": stage_info,
            "watchlist_match": watchlist_match,
            "score_breakdown": breakdown,
        })

    leads.sort(key=lambda x: x["score"], reverse=True)
    return leads[:max_leads]


async def enrich_score_reasons(leads: list, user_profile: dict = None) -> list:
    """
    Batch-enrich the top leads with plain-English reasons from Claude Haiku.
    Replaces generic score_reason with a 1–2 sentence trade-specific explanation.
    Returns leads with updated score_reason fields.
    """
    import os, json, asyncio
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not leads:
        return leads

    trade_context = ""
    if user_profile:
        trade = user_profile.get("products_trades", [])
        entry = user_profile.get("entry_stage", "")
        if trade:
            trade_context = f"The user is a {', '.join(trade[:2])} supplier/contractor"
            if entry:
                trade_context += f" who typically enters projects at the {entry} stage"
            trade_context += "."

    lead_summaries = []
    for i, lead in enumerate(leads[:10]):
        p = lead.get("project", {})
        bd = lead.get("score_breakdown", {})
        lead_summaries.append(
            f"{i+1}. {p.get('address','?')}, {p.get('city','?')} | "
            f"${(p.get('value',0) or 0)/1000:.0f}K {p.get('permit_type','')} | "
            f"Score {lead.get('score',0)} | "
            f"Timing:{bd.get('timing',0)} Value:{bd.get('value',0)} Type:{bd.get('type_match',0)} "
            f"Geo:{bd.get('geographic',0)} Contact:{bd.get('contact',0)}"
        )

    prompt = f"""{trade_context}

For each of these construction leads, write a 1-sentence explanation of why it's a good fit.
Be specific about the opportunity (timing, value, project type). Max 20 words per reason.

Leads:
{chr(10).join(lead_summaries)}

Return JSON array of strings — one reason per lead, in the same order. No markdown.
Example: ["Framing starts in ~2 months on a $1.2M townhome — ideal timing.", ...]"""

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key, max_retries=1, timeout=12.0)
        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        reasons = json.loads(raw)
        for i, reason in enumerate(reasons):
            if i < len(leads) and reason:
                leads[i]["score_reason"] = reason
    except Exception:
        pass  # fall back to existing reasons — never block on this

    return leads
