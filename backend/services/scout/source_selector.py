"""
Scout Source Selector
Given a UserIntent, returns which adapter types to use and in what priority order.

Selection matrix:
  - internal_db:   always checked when regions have structured coverage
  - procurement:   activated for public/institutional work type
  - web_evidence:  activated when internal coverage is thin or supplementary needed

The selector is deterministic — no randomness, no AI. It's a pure function of the intent.
"""
from __future__ import annotations
import logging
from typing import List

from models.scout_models import SourceType, UserIntent, WorkType

logger = logging.getLogger(__name__)

# Cities/regions where BuildMapper has structured internal permit coverage.
# Expand this list as uploads arrive. Used to decide when internal_db is the
# primary source vs. when web evidence needs to carry the load.
INTERNAL_COVERAGE: set[str] = {
    # BC – Okanagan
    "kelowna", "west kelowna", "penticton", "vernon", "summerland",
    "peachland", "lake country", "oliver", "osoyoos",
    # BC – Metro / Interior
    "kamloops", "abbotsford", "chilliwack", "mission", "hope",
    # BC – Lower Mainland
    "vancouver", "surrey", "burnaby", "richmond", "coquitlam",
    "langley", "delta", "maple ridge", "north vancouver", "west vancouver",
    "port coquitlam", "new westminster", "white rock",
    # BC – Vancouver Island
    "victoria", "nanaimo", "saanich", "langford", "colwood",
}


def select_sources(intent: UserIntent) -> List[SourceType]:
    """
    Return ordered list of source types to activate for this intent.
    Ordering matters: internal_db results are always merged first (highest trust).
    """
    sources: List[SourceType] = []

    # Determine if any requested geography has internal coverage
    has_internal_coverage = _has_internal_coverage(intent)

    # internal_db: use when we have coverage OR when no specific geography is given
    if has_internal_coverage or not intent.geographies:
        sources.append(SourceType.INTERNAL_DB)

    # procurement: activate for public/institutional work, or when query mentions tenders
    if intent.work_type in (WorkType.PUBLIC, WorkType.ANY):
        query_lower = intent.raw_query.lower()
        procurement_signals = any(
            kw in query_lower
            for kw in ["tender", "rfp", "rfq", "bid", "public", "government",
                        "municipal", "institutional", "school", "hospital", "arena"]
        )
        if intent.work_type == WorkType.PUBLIC or procurement_signals:
            sources.append(SourceType.PROCUREMENT)

    # web_evidence + linkedin: always useful as supplementary layers
    # Skip only if user explicitly wants warm-only (internal relationship data only)
    from models.scout_models import WarmthPreference
    if intent.warmth_preference != WarmthPreference.WARM_ONLY:
        sources.append(SourceType.WEB_EVIDENCE)
        sources.append(SourceType.LINKEDIN)

    if not sources:
        # Absolute fallback — should never happen, but be safe
        sources = [SourceType.WEB_EVIDENCE]

    logger.info(
        f"Source selection for '{intent.raw_query[:60]}': {[s.value for s in sources]} "
        f"(internal_coverage={has_internal_coverage})"
    )
    return sources


def _has_internal_coverage(intent: UserIntent) -> bool:
    """Return True if any geography in the intent maps to a covered region."""
    if not intent.geographies:
        return True  # no geography filter — search all internal data

    for geo in intent.geographies:
        city = (geo.city or "").lower().strip()
        region = (geo.region or "").lower().strip()
        state = (geo.state or "").lower().strip()

        if city in INTERNAL_COVERAGE:
            return True
        # Okanagan / BC Interior → internal coverage
        if region in {"okanagan", "bc interior"}:
            return True
        # BC with no specific city → assume some coverage
        if state in {"bc", "british columbia"}:
            return True

    return False


def coverage_note(intent: UserIntent, sources_used: List[str]) -> str:
    """Generate an honest statement about data coverage for this result set."""
    has_internal = "internal_db" in sources_used
    has_web = "web_evidence" in sources_used
    has_procurement = "procurement" in sources_used
    has_linkedin = "linkedin" in sources_used

    geo_labels = []
    for g in intent.geographies:
        parts = [p for p in [g.city, g.region, g.state] if p]
        if parts:
            geo_labels.append(", ".join(parts))
    geo_str = " / ".join(geo_labels) if geo_labels else "your selected region"

    parts = []
    if has_internal:
        parts.append(f"permit registry for {geo_str}")
    if has_procurement:
        parts.append("public tenders")
    if has_web:
        parts.append("web signals")
    if has_linkedin:
        parts.append("LinkedIn")

    if not parts:
        return "Results sourced from available data."

    source_str = " · ".join(parts)
    note = f"Results from {source_str}."

    if not has_internal:
        note += (
            " No structured permit data for this region — "
            "results rely on web evidence and may have lower confidence."
        )
    return note
