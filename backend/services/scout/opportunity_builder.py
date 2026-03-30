"""
Scout Opportunity Builder
Combines a NormalizedProject + OpportunityScore + RelationshipContext
into the final Opportunity object with surfaced reasons and a recommended action.
"""
from __future__ import annotations
import uuid
from typing import List

from models.scout_models import (
    ActionType, NormalizedProject, Opportunity, OpportunityScore,
    RecommendedAction, RelationshipContext, RelationshipStatus,
    SourceConfidence, SourceType, SurfacedReason, UserIntent,
)


def build_opportunity(
    project: NormalizedProject,
    score: OpportunityScore,
    relationship: RelationshipContext,
    intent: UserIntent,
) -> Opportunity:
    reasons = _build_reasons(project, score, relationship, intent)
    action  = _recommended_action(project, score, relationship)

    return Opportunity(
        id=f"opp_{uuid.uuid4().hex[:8]}",
        project=project,
        score=score,
        relationship=relationship,
        surfaced_reasons=reasons,
        recommended_action=action,
    )


# ─── Surfaced reasons ─────────────────────────────────────────────────────────

def _build_reasons(
    project: NormalizedProject,
    score: OpportunityScore,
    relationship: RelationshipContext,
    intent: UserIntent,
) -> List[SurfacedReason]:
    reasons: List[SurfacedReason] = []

    # Geography
    if score.request_fit >= 6:
        city = project.city or "your region"
        reasons.append(SurfacedReason(
            label=city,
            detail=f"Matches your target geography",
            type="geography",
        ))

    # Trade / category
    if score.request_fit >= 7 and intent.trade_categories:
        trade = ", ".join(intent.trade_categories[:2])
        reasons.append(SurfacedReason(
            label=f"Trade match",
            detail=f"{trade} work in scope",
            type="trade",
        ))

    # Value
    val = project.estimated_value
    if val and val >= 100_000:
        val_str = f"${val/1_000_000:.1f}M" if val >= 1_000_000 else f"${val/1_000:.0f}K"
        reasons.append(SurfacedReason(
            label=val_str,
            detail="Estimated project value",
            type="value",
        ))

    # Timing
    signal_date = project.latest_signal_date or project.earliest_signal_date
    if signal_date:
        try:
            from datetime import date, datetime
            d = datetime.strptime(signal_date[:10], "%Y-%m-%d").date()
            days = (date.today() - d).days
            if days <= 7:
                label, detail = "Filed this week", "Early mover advantage"
            elif days <= 30:
                label, detail = f"Filed {days} days ago", "Recent activity"
            else:
                from datetime import timedelta
                label = f"Signalled {days} days ago"
                detail = f"Project underway — timing may suit your entry stage"
            reasons.append(SurfacedReason(label=label, detail=detail, type="timing"))
        except Exception:
            pass

    # Relationship
    if relationship.has_warm_path:
        reasons.append(SurfacedReason(
            label=_rel_label(relationship.status),
            detail=relationship.summary,
            type="relationship",
        ))

    # Source confidence
    has_official = any(
        sr.source_type == SourceType.INTERNAL_DB or sr.confidence == SourceConfidence.HIGH
        for sr in project.source_records
    )
    if has_official:
        reasons.append(SurfacedReason(
            label="Official record",
            detail="Sourced from permit or planning registry",
            type="confidence",
        ))
    elif len(project.source_records) > 1:
        reasons.append(SurfacedReason(
            label="Corroborated",
            detail=f"Found across {len(project.source_records)} sources",
            type="confidence",
        ))

    # Procurement
    if any(sr.source_type == SourceType.PROCUREMENT for sr in project.source_records):
        reasons.append(SurfacedReason(
            label="Active tender",
            detail="Public procurement opportunity found",
            type="procurement",
        ))

    return reasons


def _rel_label(status: RelationshipStatus) -> str:
    return {
        RelationshipStatus.PRIOR_CUSTOMER: "Existing customer",
        RelationshipStatus.DIRECT:         "Warm path",
        RelationshipStatus.WATCHED:        "Watched company",
        RelationshipStatus.INDIRECT:       "Indirect connection",
        RelationshipStatus.UNKNOWN:        "New relationship",
    }.get(status, "Connection")


# ─── Recommended action ───────────────────────────────────────────────────────

def _recommended_action(
    project: NormalizedProject,
    score: OpportunityScore,
    relationship: RelationshipContext,
) -> RecommendedAction:
    """Choose the single best next action for this opportunity."""

    status = relationship.status

    # Direct path available → act on it
    if status == RelationshipStatus.PRIOR_CUSTOMER:
        company = project.companies[0].name if project.companies else "them"
        return RecommendedAction(
            label="Call your contact directly",
            detail=f"You've worked with {company} before — reach out directly as an incumbent",
            action_type=ActionType.CALL,
        )

    if status == RelationshipStatus.DIRECT:
        # Find best contact name from path
        path_names = [h.label for h in relationship.connection_path if h.type == "contact"]
        contact = path_names[0] if path_names else "your contact"
        company = project.companies[0].name if project.companies else "them"
        return RecommendedAction(
            label=f"Email {contact}",
            detail=f"You have a warm intro — email {contact} at {company}",
            action_type=ActionType.EMAIL,
        )

    if status == RelationshipStatus.WATCHED:
        company = project.companies[0].name if project.companies else "this company"
        return RecommendedAction(
            label="Review watched company",
            detail=f"{company} is on your watchlist — review activity and find a contact",
            action_type=ActionType.RESEARCH,
        )

    if status == RelationshipStatus.INDIRECT:
        return RecommendedAction(
            label="Find a warm intro",
            detail="You have an indirect connection — find who to ask for an introduction",
            action_type=ActionType.CONNECT,
        )

    # No warm path
    has_contact = any(c.email or c.phone for c in project.contacts)
    has_contact_co = any(c.email or c.phone for c in project.companies)

    if score.total >= 72:  # HOT — definitely pursue even cold
        company = project.companies[0].name if project.companies else "the company"
        return RecommendedAction(
            label="Research and outreach",
            detail=f"High-value opportunity at {company} — research decision makers and reach out",
            action_type=ActionType.RESEARCH,
        )

    if score.commercial >= 10:
        return RecommendedAction(
            label="Save to watchlist",
            detail="Large project — save and monitor for procurement/contact signals",
            action_type=ActionType.WATCH,
        )

    return RecommendedAction(
        label="Track project",
        detail="Add to watchlist and revisit when timing is better",
        action_type=ActionType.SAVE,
    )
