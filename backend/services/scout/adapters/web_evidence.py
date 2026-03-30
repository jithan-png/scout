"""
Web Evidence Adapter
Uses Tavily to search for open web construction project signals.
Covers: municipal portals, developer sites, architect pages, press releases,
planning notices, council attachments, and project-specific web content.

Confidence starts at LOW. If Claude can extract clean structured data from the
content, it may be elevated to MEDIUM after normalization.
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

# Domains that indicate official/high-quality sources for construction signals
_GOV_DOMAINS = [
    "kelowna.ca", "westkelowna.ca", "penticton.ca", "vernoncity.ca",
    "kamloops.ca", "vancouver.ca", "victoria.ca", "surrey.ca", "burnaby.ca",
    "abbotsford.ca", "richmond.bc.ca", "delta.ca", "langley.bc.ca",
    "nanaimo.ca", "coquitlam.ca", "nv.ca", "westvancouver.ca",
    # Generic municipal patterns
    "*.ca", "*.gov", "*.bc.ca",
]

# Max results per query — limit to control cost and latency
_MAX_RESULTS_PER_QUERY = 5
_MAX_QUERIES = 3


class WebEvidenceAdapter(BaseAdapter):
    source_type = SourceType.WEB_EVIDENCE

    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY")

    async def fetch(self, intent: UserIntent) -> List[RawRecord]:
        if not self.api_key:
            logger.warning("WebEvidenceAdapter: TAVILY_API_KEY not set — skipping")
            return []
        try:
            return await self._fetch(intent)
        except Exception as e:
            logger.error(f"WebEvidenceAdapter error: {e}", exc_info=True)
            return []

    async def _fetch(self, intent: UserIntent) -> List[RawRecord]:
        queries = self._build_queries(intent)
        records: List[RawRecord] = []

        async with httpx.AsyncClient(timeout=20.0) as client:
            for query in queries[:_MAX_QUERIES]:
                try:
                    response = await client.post(
                        _TAVILY_URL,
                        json={
                            "api_key": self.api_key,
                            "query": query,
                            "search_depth": "basic",
                            "max_results": _MAX_RESULTS_PER_QUERY,
                            "include_answer": False,
                            "include_raw_content": False,
                        },
                    )
                    response.raise_for_status()
                    data = response.json()

                    for result in data.get("results", []):
                        url = result.get("url", "")
                        # Elevate confidence for official domains
                        confidence = (
                            SourceConfidence.MEDIUM
                            if self._is_official_domain(url)
                            else SourceConfidence.LOW
                        )
                        records.append(RawRecord(
                            source_type=SourceType.WEB_EVIDENCE,
                            confidence=confidence,
                            raw_data={
                                "title":   result.get("title", ""),
                                "url":     url,
                                "content": result.get("content", ""),
                                "score":   result.get("score", 0),
                                "query":   query,
                            },
                            source_url=url,
                            source_date=None,  # will be inferred during normalization
                        ))
                except Exception as e:
                    logger.warning(f"WebEvidenceAdapter query '{query[:60]}' failed: {e}")
                    continue

        logger.info(f"WebEvidenceAdapter: {len(records)} records for '{intent.raw_query[:50]}'")
        return records

    def _build_queries(self, intent: UserIntent) -> List[str]:
        """
        Build targeted Tavily search queries from intent.
        Generates up to 3 complementary queries to maximize signal diversity.
        """
        geo_str = self._geo_string(intent)
        trade_str = " ".join(intent.trade_categories[:2]) if intent.trade_categories else ""
        type_str = " ".join(intent.project_types[:2]) if intent.project_types else "construction"

        queries = []

        # Query 1: Permit / development record signal
        q1_parts = []
        if trade_str:
            q1_parts.append(trade_str)
        q1_parts.append(f"{type_str} construction permit {geo_str}")
        q1_parts.append("2024 OR 2025")
        queries.append(" ".join(q1_parts))

        # Query 2: Project evidence (developer / builder / press)
        q2_parts = [f"{type_str} development project {geo_str}"]
        if trade_str:
            q2_parts.append(trade_str)
        q2_parts.append("announced approved site")
        queries.append(" ".join(q2_parts))

        # Query 3: Official municipal / planning portal
        q3_parts = [f"building permit application {geo_str}"]
        if type_str != "construction":
            q3_parts.append(type_str)
        q3_parts.append("site:.ca OR site:.gov")
        queries.append(" ".join(q3_parts))

        return [q.strip() for q in queries if q.strip()]

    def _geo_string(self, intent: UserIntent) -> str:
        """Build a geography string for use in search queries."""
        parts = []
        for geo in intent.geographies[:2]:
            geo_parts = [p for p in [geo.city, geo.region, geo.state] if p]
            if geo_parts:
                parts.append(" ".join(geo_parts))
        return " ".join(parts) if parts else "Canada"

    def _is_official_domain(self, url: str) -> bool:
        """Check if URL belongs to a government or municipal domain."""
        url_lower = url.lower()
        official_patterns = [".gc.ca", ".gov.bc.ca", ".bc.ca/", "city.ca", "kelowna.ca",
                              "westkelowna.ca", "penticton.ca", ".gov/", "municipality"]
        return any(p in url_lower for p in official_patterns)
