"""
LinkedIn Signal Adapter
Uses Tavily to search for public LinkedIn posts that mention construction projects.
When someone posts about a new project, breaking ground, a project award, or an RFP
on LinkedIn, that is a valuable early signal — often before a formal permit is filed.

Confidence: LOW (public scrape, no authentication).
Elevated to MEDIUM if the poster can be matched to a known contact.

poster_name and poster_company are extracted from the LinkedIn URL structure
and the snippet content where possible.
"""
from __future__ import annotations
import asyncio
import logging
import os
import re
from typing import List, Optional, Tuple

import httpx

from models.scout_models import RawRecord, SourceConfidence, SourceType, UserIntent
from services.scout.adapters.base import BaseAdapter

logger = logging.getLogger(__name__)

_TAVILY_URL = "https://api.tavily.com/search"
_MAX_RESULTS_PER_QUERY = 5
_MAX_TOTAL = 8


class LinkedInAdapter(BaseAdapter):
    source_type = SourceType.LINKEDIN

    def __init__(self):
        self.api_key = os.getenv("TAVILY_API_KEY")

    async def fetch(self, intent: UserIntent) -> List[RawRecord]:
        if not self.api_key:
            logger.warning("LinkedInAdapter: TAVILY_API_KEY not set — skipping")
            return []
        try:
            return await self._fetch(intent)
        except Exception as e:
            logger.error(f"LinkedInAdapter error: {e}", exc_info=True)
            return []

    async def _fetch(self, intent: UserIntent) -> List[RawRecord]:
        queries = self._build_queries(intent)

        async def _run_query(client: httpx.AsyncClient, query: str) -> List[RawRecord]:
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
                results = []
                for result in response.json().get("results", []):
                    url = result.get("url", "")
                    if "linkedin.com" not in url.lower():
                        continue
                    content = result.get("content", "")
                    title = result.get("title", "")
                    poster_name, poster_company = self._extract_poster(url, title, content)
                    results.append(RawRecord(
                        source_type=SourceType.LINKEDIN,
                        confidence=SourceConfidence.LOW,
                        raw_data={
                            "title": title,
                            "url": url,
                            "content": content,
                            "score": result.get("score", 0),
                            "query": query,
                            "linkedin_post_url": url if "/posts/" in url or "/feed/" in url else None,
                            "poster_name": poster_name,
                            "poster_company": poster_company,
                        },
                        source_url=url,
                        source_date=None,
                    ))
                return results
            except Exception as e:
                logger.warning(f"LinkedInAdapter query failed: {e}")
                return []

        async with httpx.AsyncClient(timeout=20.0) as client:
            batch = await asyncio.gather(*[_run_query(client, q) for q in queries])

        # Deduplicate by URL and cap at _MAX_TOTAL
        seen_urls: set[str] = set()
        records: List[RawRecord] = []
        for sublist in batch:
            for r in sublist:
                if r.source_url not in seen_urls and len(records) < _MAX_TOTAL:
                    seen_urls.add(r.source_url)
                    records.append(r)

        logger.info(f"LinkedInAdapter: {len(records)} records for '{intent.raw_query[:50]}'")
        return records

    def _build_queries(self, intent: UserIntent) -> List[str]:
        geo_str = self._geo_string(intent)
        trade_str = " ".join(intent.trade_categories[:2]) if intent.trade_categories else "construction"
        type_str = " ".join(intent.project_types[:2]) if intent.project_types else ""

        queries = []

        # Query 1: Project announcements and awards
        parts = [f'site:linkedin.com "{geo_str}"']
        if trade_str:
            parts.append(f'"{trade_str}"')
        parts.append("construction project")
        queries.append(" ".join(parts))

        # Query 2: Breaking ground / new project signals
        parts2 = [f'site:linkedin.com "breaking ground" OR "project awarded" OR "new project" OR "RFP"']
        parts2.append(f'"{geo_str}"')
        if type_str:
            parts2.append(type_str)
        queries.append(" ".join(parts2))

        return queries

    def _geo_string(self, intent: UserIntent) -> str:
        parts = []
        for geo in intent.geographies[:2]:
            geo_parts = [p for p in [geo.city, geo.region, geo.state] if p]
            if geo_parts:
                parts.append(geo_parts[0])  # Use most specific geo term
        return parts[0] if parts else "Canada"

    def _extract_poster(
        self, url: str, title: str, content: str
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Attempt to extract the poster's name and company from the LinkedIn URL
        and the snippet content.

        LinkedIn profile URLs look like:
          linkedin.com/in/john-smith-abc123/
        Post URLs sometimes include the author's profile slug.
        """
        poster_name: Optional[str] = None
        poster_company: Optional[str] = None

        # Try to extract name from /in/{slug}/ in the URL
        slug_match = re.search(r"/in/([a-z0-9-]+)/", url.lower())
        if slug_match:
            slug = slug_match.group(1)
            # Remove trailing numeric IDs (e.g. "john-smith-3b5a2")
            slug = re.sub(r"-[a-f0-9]{5,}$", "", slug)
            # Convert slug to Title Case name
            parts = slug.split("-")
            # Only treat as a name if 2–4 parts (first/last or first/middle/last)
            if 2 <= len(parts) <= 4 and all(p.isalpha() for p in parts):
                poster_name = " ".join(p.capitalize() for p in parts)

        # Try to extract company from title or content patterns like "at CompanyName"
        if not poster_company:
            # "John Smith at BuildRight Construction" or "John Smith • BuildRight"
            for pattern in [
                r"(?:at|@)\s+([A-Z][A-Za-z0-9 &\-\.]{2,40}(?:Ltd|Inc|Corp|Co|Construction|Group|Builders)?)",
                r"([A-Z][A-Za-z0-9 &\-\.]{2,40}(?:Construction|Builders|Group|Contracting|Industries))",
            ]:
                m = re.search(pattern, title + " " + content[:300])
                if m:
                    poster_company = m.group(1).strip()
                    break

        return poster_name, poster_company
