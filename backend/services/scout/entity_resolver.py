"""
Scout Entity Resolver
Merges NormalizedProject objects that refer to the same real-world project,
company, or contact — even when they come from different sources with slightly
different names or addresses.

Strategy:
  Projects:  same city + address token similarity > 0.80
  Companies: normalized name token Jaccard > 0.75 (strips legal suffixes)
  Contacts:  same full name + same company

The resolver preserves uncertainty — it does NOT force a merge if confidence
is below threshold. Low-confidence matches are kept separate.
"""
from __future__ import annotations
import logging
import re
import uuid
from typing import Dict, List, Optional, Tuple

from models.scout_models import (
    CompanyRole, NormalizedCompany, NormalizedContact, NormalizedProject, SourceRecord,
)

logger = logging.getLogger(__name__)

# Minimum similarity to merge two projects / companies
_PROJECT_MERGE_THRESHOLD = 0.80
_COMPANY_MERGE_THRESHOLD = 0.75

# Legal / generic suffixes stripped before company name comparison
_STRIP_SUFFIXES = (
    " ltd", " limited", " inc", " incorporated", " corp", " corporation",
    " llc", " co.", " co", " group", " holdings", " properties", " development",
    " developments", " homes", " construction", " builders", " building",
    " contracting", " contractors", " services",
)


# ─── Name normalization ───────────────────────────────────────────────────────

def _normalize_company_name(name: str) -> str:
    """Lowercase, strip punctuation and common legal/trade suffixes."""
    name = name.lower().strip()
    for suffix in _STRIP_SUFFIXES:
        if name.endswith(suffix):
            name = name[: -len(suffix)].strip()
    name = re.sub(r"[^\w\s]", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _normalize_address(addr: str) -> str:
    """Lowercase, strip unit/suite prefixes, normalize whitespace."""
    addr = addr.lower().strip()
    addr = re.sub(r"\b(unit|suite|apt|#)\s*\d+\b", "", addr)
    addr = re.sub(r"[^\w\s]", " ", addr)
    addr = re.sub(r"\s+", " ", addr).strip()
    return addr


# ─── Similarity helpers ───────────────────────────────────────────────────────

def _token_jaccard(a: str, b: str) -> float:
    """Jaccard similarity between token sets of two strings."""
    ta = set(a.split())
    tb = set(b.split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _company_similarity(a: str, b: str) -> float:
    na, nb = _normalize_company_name(a), _normalize_company_name(b)
    if na == nb:
        return 1.0
    sim = _token_jaccard(na, nb)
    # Boost if one name is a substring of the other
    if na in nb or nb in na:
        sim = max(sim, 0.85)
    return sim


def _project_key(proj: NormalizedProject) -> Tuple[str, str]:
    """Canonical (city, normalized_address) key for a project."""
    city = (proj.city or "").lower().strip()
    addr = _normalize_address(proj.address or "")
    return (city, addr)


# ─── Project resolution ───────────────────────────────────────────────────────

def resolve_projects(projects: List[NormalizedProject]) -> List[NormalizedProject]:
    """
    Merge duplicate NormalizedProject objects into canonical records.
    Internal DB records are always the canonical base when available.
    """
    if not projects:
        return []

    # Sort: internal_db records first (highest trust — become canonical base)
    from models.scout_models import SourceType
    projects = sorted(
        projects,
        key=lambda p: (
            0 if any(sr.source_type == SourceType.INTERNAL_DB for sr in p.source_records) else 1,
            p.city or "",
        ),
    )

    canonical: List[NormalizedProject] = []

    for project in projects:
        merged = False
        pkey = _project_key(project)

        for existing in canonical:
            ekey = _project_key(existing)

            # Must be in the same city
            if pkey[0] != ekey[0]:
                continue

            # Address similarity
            if pkey[1] and ekey[1]:
                sim = _token_jaccard(pkey[1], ekey[1])
                if sim >= _PROJECT_MERGE_THRESHOLD:
                    _merge_into(existing, project)
                    merged = True
                    break
            elif not pkey[1] and not ekey[1]:
                # Both have no address — try name similarity
                name_a = (existing.name or "").lower()
                name_b = (project.name or "").lower()
                if name_a and name_b and _token_jaccard(name_a, name_b) >= _PROJECT_MERGE_THRESHOLD:
                    _merge_into(existing, project)
                    merged = True
                    break

        if not merged:
            canonical.append(project)

    logger.info(f"Entity resolution: {len(projects)} → {len(canonical)} projects")
    return canonical


def _merge_into(base: NormalizedProject, incoming: NormalizedProject) -> None:
    """
    Merge `incoming` into `base` in-place.
    Base (typically internal DB) fields take priority.
    Additive: source_records, companies, contacts are unioned.
    """
    # Source records: always union
    existing_urls = {sr.source_url for sr in base.source_records}
    for sr in incoming.source_records:
        if sr.source_url not in existing_urls:
            base.source_records.append(sr)
            existing_urls.add(sr.source_url)

    # Fill in missing fields from incoming
    base.name = base.name or incoming.name
    base.description = base.description or incoming.description
    base.estimated_value = base.estimated_value or incoming.estimated_value
    base.unit_count = base.unit_count or incoming.unit_count
    base.storey_count = base.storey_count or incoming.storey_count
    base.building_form = base.building_form or incoming.building_form
    base.region = base.region or incoming.region

    # Extend tags (deduplicated)
    base.tags = list(set(base.tags + incoming.tags))

    # Update signal dates
    if incoming.latest_signal_date and (
        not base.latest_signal_date or incoming.latest_signal_date > base.latest_signal_date
    ):
        base.latest_signal_date = incoming.latest_signal_date

    if incoming.earliest_signal_date and (
        not base.earliest_signal_date or incoming.earliest_signal_date < base.earliest_signal_date
    ):
        base.earliest_signal_date = incoming.earliest_signal_date

    # Merge companies
    base.companies = _merge_companies(base.companies, incoming.companies)

    # Merge contacts (simple dedup by name)
    existing_contact_names = {c.name.lower() for c in base.contacts}
    for contact in incoming.contacts:
        if contact.name.lower() not in existing_contact_names:
            base.contacts.append(contact)
            existing_contact_names.add(contact.name.lower())


def _merge_companies(
    base_companies: List[NormalizedCompany],
    incoming_companies: List[NormalizedCompany],
) -> List[NormalizedCompany]:
    """Merge company lists — resolve duplicates by name similarity."""
    merged = list(base_companies)
    for incoming in incoming_companies:
        matched = False
        for existing in merged:
            sim = _company_similarity(existing.name, incoming.name)
            if sim >= _COMPANY_MERGE_THRESHOLD:
                # Union roles
                for role in incoming.roles:
                    if role not in existing.roles:
                        existing.roles.append(role)
                # Fill contact info
                existing.phone = existing.phone or incoming.phone
                existing.email = existing.email or incoming.email
                existing.website = existing.website or incoming.website
                # Lower confidence if the merge was not exact
                if sim < 1.0:
                    existing.confidence = min(existing.confidence, incoming.confidence * sim)
                matched = True
                break
        if not matched:
            merged.append(incoming)
    return merged
