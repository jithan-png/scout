"""
Scout Pipeline
Main orchestrator. Runs the full scout sequence for a given user query:

  1. Parse intent (Claude or keyword fallback)
  2. Select sources
  3. Gather raw evidence in parallel (all adapters fire simultaneously)
  4. Normalize all raw records
  5. Resolve entities (dedup across sources)
  6. Score each project × intent
  7. Check relationship warmth (batched, runs in parallel with scoring)
  8. Build Opportunity objects
  9. Sort and return top N

The pipeline is designed to be resilient — each stage catches its own errors
and degrades gracefully rather than failing the whole run.
"""
from __future__ import annotations
import asyncio
import logging
import time
from typing import List

from models.scout_models import (
    Opportunity, ScoutResult, SourceType, UserIntent,
)
from services.scout import intent_parser, source_selector
from services.scout.adapters.internal_db   import InternalDBAdapter
from services.scout.adapters.web_evidence  import WebEvidenceAdapter
from services.scout.adapters.procurement   import ProcurementAdapter
from services.scout.adapters.linkedin_adapter import LinkedInAdapter
from services.scout.normalizer             import normalize_records
from services.scout.entity_resolver        import resolve_projects
from services.scout.relationship_intel     import check_relationship
from services.scout.scorer                 import score_opportunity
from services.scout.opportunity_builder    import build_opportunity

logger = logging.getLogger(__name__)

_MAX_RESULTS = 20

# Adapter registry — keyed by SourceType
_ADAPTERS = {
    SourceType.INTERNAL_DB:   InternalDBAdapter(),
    SourceType.WEB_EVIDENCE:  WebEvidenceAdapter(),
    SourceType.PROCUREMENT:   ProcurementAdapter(),
    SourceType.LINKEDIN:      LinkedInAdapter(),
}


async def run(user_id: str, query: str) -> ScoutResult:
    """
    Execute the full Scout pipeline for a natural language query.
    Returns a ScoutResult with ranked opportunities and metadata.
    """
    t0 = time.monotonic()

    # ── Step 1: Parse intent ─────────────────────────────────────────────────
    try:
        intent = await intent_parser.parse_intent(query)
    except Exception as e:
        logger.error(f"Intent parsing failed: {e}")
        from models.scout_models import WarmthPreference, WorkType, Urgency
        intent = UserIntent(raw_query=query, parsed_by="error")

    # ── Step 2: Select sources ───────────────────────────────────────────────
    source_types = source_selector.select_sources(intent)

    # ── Step 3: Gather raw evidence (all adapters in parallel) ───────────────
    adapter_tasks = [
        _ADAPTERS[st].fetch(intent)
        for st in source_types
        if st in _ADAPTERS
    ]
    raw_results = await asyncio.gather(*adapter_tasks, return_exceptions=True)

    all_raw_records = []
    sources_used: List[str] = []
    for st, result in zip(source_types, raw_results):
        if isinstance(result, Exception):
            logger.warning(f"Adapter {st.value} raised: {result}")
            continue
        if result:
            all_raw_records.extend(result)
            sources_used.append(st.value)

    if not all_raw_records:
        return ScoutResult(
            intent=intent,
            opportunities=[],
            sources_used=sources_used,
            coverage_note="No results found for this query. Try broadening your geography or trade category.",
            elapsed_ms=int((time.monotonic() - t0) * 1000),
        )

    # ── Step 4: Normalize ────────────────────────────────────────────────────
    try:
        normalized = await normalize_records(all_raw_records)
    except Exception as e:
        logger.error(f"Normalization failed: {e}", exc_info=True)
        normalized = []

    if not normalized:
        return ScoutResult(
            intent=intent,
            opportunities=[],
            sources_used=sources_used,
            coverage_note="Results found but could not be processed. Please try again.",
            elapsed_ms=int((time.monotonic() - t0) * 1000),
        )

    # ── Step 5: Entity resolution (dedup across sources) ─────────────────────
    try:
        resolved = resolve_projects(normalized)
    except Exception as e:
        logger.warning(f"Entity resolution failed: {e} — using un-resolved records")
        resolved = normalized

    # ── Step 6: Score each project (sync, fast) ───────────────────────────────
    scored: List[tuple] = []
    for project in resolved:
        try:
            sc = score_opportunity(project, intent, _dummy_relationship())
            scored.append((project, sc))
        except Exception as e:
            logger.debug(f"Scoring failed for project {project.id}: {e}")

    # Sort by score to run relationship checks only on the top candidates
    scored.sort(key=lambda x: x[1].total, reverse=True)
    top_candidates = scored[:_MAX_RESULTS]

    # ── Step 7: Relationship intelligence (parallel) ──────────────────────────
    rel_tasks = [
        check_relationship(user_id, project)
        for project, _ in top_candidates
    ]
    rel_results = await asyncio.gather(*rel_tasks, return_exceptions=True)

    # ── Step 8: Re-score with relationship and build opportunities ─────────────
    opportunities: List[Opportunity] = []
    for (project, _), rel_result in zip(top_candidates, rel_results):
        if isinstance(rel_result, Exception):
            logger.debug(f"Relationship check failed: {rel_result}")
            from models.scout_models import RelationshipContext
            rel = RelationshipContext()
        else:
            rel = rel_result

        try:
            # Final score includes relationship dimension
            final_score = score_opportunity(project, intent, rel)
            opp = build_opportunity(project, final_score, rel, intent)
            opportunities.append(opp)
        except Exception as e:
            logger.warning(f"Opportunity build failed for {project.id}: {e}")

    # ── Step 9: Sort and return ───────────────────────────────────────────────
    opportunities.sort(key=lambda o: o.score.total, reverse=True)

    elapsed_ms = int((time.monotonic() - t0) * 1000)
    logger.info(
        f"Scout run complete: query='{query[:60]}' "
        f"raw={len(all_raw_records)} normalized={len(normalized)} "
        f"resolved={len(resolved)} opportunities={len(opportunities)} "
        f"elapsed={elapsed_ms}ms"
    )

    return ScoutResult(
        intent=intent,
        opportunities=opportunities[:_MAX_RESULTS],
        sources_used=sources_used,
        coverage_note=source_selector.coverage_note(intent, sources_used),
        elapsed_ms=elapsed_ms,
    )


def _dummy_relationship():
    """Placeholder relationship context used during initial scoring pass."""
    from models.scout_models import RelationshipContext
    return RelationshipContext()
