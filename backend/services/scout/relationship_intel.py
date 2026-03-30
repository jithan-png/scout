"""
Scout Relationship Intelligence
For each NormalizedProject, checks the user's existing relational data to
determine how warm the path into this opportunity is.

Checks (in order of trust):
  1. Pipeline deals — same company is an existing/prior customer → strongest signal
  2. Gmail contacts (contact_companies) — known company via email history
  3. Watchlist — user is explicitly monitoring this company

Each match produces a RelationshipSignal. The strongest match sets the overall
RelationshipStatus. A ConnectionPath is built from the best available signal.

All matching uses the same token Jaccard similarity as the entity resolver to
avoid inconsistencies.
"""
from __future__ import annotations
import logging
import re
from typing import List, Optional

from db import client as db
from models.scout_models import (
    ConnectionHop, NormalizedProject, RelationshipContext,
    RelationshipSignal, RelationshipStatus,
)

logger = logging.getLogger(__name__)

_COMPANY_MATCH_THRESHOLD = 0.70  # slightly lower than entity resolver — be more inclusive

_STRIP_SUFFIXES = (
    " ltd", " limited", " inc", " incorporated", " corp", " corporation",
    " llc", " co.", " co", " group", " holdings", " properties", " development",
    " developments", " homes", " construction", " builders", " building",
    " contracting", " contractors", " services",
)


def _norm(name: str) -> str:
    name = name.lower().strip()
    for s in _STRIP_SUFFIXES:
        if name.endswith(s):
            name = name[: -len(s)].strip()
    name = re.sub(r"[^\w\s]", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def _jaccard(a: str, b: str) -> float:
    ta, tb = set(a.split()), set(b.split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _company_match(name_a: str, name_b: str) -> float:
    """Return similarity score 0–1 between two company names."""
    na, nb = _norm(name_a), _norm(name_b)
    if na == nb:
        return 1.0
    sim = _jaccard(na, nb)
    if na and nb and (na in nb or nb in na):
        sim = max(sim, 0.80)
    return sim


def _project_company_names(project: NormalizedProject) -> List[str]:
    """Return all company names associated with this project."""
    names = [c.name for c in project.companies if c.name]
    return [n for n in names if n.lower() not in ("unknown", "", "n/a")]


async def check_relationship(
    user_id: str, project: NormalizedProject
) -> RelationshipContext:
    """
    Check relationship warmth for a single project against user's data.
    Returns a RelationshipContext with status, strength, signals, and connection path.
    """
    project_companies = _project_company_names(project)
    if not project_companies:
        return _unknown_context()

    signals: List[RelationshipSignal] = []

    # ── 1. Pipeline (prior/active customer) ───────────────────────────────────
    try:
        pipeline = db.get_pipeline() or []
        for deal in pipeline:
            deal_company = (
                deal.get("company_name")
                or deal.get("contractor_name")
                or deal.get("owner_company")
                or ""
            )
            if not deal_company:
                continue
            for pname in project_companies:
                sim = _company_match(deal_company, pname)
                if sim >= _COMPANY_MATCH_THRESHOLD:
                    stage = deal.get("stage", "unknown")
                    signals.append(RelationshipSignal(
                        signal_type=RelationshipStatus.PRIOR_CUSTOMER,
                        entity_name=pname,
                        entity_type="company",
                        strength=0.95,
                        evidence=f"Active/prior deal with {deal_company} (stage: {stage})",
                        source="pipeline",
                    ))
    except Exception as e:
        logger.debug(f"Pipeline check failed for project {project.id}: {e}")

    # ── 2. Gmail contact companies ─────────────────────────────────────────────
    contact_hits: List[dict] = []
    try:
        contact_companies = db.get_contact_companies(user_id) or []
        for cc in contact_companies:
            cc_name = cc.get("company_name") or cc.get("domain") or ""
            if not cc_name:
                continue
            for pname in project_companies:
                sim = _company_match(cc_name, pname)
                if sim >= _COMPANY_MATCH_THRESHOLD:
                    rel_score = cc.get("strongest_score", 0) or 0
                    strength = min(0.9, 0.3 + (rel_score / 100) * 0.6)
                    status = RelationshipStatus.DIRECT if rel_score >= 40 else RelationshipStatus.INDIRECT
                    # Get individual contacts at this company for path building
                    try:
                        contacts_at_co = db.get_contacts_by_domain(user_id, cc.get("domain", "")) or []
                    except Exception:
                        contacts_at_co = []
                    contact_hits.append({
                        "company_name": cc_name,
                        "project_name": pname,
                        "strength": strength,
                        "status": status,
                        "rel_score": rel_score,
                        "contacts": contacts_at_co,
                    })
                    signals.append(RelationshipSignal(
                        signal_type=status,
                        entity_name=pname,
                        entity_type="company",
                        strength=strength,
                        evidence=f"You have {cc.get('contact_count', 1)} Gmail contact(s) at {cc_name}",
                        source="gmail",
                    ))
    except Exception as e:
        logger.debug(f"Contact company check failed for project {project.id}: {e}")

    # ── 3. LinkedIn poster matching ───────────────────────────────────────────
    # If any source_record on this project has poster_name or poster_company,
    # check whether those match any Gmail contact or pipeline company.
    linkedin_sources = [
        sr for sr in project.source_records
        if sr.source_type.value == "linkedin" and (sr.poster_name or sr.poster_company)
    ]
    for lsr in linkedin_sources:
        # Poster company match against pipeline + contacts
        if lsr.poster_company:
            for pname in project_companies + [lsr.poster_company]:
                try:
                    pipeline = db.get_pipeline() or []
                    for deal in pipeline:
                        deal_co = deal.get("company_name") or ""
                        if deal_co and _company_match(deal_co, lsr.poster_company) >= _COMPANY_MATCH_THRESHOLD:
                            signals.append(RelationshipSignal(
                                signal_type=RelationshipStatus.DIRECT,
                                entity_name=lsr.poster_company,
                                entity_type="company",
                                strength=0.80,
                                evidence=f"LinkedIn poster works at {lsr.poster_company} — an existing deal company",
                                source="linkedin_pipeline",
                            ))
                            break
                except Exception:
                    pass

        # Poster name match against Gmail contacts
        if lsr.poster_name:
            try:
                contact_companies = db.get_contact_companies(user_id) or []
                for cc in contact_companies:
                    for contact_entry in (db.get_contacts_by_domain(user_id, cc.get("domain", "")) or []):
                        cname = contact_entry.get("name", "")
                        if cname and _jaccard(_norm(cname), _norm(lsr.poster_name)) >= 0.75:
                            signals.append(RelationshipSignal(
                                signal_type=RelationshipStatus.DIRECT,
                                entity_name=lsr.poster_name,
                                entity_type="contact",
                                strength=0.85,
                                evidence=f"{lsr.poster_name} posted about this project on LinkedIn — they're in your Gmail contacts",
                                source="linkedin_contact",
                            ))
                            break
            except Exception:
                pass

    # ── 4. Watchlist ──────────────────────────────────────────────────────────
    try:
        watchlist = db.get_watchlist(user_id) or []
        for entry in watchlist:
            wname = entry.get("company_name", "")
            if not wname:
                continue
            for pname in project_companies:
                sim = _company_match(wname, pname)
                if sim >= _COMPANY_MATCH_THRESHOLD:
                    signals.append(RelationshipSignal(
                        signal_type=RelationshipStatus.WATCHED,
                        entity_name=pname,
                        entity_type="company",
                        strength=0.55,
                        evidence=f"You're watching {wname}",
                        source="watchlist",
                    ))
    except Exception as e:
        logger.debug(f"Watchlist check failed for project {project.id}: {e}")

    if not signals:
        return _unknown_context()

    # ── Determine overall status (best signal wins) ───────────────────────────
    status_priority = {
        RelationshipStatus.PRIOR_CUSTOMER: 5,
        RelationshipStatus.DIRECT:         4,
        RelationshipStatus.WATCHED:        3,
        RelationshipStatus.INDIRECT:       2,
        RelationshipStatus.UNKNOWN:        0,
    }
    best_signal = max(signals, key=lambda s: (status_priority.get(s.signal_type, 0), s.strength))
    overall_status = best_signal.signal_type
    overall_strength = best_signal.strength

    # ── Build connection path ─────────────────────────────────────────────────
    path = _build_path(best_signal, contact_hits)

    summary = _summary(best_signal, contact_hits)

    return RelationshipContext(
        status=overall_status,
        strength=round(overall_strength, 2),
        has_warm_path=overall_status != RelationshipStatus.UNKNOWN,
        signals=signals,
        connection_path=path,
        summary=summary,
    )


def _build_path(
    best: RelationshipSignal,
    contact_hits: List[dict],
) -> List[ConnectionHop]:
    """Build a human-readable connection path for the best signal."""
    hops: List[ConnectionHop] = [ConnectionHop(label="You", type="you")]

    if best.source == "pipeline":
        hops.append(ConnectionHop(
            label=best.entity_name, type="company",
            detail="Prior / active deal",
        ))

    elif best.source == "gmail":
        # Find best individual contact at the matched company
        matching_hit = next(
            (h for h in contact_hits if h["project_name"] == best.entity_name), None
        )
        if matching_hit and matching_hit.get("contacts"):
            # Pick the contact with highest relationship score
            top_contact = max(
                matching_hit["contacts"],
                key=lambda c: c.get("relationship_score", 0),
                default=None,
            )
            if top_contact:
                name = top_contact.get("name", "Contact")
                company = matching_hit["company_name"]
                hops.append(ConnectionHop(
                    label=name, type="contact",
                    detail=f"at {company}",
                    strength="strong" if matching_hit["rel_score"] >= 60 else "medium",
                ))
                hops.append(ConnectionHop(label=best.entity_name, type="company"))
        else:
            hops.append(ConnectionHop(label=best.entity_name, type="company", detail="via Gmail"))

    elif best.source == "watchlist":
        hops.append(ConnectionHop(
            label=best.entity_name, type="company",
            detail="On your watchlist",
        ))

    elif best.source in ("linkedin_pipeline", "linkedin_contact"):
        hops.append(ConnectionHop(
            label=best.entity_name, type="contact" if best.entity_type == "contact" else "company",
            detail="Via LinkedIn post",
        ))

    return hops


def _summary(best: RelationshipSignal, contact_hits: List[dict]) -> str:
    if best.source == "pipeline":
        return f"Prior or active deal with {best.entity_name}"
    if best.source == "gmail":
        hit = next((h for h in contact_hits if h["project_name"] == best.entity_name), None)
        if hit and hit.get("contacts"):
            top = max(hit["contacts"], key=lambda c: c.get("relationship_score", 0), default=None)
            if top:
                return f"You know {top.get('name','a contact')} at {best.entity_name}"
        return f"You have Gmail contacts at {best.entity_name}"
    if best.source == "watchlist":
        return f"You're watching {best.entity_name}"
    if best.source == "linkedin_contact":
        return f"{best.entity_name} posted about this project on LinkedIn — they're in your contacts"
    if best.source == "linkedin_pipeline":
        return f"LinkedIn poster works at {best.entity_name} — a company you've worked with"
    return best.evidence


def _unknown_context() -> RelationshipContext:
    return RelationshipContext(
        status=RelationshipStatus.UNKNOWN,
        strength=0.0,
        has_warm_path=False,
        signals=[],
        connection_path=[],
        summary="No connection found",
    )
