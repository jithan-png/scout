"""
Scout Normalizer
Converts RawRecord objects from any adapter into NormalizedProject objects.

Each source type has its own normalization path:
  - internal_db:   direct field mapping (data already clean)
  - web_evidence:  Claude Haiku extraction from unstructured text
  - procurement:   Claude Haiku extraction from tender content

Claude extraction is batched (up to 10 records per call) to minimize latency.
If Claude is unavailable, web/procurement records produce minimal NormalizedProjects
with low confidence rather than being dropped.
"""
from __future__ import annotations
import asyncio
import json
import logging
import os
import re
import uuid
from typing import List, Optional

from models.scout_models import (
    CompanyRole, NormalizedCompany, NormalizedContact, NormalizedProject,
    ProjectStatus, RawRecord, SourceRecord, SourceType,
)

logger = logging.getLogger(__name__)


# ─── Status normalization ─────────────────────────────────────────────────────

_STATUS_MAP = {
    "issued":          ProjectStatus.PERMITTED,
    "approved":        ProjectStatus.PERMITTED,
    "approved/issued": ProjectStatus.PERMITTED,
    "active":          ProjectStatus.ACTIVE,
    "under construction": ProjectStatus.ACTIVE,
    "pending":         ProjectStatus.PLANNING,
    "in review":       ProjectStatus.PLANNING,
    "application":     ProjectStatus.PRE_APPLICATION,
    "pre-application": ProjectStatus.PRE_APPLICATION,
    "expired":         ProjectStatus.COMPLETE,
    "complete":        ProjectStatus.COMPLETE,
    "completed":       ProjectStatus.COMPLETE,
}

def _map_status(raw: str) -> ProjectStatus:
    return _STATUS_MAP.get((raw or "").lower().strip(), ProjectStatus.UNKNOWN)


# ─── Internal DB normalization ────────────────────────────────────────────────

def _normalize_internal(record: RawRecord) -> NormalizedProject:
    """Direct field mapping for internal DB permit records (already clean)."""
    p = record.raw_data
    project_id = f"proj_{uuid.uuid4().hex[:8]}"

    # Companies — builder, applicant, owner
    companies: List[NormalizedCompany] = []
    contacts: List[NormalizedContact] = []

    company_id_map: dict[str, str] = {}

    def _add_company(name: Optional[str], role: CompanyRole, phone=None, email=None) -> Optional[str]:
        if not name or name.lower() in ("unknown", "", "n/a"):
            return None
        cid = f"co_{uuid.uuid4().hex[:6]}"
        companies.append(NormalizedCompany(
            id=cid, name=name, roles=[role],
            phone=phone, email=email, confidence=1.0,
        ))
        company_id_map[role.value] = cid
        return cid

    def _add_contact(name: Optional[str], role: str, company_id=None, phone=None, email=None):
        if not name or name.lower() in ("unknown", "", "n/a"):
            return
        contacts.append(NormalizedContact(
            id=f"ct_{uuid.uuid4().hex[:6]}",
            name=name, role=role,
            company_id=company_id,
            phone=phone, email=email,
        ))

    builder_cid = _add_company(
        p.get("contractor_name"), CompanyRole.BUILDER,
        p.get("contractor_phone"), p.get("contractor_email"),
    )
    _add_contact(p.get("builder_name"), "builder_contact", builder_cid,
                 p.get("contractor_phone"), p.get("contractor_email"))

    applicant_cid = _add_company(
        p.get("applicant_company"), CompanyRole.APPLICANT,
        p.get("applicant_phone"), p.get("applicant_email"),
    )
    _add_contact(p.get("applicant_name"), "applicant", applicant_cid,
                 p.get("applicant_phone"), p.get("applicant_email"))

    owner_cid = _add_company(
        p.get("owner_company"), CompanyRole.OWNER,
        p.get("owner_phone"), p.get("owner_email"),
    )
    _add_contact(p.get("owner_name"), "owner", owner_cid,
                 p.get("owner_phone"), p.get("owner_email"))

    source_rec = SourceRecord(
        source_type=SourceType.INTERNAL_DB,
        source_url=None,
        source_date=p.get("issued_date"),
        confidence=record.confidence,
        title=f"{p.get('permit_type','')} — {p.get('address','')}",
        excerpt=p.get("description", "")[:200] or None,
    )

    # Build name from description or type + address
    name = _project_name(p.get("description", ""), p.get("permit_type", ""), p.get("address", ""))

    return NormalizedProject(
        id=project_id,
        name=name,
        address=p.get("address"),
        city=p.get("city", ""),
        state_province=p.get("state", "BC"),
        country=p.get("country", "Canada"),
        region=p.get("region"),
        project_class=p.get("project_class"),
        project_type=p.get("permit_type"),
        description=p.get("description", ""),
        status=_map_status(p.get("status", "")),
        estimated_value=p.get("value") or None,
        unit_count=p.get("unit_count"),
        storey_count=p.get("storey_count"),
        building_form=p.get("building_form"),
        tags=p.get("tags", []),
        earliest_signal_date=p.get("issued_date"),
        latest_signal_date=p.get("issued_date"),
        source_records=[source_rec],
        companies=companies,
        contacts=contacts,
        internal_id=p.get("id"),
    )


def _project_name(description: str, permit_type: str, address: str) -> str:
    """Build a short human-readable project name."""
    # If description has enough context, use first clause
    if description and len(description) > 15:
        # Take first sentence, cap at 60 chars
        first = description.split(".")[0].strip()
        if 10 < len(first) <= 60:
            return first
        if len(first) > 60:
            return first[:57] + "..."
    if permit_type and address:
        return f"{permit_type.title()} — {address}"
    return address or permit_type or "Unknown Project"


# ─── Web / Procurement normalization (Claude-assisted) ────────────────────────

_EXTRACT_SYSTEM = (
    "You are a construction data extraction assistant. "
    "Extract structured project information from web content. "
    "Return ONLY valid JSON — no markdown, no explanation."
)

_EXTRACT_PROMPT = """Extract construction project data from this web content.

Title: {title}
URL: {url}
Content: {content}

Return JSON:
{{
  "name": null,
  "address": null,
  "city": null,
  "state": null,
  "project_type": null,
  "description": null,
  "estimated_value": null,
  "status": null,
  "builder_company": null,
  "owner_company": null,
  "gc_company": null,
  "unit_count": null,
  "signal_date": null
}}

Rules:
- name: short project name (e.g. "Kelowna Mixed-Use Development")
- address: street address if found, else null
- city: city name
- state: province or state abbreviation
- project_type: one of: sfr, duplex, townhome, apartment, commercial, industrial, institutional, renovation, mixed_use
- description: 1-2 sentence summary of the project
- estimated_value: dollar amount as number (strip $ and commas), null if not found
- status: one of: pre_application, planning, permitted, active, complete, unknown
- builder_company / owner_company / gc_company: company names if clearly mentioned
- unit_count: number of units/suites if mentioned
- signal_date: most relevant date from content (ISO format YYYY-MM-DD), null if none
- Return null for any field you cannot confidently extract from the content
"""


async def _extract_with_claude(records: List[RawRecord]) -> List[Optional[dict]]:
    """
    Run Claude Haiku extraction on a batch of web/procurement records.
    Returns one extracted dict per input record (or None on failure).
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not records:
        return [None] * len(records)

    import anthropic
    client = anthropic.Anthropic(api_key=api_key, max_retries=1, timeout=20.0)

    results: List[Optional[dict]] = []

    # Process records individually (batching increases complexity without much gain here)
    for record in records:
        d = record.raw_data
        prompt = _EXTRACT_PROMPT.format(
            title=d.get("title", "")[:200],
            url=d.get("url", "")[:200],
            content=d.get("content", "")[:800],
        )
        try:
            response = await asyncio.to_thread(
                client.messages.create,
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=_EXTRACT_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:].strip()
            results.append(json.loads(raw))
        except Exception as e:
            logger.debug(f"Claude extraction failed for '{d.get('url','')}': {e}")
            results.append(None)

    return results


def _normalize_web_record(record: RawRecord, extracted: Optional[dict]) -> Optional[NormalizedProject]:
    """Build a NormalizedProject from a web/procurement record + extracted data."""
    d = record.raw_data
    ext = extracted or {}

    city = ext.get("city") or _guess_city_from_content(d.get("content", "") + " " + d.get("title", ""))
    if not city:
        return None  # skip records where we can't determine city at minimum

    project_id = f"proj_{uuid.uuid4().hex[:8]}"

    companies: List[NormalizedCompany] = []
    def _add_co(name, role):
        if name:
            companies.append(NormalizedCompany(
                id=f"co_{uuid.uuid4().hex[:6]}",
                name=name, roles=[role], confidence=0.7,
            ))

    _add_co(ext.get("builder_company"), CompanyRole.BUILDER)
    _add_co(ext.get("owner_company"), CompanyRole.OWNER)
    _add_co(ext.get("gc_company"), CompanyRole.GC)

    source_rec = SourceRecord(
        source_type=record.source_type,
        source_url=d.get("url"),
        source_date=ext.get("signal_date"),
        confidence=record.confidence,
        title=d.get("title", "")[:120] or None,
        excerpt=(ext.get("description") or d.get("content", "")[:200]) or None,
    )

    name = ext.get("name") or d.get("title", "")[:80] or "Web Project Signal"
    value = _safe_float(ext.get("estimated_value"))

    return NormalizedProject(
        id=project_id,
        name=name,
        address=ext.get("address"),
        city=city,
        state_province=ext.get("state") or "Unknown",
        country="Canada",
        project_type=ext.get("project_type"),
        description=ext.get("description") or d.get("content", "")[:300],
        status=_map_status(ext.get("status") or ""),
        estimated_value=value,
        unit_count=_safe_int(ext.get("unit_count")),
        tags=[],
        earliest_signal_date=ext.get("signal_date"),
        latest_signal_date=ext.get("signal_date"),
        source_records=[source_rec],
        companies=companies,
        contacts=[],
    )


# ─── LinkedIn normalization ───────────────────────────────────────────────────

_LINKEDIN_EXTRACT_PROMPT = """Extract construction project signals from this LinkedIn post.

Title: {title}
URL: {url}
Content: {content}

Return JSON:
{{
  "name": null,
  "city": null,
  "state": null,
  "project_type": null,
  "description": null,
  "estimated_value": null,
  "status": null,
  "company_name": null,
  "poster_name": null,
  "poster_company": null,
  "signal_date": null
}}

Rules:
- name: brief project name if mentioned (e.g. "Downtown Office Tower"), else null
- city: city where the project is located, null if unclear
- state: province/state abbreviation
- project_type: one of: sfr, duplex, townhome, apartment, commercial, industrial, institutional, renovation, mixed_use
- description: 1-2 sentence summary of what the project is
- estimated_value: dollar amount as number only (strip $ and commas), null if not mentioned
- status: one of: pre_application, planning, permitted, active, complete, unknown
- company_name: the main company involved in the project (builder, developer, or GC)
- poster_name: full name of the person who wrote the post if identifiable from content
- poster_company: company the poster works for, if mentioned
- signal_date: date mentioned in the post (ISO YYYY-MM-DD), null if none
- Return null for any field you cannot confidently extract
"""


async def _extract_linkedin_with_claude(records: List[RawRecord]) -> List[Optional[dict]]:
    """Claude Haiku extraction tuned for LinkedIn post content."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or not records:
        return [None] * len(records)

    import anthropic
    client = anthropic.Anthropic(api_key=api_key, max_retries=1, timeout=20.0)
    results: List[Optional[dict]] = []

    for record in records:
        d = record.raw_data
        prompt = _LINKEDIN_EXTRACT_PROMPT.format(
            title=d.get("title", "")[:200],
            url=d.get("url", "")[:200],
            content=d.get("content", "")[:800],
        )
        try:
            response = await asyncio.to_thread(
                client.messages.create,
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                system=_EXTRACT_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:].strip()
            results.append(json.loads(raw))
        except Exception as e:
            logger.debug(f"LinkedIn Claude extraction failed: {e}")
            results.append(None)

    return results


def _normalize_linkedin_record(record: RawRecord, extracted: Optional[dict]) -> Optional[NormalizedProject]:
    """Build a NormalizedProject from a LinkedIn record + extracted data."""
    d = record.raw_data
    ext = extracted or {}

    # Prefer Claude-extracted city, fall back to raw_data from adapter, then content scan
    city = (
        ext.get("city")
        or _guess_city_from_content(d.get("content", "") + " " + d.get("title", ""))
    )
    if not city:
        return None

    project_id = f"proj_{uuid.uuid4().hex[:8]}"

    # Company
    companies: List[NormalizedCompany] = []
    co_name = ext.get("company_name") or d.get("poster_company") or ext.get("poster_company")
    if co_name:
        companies.append(NormalizedCompany(
            id=f"co_{uuid.uuid4().hex[:6]}",
            name=co_name, roles=[CompanyRole.BUILDER], confidence=0.6,
        ))

    # Poster as a contact
    contacts: List[NormalizedContact] = []
    poster_name = ext.get("poster_name") or d.get("poster_name")
    if poster_name:
        contacts.append(NormalizedContact(
            id=f"ct_{uuid.uuid4().hex[:6]}",
            name=poster_name,
            role="linkedin_poster",
            company_id=companies[0].id if companies else None,
        ))

    # Merge Claude-extracted poster fields with adapter-extracted ones
    poster_company = ext.get("poster_company") or d.get("poster_company")
    linkedin_post_url = d.get("linkedin_post_url") or d.get("url")

    source_rec = SourceRecord(
        source_type=SourceType.LINKEDIN,
        source_url=d.get("url"),
        source_date=ext.get("signal_date"),
        confidence=record.confidence,
        title=d.get("title", "")[:120] or None,
        excerpt=(ext.get("description") or d.get("content", "")[:200]) or None,
        linkedin_post_url=linkedin_post_url,
        poster_name=poster_name,
        poster_company=poster_company,
    )

    name = ext.get("name") or d.get("title", "")[:80] or "LinkedIn Project Signal"
    value = _safe_float(ext.get("estimated_value"))

    return NormalizedProject(
        id=project_id,
        name=name,
        address=None,
        city=city,
        state_province=ext.get("state") or "Unknown",
        country="Canada",
        project_type=ext.get("project_type"),
        description=ext.get("description") or d.get("content", "")[:300],
        status=_map_status(ext.get("status") or ""),
        estimated_value=value,
        tags=[],
        earliest_signal_date=ext.get("signal_date"),
        latest_signal_date=ext.get("signal_date"),
        source_records=[source_rec],
        companies=companies,
        contacts=contacts,
    )


# ─── Main normalize function ──────────────────────────────────────────────────

async def normalize_records(records: List[RawRecord]) -> List[NormalizedProject]:
    """
    Normalize all raw records into NormalizedProject objects.
    Internal DB records are normalized synchronously.
    Web/procurement records are Claude-extracted in a single async batch.
    LinkedIn records use a tailored Claude extraction prompt.
    """
    internal_records   = [r for r in records if r.source_type == SourceType.INTERNAL_DB]
    linkedin_records   = [r for r in records if r.source_type == SourceType.LINKEDIN]
    external_records   = [r for r in records if r.source_type not in (
        SourceType.INTERNAL_DB, SourceType.LINKEDIN
    )]

    # Normalize internal DB records (fast, deterministic)
    normalized: List[NormalizedProject] = []
    for record in internal_records:
        try:
            np = _normalize_internal(record)
            normalized.append(np)
        except Exception as e:
            logger.warning(f"Failed to normalize internal record: {e}")

    # Normalize web/procurement records via Claude
    if external_records:
        extracted_list = await _extract_with_claude(external_records)
        for record, extracted in zip(external_records, extracted_list):
            try:
                np = _normalize_web_record(record, extracted)
                if np:
                    normalized.append(np)
            except Exception as e:
                logger.warning(f"Failed to normalize web record: {e}")

    # Normalize LinkedIn records via LinkedIn-specific Claude prompt
    if linkedin_records:
        extracted_list = await _extract_linkedin_with_claude(linkedin_records)
        for record, extracted in zip(linkedin_records, extracted_list):
            try:
                np = _normalize_linkedin_record(record, extracted)
                if np:
                    normalized.append(np)
            except Exception as e:
                logger.warning(f"Failed to normalize LinkedIn record: {e}")

    return normalized


# ─── Helpers ─────────────────────────────────────────────────────────────────

_CITY_PATTERNS = [
    "kelowna", "west kelowna", "penticton", "vernon", "kamloops",
    "vancouver", "victoria", "surrey", "burnaby", "richmond", "abbotsford",
    "nanaimo", "calgary", "edmonton", "toronto", "ottawa",
]

def _guess_city_from_content(text: str) -> Optional[str]:
    """Fallback city extraction from raw text."""
    text_lower = text.lower()
    for city in _CITY_PATTERNS:
        if city in text_lower:
            return city.title()
    return None


def _safe_float(v) -> Optional[float]:
    try:
        return float(str(v).replace(",", "").replace("$", "")) if v else None
    except (ValueError, TypeError):
        return None


def _safe_int(v) -> Optional[int]:
    try:
        return int(v) if v else None
    except (ValueError, TypeError):
        return None
