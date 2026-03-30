"""
Internal DB Adapter
Queries the existing BuildMapper permit/project database (Supabase or mock).
This is the highest-confidence source — official permit data that the user or
BuildMapper has already ingested and normalized.
"""
from __future__ import annotations
import logging
from datetime import date, timedelta
from typing import List

from db import client as db
from models.scout_models import RawRecord, SourceConfidence, SourceType, UserIntent
from services.scout.adapters.base import BaseAdapter

logger = logging.getLogger(__name__)

# How far back to look for permit signals by default (days)
_DEFAULT_LOOKBACK_DAYS = 180


class InternalDBAdapter(BaseAdapter):
    source_type = SourceType.INTERNAL_DB

    async def fetch(self, intent: UserIntent) -> List[RawRecord]:
        try:
            return await self._fetch(intent)
        except Exception as e:
            logger.error(f"InternalDBAdapter error: {e}", exc_info=True)
            return []

    async def _fetch(self, intent: UserIntent) -> List[RawRecord]:
        # ── Build filter dict from intent ─────────────────────────────────────
        filters: dict = {}

        # Geography
        cities = [g.city for g in intent.geographies if g.city]
        regions = [g.region for g in intent.geographies if g.region]
        states = [g.state for g in intent.geographies if g.state]

        if cities:
            filters["cities"] = cities
        if regions:
            filters["regions"] = regions
        # states not directly supported in current filter but note them

        # Project type / tags
        if intent.project_types:
            filters["permit_types"] = intent.project_types
        if intent.project_classes:
            filters["project_classes"] = intent.project_classes

        # Value
        if intent.value_min:
            filters["min_value"] = intent.value_min
        if intent.value_max:
            filters["max_value"] = intent.value_max

        # Recency — use urgency as a signal for how far back to look
        if intent.urgency.value == "urgent":
            lookback = 30
        elif intent.urgency.value == "future":
            lookback = 365
        else:
            lookback = _DEFAULT_LOOKBACK_DAYS

        cutoff = (date.today() - timedelta(days=lookback)).isoformat()
        filters["date_from"] = cutoff

        # ── Query DB ──────────────────────────────────────────────────────────
        projects = db.get_projects_filtered(**filters)

        if not projects:
            return []

        # ── Convert to RawRecord ──────────────────────────────────────────────
        records: List[RawRecord] = []
        for p in projects:
            # Confidence: issued permit with contacts → HIGH, otherwise MEDIUM
            has_contact = bool(
                p.get("contractor_email") or p.get("contractor_phone")
                or p.get("applicant_email") or p.get("applicant_phone")
            )
            confidence = SourceConfidence.HIGH if has_contact else SourceConfidence.MEDIUM

            records.append(RawRecord(
                source_type=SourceType.INTERNAL_DB,
                confidence=confidence,
                raw_data=p,
                source_url=None,
                source_date=p.get("issued_date"),
            ))

        logger.info(f"InternalDBAdapter: {len(records)} records for '{intent.raw_query[:50]}'")
        return records
