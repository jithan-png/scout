"""
Scout Opportunity Scorer
Multi-dimensional scoring across 5 axes. Total max = 100.

  request_fit   (30 pts): geography + trade/category + project type + stage
  timing        (20 pts): signal recency + construction entry-window fit
  commercial    (15 pts): estimated value tier + project scale (units/sqft)
  relationship  (25 pts): warmth of connection path
  confidence    (10 pts): quality and quantity of source evidence

Priority thresholds:
  hot   >= 72
  warm  >= 50
  watch <  50

Reuses existing scoring_service helpers where possible to stay consistent
with the rest of the platform's scoring logic.
"""
from __future__ import annotations
import logging
from datetime import date, datetime
from typing import Optional

from models.scout_models import (
    NormalizedProject, OpportunityScore, RelationshipContext,
    RelationshipStatus, SourceConfidence, SourceType, UserIntent,
)

logger = logging.getLogger(__name__)

_HOT_THRESHOLD  = 72
_WARM_THRESHOLD = 50


# ─── Dimension 1: Request Fit (30 pts) ───────────────────────────────────────

def _request_fit(project: NormalizedProject, intent: UserIntent) -> int:
    score = 0

    # Geography match (12 pts)
    score += _geo_score(project, intent)

    # Trade / category match (10 pts)
    score += _trade_score(project, intent)

    # Project type match (5 pts)
    score += _type_score(project, intent)

    # Stage preference match (3 pts)
    score += _stage_score(project, intent)

    return min(score, 30)


def _geo_score(project: NormalizedProject, intent: UserIntent) -> int:
    if not intent.geographies:
        return 8  # no geo filter → partial credit (not a perfect match but not zero)
    city = (project.city or "").lower().strip()
    state = (project.state_province or "").lower().strip()
    region = (project.region or "").lower().strip()
    for geo in intent.geographies:
        if geo.city and geo.city.lower() == city:
            return 12
        if geo.region and geo.region.lower() in (region, city):
            return 9
        if geo.state and geo.state.lower() in state:
            return 6
    return 0


def _trade_score(project: NormalizedProject, intent: UserIntent) -> int:
    if not intent.trade_categories:
        return 5  # no trade filter — partial credit
    desc = (project.description or "").lower()
    tags = [t.lower() for t in project.tags]
    ptype = (project.project_type or "").lower()
    for trade in intent.trade_categories:
        tl = trade.lower()
        if tl in desc or tl in ptype or any(tl in t for t in tags):
            return 10
        # Partial keyword matches (e.g. "HVAC" → "mechanical")
        _SYNONYMS = {
            "hvac": ["mechanical", "heating", "cooling", "ventilation", "ductwork"],
            "framing": ["lumber", "structure", "wood frame", "truss"],
            "electrical": ["wiring", "panels"],
            "plumbing": ["piping", "drain"],
        }
        for kw in _SYNONYMS.get(tl, []):
            if kw in desc:
                return 7
    return 0


def _type_score(project: NormalizedProject, intent: UserIntent) -> int:
    if not intent.project_types:
        return 3
    ptype = (project.project_type or "").lower()
    tags = [t.lower() for t in project.tags]
    for pt in intent.project_types:
        ptl = pt.lower()
        if ptl in ptype or ptl in tags:
            return 5
        # Cluster matching
        _MF_CLUSTER = {"multifamily", "apartment", "condo", "townhome", "duplex", "rental"}
        _COM_CLUSTER = {"commercial", "retail", "office", "mixed_use", "mixed-use"}
        if ptl in _MF_CLUSTER and (ptype in _MF_CLUSTER or any(t in _MF_CLUSTER for t in tags)):
            return 4
        if ptl in _COM_CLUSTER and (ptype in _COM_CLUSTER or any(t in _COM_CLUSTER for t in tags)):
            return 4
    return 0


def _stage_score(project: NormalizedProject, intent: UserIntent) -> int:
    if not intent.stage_preferences:
        return 2
    # Map project status to construction stage for comparison
    from models.scout_models import ProjectStatus
    status_stage_map = {
        ProjectStatus.PRE_APPLICATION: "pre_construction",
        ProjectStatus.PLANNING:        "pre_construction",
        ProjectStatus.PERMITTED:       "framing",
        ProjectStatus.ACTIVE:          "envelope",
        ProjectStatus.COMPLETE:        "finishing",
        ProjectStatus.UNKNOWN:         "framing",
    }
    project_stage = status_stage_map.get(project.status, "framing")
    if project_stage in intent.stage_preferences:
        return 3
    return 1


# ─── Dimension 2: Timing (20 pts) ────────────────────────────────────────────

def _timing(project: NormalizedProject, intent: UserIntent) -> int:
    score = 0

    # Signal recency (10 pts) — how recent is the latest signal
    score += _recency_score(project.latest_signal_date or project.earliest_signal_date)

    # Entry-window fit (10 pts) — for internal DB records with issued_date and value,
    # reuse the existing timing fit logic from scoring_service
    score += _window_fit(project, intent)

    return min(score, 20)


def _recency_score(date_str: Optional[str]) -> int:
    if not date_str:
        return 3
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d").date()
        days = (date.today() - d).days
        if days <= 7:   return 10
        if days <= 14:  return 8
        if days <= 30:  return 6
        if days <= 60:  return 4
        if days <= 120: return 2
        return 1
    except Exception:
        return 3


def _window_fit(project: NormalizedProject, intent: UserIntent) -> int:
    """Use existing scoring_service timing logic for projects with enough data."""
    if not intent.stage_preferences and not intent.trade_categories:
        return 5  # neutral

    # Build a minimal project dict compatible with scoring_service
    from models.scout_models import ProjectStatus
    status_map = {
        ProjectStatus.PERMITTED: "issued",
        ProjectStatus.ACTIVE: "issued",
        ProjectStatus.PLANNING: "pending",
    }
    project_dict = {
        "issued_date": project.earliest_signal_date or "",
        "value": project.estimated_value or 0,
        "tags": project.tags,
        "permit_type": project.project_type or "",
        "status": status_map.get(project.status, "unknown"),
    }

    # Infer entry stage from trade categories
    from services.scoring_service import infer_entry_stage, _timing_fit_score
    entry_stage = (
        intent.stage_preferences[0]
        if intent.stage_preferences
        else infer_entry_stage(intent.trade_categories)
    )

    try:
        raw_timing = _timing_fit_score(project_dict, entry_stage)
        # Map the 0–30 scale from scoring_service to our 0–10 window fit budget
        return round(raw_timing / 3)
    except Exception:
        return 5


# ─── Dimension 3: Commercial (15 pts) ─────────────────────────────────────────

_VALUE_TIERS = [
    (10_000_000, 15),
    (5_000_000,  13),
    (2_000_000,  11),
    (1_000_000,   9),
    (500_000,     7),
    (200_000,     5),
    (100_000,     3),
    (0,           1),
]

def _commercial(project: NormalizedProject, intent: UserIntent) -> int:
    score = 0
    value = project.estimated_value or 0

    # Value fit (10 pts)
    if value > 0:
        # If user specified a value range, check fit
        if intent.value_min or intent.value_max:
            vmin = intent.value_min or 0
            vmax = intent.value_max or float("inf")
            if vmin <= value <= vmax:
                score += 10
            elif value > vmax * 2 or value < vmin * 0.5:
                score += 2  # way out of range
            else:
                score += 5
        else:
            # No preference — use absolute value tiers
            for threshold, pts in _VALUE_TIERS:
                if value >= threshold:
                    score += min(pts, 10)
                    break

    # Scale bonus (5 pts) — unit count, storeys, sqft signals commercial relevance
    if project.unit_count and project.unit_count >= 20:
        score += 5
    elif project.unit_count and project.unit_count >= 6:
        score += 3
    elif project.storey_count and project.storey_count >= 4:
        score += 2

    return min(score, 15)


# ─── Dimension 4: Relationship (25 pts) ──────────────────────────────────────

_REL_SCORES = {
    RelationshipStatus.PRIOR_CUSTOMER: 25,
    RelationshipStatus.DIRECT:         20,
    RelationshipStatus.WATCHED:        15,
    RelationshipStatus.INDIRECT:        8,
    RelationshipStatus.UNKNOWN:         0,
}

def _relationship(relationship: RelationshipContext) -> int:
    base = _REL_SCORES.get(relationship.status, 0)
    # Fine-tune by signal strength (e.g. a weak indirect link scores less than strong)
    if base > 0:
        score = round(base * (0.5 + 0.5 * relationship.strength))
    else:
        score = 0

    # Insider signal bonus: if a LinkedIn poster is a direct contact, add up to +5
    # This rewards the rare case where someone in your network is publicly talking about a project
    linkedin_insider = any(
        s.source in ("linkedin_contact", "linkedin_pipeline")
        for s in relationship.signals
    )
    if linkedin_insider:
        score = min(score + 5, 25)

    return score


# ─── Dimension 5: Data Confidence (10 pts) ───────────────────────────────────

def _confidence(project: NormalizedProject) -> int:
    if not project.source_records:
        return 1

    # Count by confidence level
    high   = sum(1 for sr in project.source_records if sr.confidence == SourceConfidence.HIGH)
    medium = sum(1 for sr in project.source_records if sr.confidence == SourceConfidence.MEDIUM)
    low    = sum(1 for sr in project.source_records if sr.confidence == SourceConfidence.LOW)

    # Any internal DB record → high base confidence
    has_internal = any(sr.source_type == SourceType.INTERNAL_DB for sr in project.source_records)
    # LinkedIn-only → lower base (public scrape, no auth)
    has_linkedin = any(sr.source_type == SourceType.LINKEDIN for sr in project.source_records)
    is_linkedin_only = has_linkedin and not has_internal and not any(
        sr.source_type in (SourceType.WEB_EVIDENCE, SourceType.PROCUREMENT)
        for sr in project.source_records
    )

    if is_linkedin_only:
        base = 3  # LinkedIn-only: low confidence floor
    elif has_internal and high >= 1:
        base = 10
    elif has_internal or high >= 1:
        base = 8
    elif medium >= 2:
        base = 6
    elif medium >= 1:
        base = 4
    elif low >= 1:
        base = 2
    else:
        base = 1

    # Bonus for corroboration across multiple source types
    source_types = {sr.source_type for sr in project.source_records}
    if len(source_types) > 1:
        base = min(base + 1, 10)

    return base


# ─── Main score function ──────────────────────────────────────────────────────

def score_opportunity(
    project: NormalizedProject,
    intent: UserIntent,
    relationship: RelationshipContext,
) -> OpportunityScore:
    """Score a single project against intent + relationship context."""
    rf  = _request_fit(project, intent)
    tim = _timing(project, intent)
    com = _commercial(project, intent)
    rel = _relationship(relationship)
    con = _confidence(project)

    total = rf + tim + com + rel + con
    total = max(0, min(total, 100))

    priority = "hot" if total >= _HOT_THRESHOLD else "warm" if total >= _WARM_THRESHOLD else "watch"

    return OpportunityScore(
        total=total,
        request_fit=rf,
        timing=tim,
        commercial=com,
        relationship=rel,
        confidence=con,
        priority=priority,
    )
