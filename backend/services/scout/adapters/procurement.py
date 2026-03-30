"""
Procurement Adapter
Searches for public construction tenders, RFPs, RFQs, and bid opportunities.
Uses Tavily to search procurement portals: Merx, BidNet, BC Bid, public agency pages.

Activated when:
  - work_type == PUBLIC
  - Query contains tender/rfp/bid/government/institutional signals

Confidence: MEDIUM (structured tender data), LOW (web mentions of tenders).
"""
from __future__ import annotations
import logging
import os
from typing import List

import httpx

from models.scout_models import RawRecord, SourceConfidence, SourceType, UserIntent
from services.scout.adapters.base import BaseAdapter

logger = logging.getLogger(__name__)

_TAVILY_URL = "https://api.tavily.com/search"

# Known procurement portals — used for domain targeting and confidence elevation
_PROCUREMENT_DOMAINS = [
    "merx.com",
    "bids.bonfire.com",
    "bcbid.gov.bc.ca",
    "bclaws.ca",
    "canada.ca/en/public-services",
    "buying.dla.mil",
    "buyandsell.gc.ca",
    "bonfirehub.com",
    "bidnet.com",
    "planetbids.com",
    "myhamilton.ca",
    "rfp.ca",
]

_MAX_RESULTS = 5


class ProcurementAdapter(BaseAdapter):
    source_type = SourceType.PROCUREMENT

    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY")

    async def fetch(self, intent: UserIntent) -> List[RawRecord]:
        if not self.api_key:
            logger.warning("ProcurementAdapter: TAVILY_API_KEY not set — skipping")
            return []
        try:
            return await self._fetch(intent)
        except Exception as e:
            logger.error(f"ProcurementAdapter error: {e}", exc_info=True)
            return []

    async def _fetch(self, intent: UserIntent) -> List[RawRecord]:
        queries = self._build_queries(intent)
        records: List[RawRecord] = []

        async with httpx.AsyncClient(timeout=20.0) as client:
            for query in queries[:2]:  # limit to 2 queries for procurement
                try:
                    response = await client.post(
                        _TAVILY_URL,
                        json={
                            "api_key": self.api_key,
                            "query": query,
                            "search_depth": "basic",
                            "max_results": _MAX_RESULTS,
                            "include_answer": False,
                            "include_raw_content": False,
                        },
                    )
                    response.raise_for_status()
                    data = response.json()

                    for result in data.get("results", []):
                        url = result.get("url", "")
                        confidence = (
                            SourceConfidence.MEDIUM
                            if self._is_procurement_portal(url)
                            else SourceConfidence.LOW
                        )
                        records.append(RawRecord(
                            source_type=SourceType.PROCUREMENT,
                            confidence=confidence,
                            raw_data={
                                "title":   result.get("title", ""),
                                "url":     url,
                                "content": result.get("content", ""),
                                "score":   result.get("score", 0),
                                "query":   query,
                            },
                            source_url=url,
                            source_date=None,
                        ))
                except Exception as e:
                    logger.warning(f"ProcurementAdapter query '{query[:60]}' failed: {e}")

        logger.info(f"ProcurementAdapter: {len(records)} records")
        return records

    def _build_queries(self, intent: UserIntent) -> List[str]:
        geo = self._geo_string(intent)
        trade = " ".join(intent.trade_categories[:2]) if intent.trade_categories else ""
        ptype = " ".join(intent.project_types[:2]) if intent.project_types else "construction"

        q1_parts = ["construction tender RFP"]
        if trade:
            q1_parts.append(trade)
        q1_parts.append(ptype)
        q1_parts.append(geo)
        q1_parts.append("2025")
        q1 = " ".join(q1_parts)

        q2 = f"bid opportunity {ptype} {geo} site:merx.com OR site:bcbid.gov.bc.ca OR site:bonfirehub.com"

        return [q1, q2]

    def _geo_string(self, intent: UserIntent) -> str:
        parts = []
        for geo in intent.geographies[:2]:
            geo_parts = [p for p in [geo.city, geo.region, geo.state] if p]
            if geo_parts:
                parts.append(" ".join(geo_parts))
        return " ".join(parts) if parts else "Canada"

    def _is_procurement_portal(self, url: str) -> bool:
        url_lower = url.lower()
        return any(domain in url_lower for domain in _PROCUREMENT_DOMAINS)
