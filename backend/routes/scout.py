"""
Scout Routes
  GET  /api/scout/briefing  — daily proactive briefing (existing)
  POST /api/scout/run       — on-demand multi-source opportunity search (new)
"""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db import client as db
from services.auth import get_optional_user
from engine.claude_client import chat as claude_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scout", tags=["scout"])

_STALE_DAYS = 10  # pipeline deals with no activity for this many days get flagged


# ─── Scout Run (v2) ──────────────────────────────────────────────────────────

class ScoutRunRequest(BaseModel):
    query: str
    user_id: str = "demo-user"


@router.post("/run")
async def run_scout(request: ScoutRunRequest) -> dict:
    """
    On-demand Scout search.
    Parses intent, selects sources, gathers evidence, normalizes,
    resolves entities, scores, checks relationships, returns ranked opportunities.
    """
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="query is required")

    from services.scout.pipeline import run as scout_run

    try:
        result = await scout_run(
            user_id=request.user_id,
            query=request.query.strip(),
        )
        return result.model_dump(mode="json")
    except Exception as e:
        logger.error(f"Scout run failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scout run failed: {str(e)}")


def _greeting() -> str:
    hour = datetime.now().hour
    if hour < 12:
        return "Good morning"
    if hour < 17:
        return "Good afternoon"
    return "Good evening"


@router.get("/briefing")
async def get_briefing(current_user=Depends(get_optional_user)) -> dict:
    """
    Returns a Scout daily briefing dict:
    { briefing: str, new_permits: list, stale_deals: list, new_permits_count: int, stale_deals_count: int }
    """
    user_id = str(current_user.id) if current_user else None

    # ── Gather data ───────────────────────────────────────────────────────────

    # Recent permits (last 14 days)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).strftime("%Y-%m-%d")
    recent_permits = []
    try:
        all_permits = db.get_projects_filtered(date_from=cutoff)
        recent_permits = all_permits[:10]  # top 10 most recent
    except Exception:
        pass

    # User profile for personalization
    profile = None
    if user_id:
        try:
            profile = db.get_user_profile(user_id)
        except Exception:
            pass

    # Pipeline — find stale deals (no activity for _STALE_DAYS days)
    stale_deals = []
    try:
        pipeline = db.get_pipeline()
        now = datetime.now(timezone.utc)
        for entry in pipeline:
            if entry.get("stage") in ("won", "lost"):
                continue
            last_activity = entry.get("last_activity_at") or entry.get("created_at")
            if not last_activity:
                continue
            try:
                last_dt = datetime.fromisoformat(str(last_activity).replace("Z", "+00:00"))
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                days_idle = (now - last_dt).days
                if days_idle >= _STALE_DAYS:
                    stale_deals.append({**entry, "_days_idle": days_idle})
            except Exception:
                pass
    except Exception:
        pass

    # ── Build briefing via Claude ──────────────────────────────────────────────

    profile_summary = ""
    if profile:
        trade = profile.get("trade_type") or profile.get("business_type") or ""
        cities = profile.get("cities") or profile.get("target_cities") or []
        if isinstance(cities, list):
            cities = ", ".join(cities)
        if trade:
            profile_summary = f"User sells/does: {trade}. Target cities: {cities}."

    permits_summary = ""
    if recent_permits:
        lines = []
        for p in recent_permits[:5]:
            val = p.get("value") or p.get("construction_value") or 0
            val_str = f"${val:,.0f}" if val else "value unknown"
            lines.append(
                f"- {p.get('permit_type','permit').replace('_',' ').title()} at {p.get('address','unknown')}, "
                f"{p.get('city','')}, {val_str}, builder: {p.get('contractor_name') or 'no contractor listed'}"
            )
        permits_summary = "\n".join(lines)

    stale_summary = ""
    if stale_deals:
        lines = []
        for d in stale_deals[:3]:
            lines.append(
                f"- {d.get('company_name') or d.get('project_address') or 'deal'} "
                f"(stage: {d.get('stage','unknown')}, {d.get('_days_idle',0)} days idle)"
            )
        stale_summary = "\n".join(lines)

    prompt = f"""You are Scout, a construction sales intelligence assistant built into BuildMapper.

Generate a short, punchy daily briefing. Write it in first person as Scout talking to the user.
Tone: direct, confident, like a sharp sales colleague giving a morning rundown — not a bot.
Max 4 sentences. No bullet points. No headers. No "Here is your briefing:" intro.

{f'Context about this user: {profile_summary}' if profile_summary else ''}

Recent permits in their area (last 14 days):
{permits_summary if permits_summary else 'No new permits in the last 14 days.'}

Pipeline deals that need attention (no activity for {_STALE_DAYS}+ days):
{stale_summary if stale_summary else 'All pipeline deals are up to date.'}

Start with "{_greeting()}." then give the rundown. End with one concrete action suggestion."""

    briefing_text = ""
    try:
        briefing_text = await claude_chat(prompt, system="You are Scout, a construction sales intelligence assistant. Write concise, direct briefings in plain prose — no bullet points, no headers.")
    except Exception as e:
        logger.warning(f"Claude briefing failed: {e}")

    # Fallback if Claude fails
    if not briefing_text:
        greeting = _greeting()
        if recent_permits:
            p = recent_permits[0]
            val = p.get("value") or p.get("construction_value") or 0
            val_str = f"${val:,.0f}" if val else ""
            briefing_text = (
                f"{greeting}. I found {len(recent_permits)} new permits in your area — "
                f"the top one is a {p.get('permit_type','').replace('_',' ')} at {p.get('address','')}, {p.get('city','')} {val_str}. "
            )
            if stale_deals:
                briefing_text += f"You also have {len(stale_deals)} pipeline deal{'s' if len(stale_deals) > 1 else ''} that haven't moved in a while. "
            briefing_text += "Want to review the top opportunities?"
        else:
            briefing_text = (
                f"{greeting}. I'm scanning your market for new permit activity. "
                "Ask me to find leads in any city, research a company, or help you draft outreach."
            )

    return {
        "briefing": briefing_text,
        "new_permits_count": len(recent_permits),
        "stale_deals_count": len(stale_deals),
        "new_permits": recent_permits[:5],
        "stale_deals": [
            {"project_id": d.get("project_id"), "company": d.get("company_name") or d.get("project_address"), "stage": d.get("stage"), "days_idle": d.get("_days_idle")}
            for d in stale_deals[:3]
        ],
    }
