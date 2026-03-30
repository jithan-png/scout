"""
Database client.
Routes to Supabase (real) or mock_db (in-memory) based on USE_REAL_DB env var.
"""
import os
from typing import List, Dict, Any, Optional

USE_REAL_DB = os.getenv("USE_REAL_DB", "false").lower() == "true"

if USE_REAL_DB:
    from supabase import create_client, Client
    # Use service role key for backend — bypasses RLS for server-to-server calls.
    # Falls back to anon key if service role key is not set.
    _supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    try:
        from supabase.lib.client_options import ClientOptions as _ClientOptions
        _supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            _supabase_key,
            options=_ClientOptions(postgrest_client_timeout=10),
        )
    except Exception:
        _supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            _supabase_key,
        )


# ─── Projects ─────────────────────────────────────────────────────────────────

def upsert_projects(projects: List[Dict[str, Any]], batch_id: Optional[str] = None) -> Dict[str, int]:
    """Insert or update projects with dedup. Returns { inserted, updated }."""
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.upsert_projects(projects, batch_id=batch_id)

    # Deduplicate within the batch by composite key before upserting
    seen = {}
    for p in projects:
        if batch_id:
            p["import_batch_id"] = batch_id
        key = f"{p.get('address','')}-{p.get('city','')}-{p.get('issued_date','')}"
        seen[key] = p
    deduped = list(seen.values())

    # Insert in chunks of 50 to avoid Supabase batch limits
    total = 0
    for i in range(0, len(deduped), 50):
        chunk = deduped[i:i+50]
        res = _supabase.table("projects").upsert(chunk, on_conflict="address,city,issued_date").execute()
        total += len(res.data)

    return {"inserted": total, "updated": 0}


def insert_projects(projects: List[Dict[str, Any]]) -> int:
    """Legacy insert — no dedup. Kept for backward compatibility."""
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.insert_projects(projects)

    res = _supabase.table("projects").insert(projects).execute()
    return len(res.data)


# ─── Import Batches ───────────────────────────────────────────────────────────

def insert_import_batch(batch: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.insert_import_batch(batch)

    try:
        res = _supabase.table("import_batches").insert(batch).execute()
        return res.data[0] if res.data else batch
    except Exception:
        return batch  # table may not exist yet — uploads still work


def update_import_batch(batch_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_import_batch(batch_id, updates)

    try:
        res = _supabase.table("import_batches").update(updates).eq("id", batch_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None  # table may not exist yet


def search_projects_fts(
    text_query: str,
    city: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    days_limit: Optional[int] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Server-side full-text search using the projects.search_vector tsvector column.
    Only available when USE_REAL_DB=True (falls back to get_all_projects() in mock mode).
    Avoids loading the full table into Python memory for text searches.
    """
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_all_projects()

    try:
        q = _supabase.table("projects").select("*")

        # Full-text search (requires migration 004 to have run)
        if text_query:
            q = q.text_search("search_vector", text_query, config="english")

        # Pre-filter at DB level
        if city:
            q = q.ilike("city", city)
        if min_value is not None:
            q = q.gte("value", min_value)
        if max_value is not None:
            q = q.lte("value", max_value)
        if days_limit is not None:
            from datetime import date, timedelta
            cutoff = (date.today() - timedelta(days=days_limit)).isoformat()
            q = q.gte("issued_date", cutoff)

        q = q.order("issued_date", desc=True).limit(limit)
        res = q.execute()
        return res.data or []
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"search_projects_fts failed, falling back to get_all_projects: {e}")
        return get_all_projects()


def get_all_projects() -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_all_projects()

    # Supabase caps at 1000 rows per request — paginate to get all
    all_rows: List[Dict[str, Any]] = []
    page_size = 1000
    offset = 0
    while True:
        res = (
            _supabase.table("projects")
            .select("*")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = res.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


def get_projects_filtered(
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    project_type: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    builder_company: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_projects_filtered(
            user_id=user_id, search=search, project_type=project_type, status=status,
            city=city, region=region, builder_company=builder_company,
            min_value=min_value, max_value=max_value, date_from=date_from, date_to=date_to,
        )
    try:
        q = _supabase.table("projects").select("*")
        if user_id:
            q = q.eq("user_id", user_id)
        if search:
            q = q.or_(f"address.ilike.%{search}%,city.ilike.%{search}%,contractor_name.ilike.%{search}%,description.ilike.%{search}%")
        if project_type:
            q = q.ilike("permit_type", project_type)
        if status:
            q = q.ilike("status", status)
        if city:
            q = q.ilike("city", city)
        if region:
            q = q.ilike("region", region)
        if builder_company:
            q = q.ilike("contractor_name", f"%{builder_company}%")
        if min_value is not None:
            q = q.gte("value", min_value)
        if max_value is not None:
            q = q.lte("value", max_value)
        if date_from:
            q = q.gte("issued_date", date_from)
        if date_to:
            q = q.lte("issued_date", date_to)
        res = q.order("issued_date", desc=True).execute()
        return res.data or []
    except Exception:
        return []


def update_project_coords(project_id: str, lat: float, lng: float) -> None:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_project_coords(project_id, lat, lng)
    try:
        _supabase.table("projects").update({"lat": lat, "lng": lng}).eq("id", project_id).execute()
    except Exception:
        pass


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_project(project_id)

    res = _supabase.table("projects").select("*").eq("id", project_id).single().execute()
    return res.data


# ─── Pipeline ─────────────────────────────────────────────────────────────────

def get_pipeline() -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_pipeline()
    res = _supabase.table("pipeline_entries").select("*").execute()
    return res.data or []


def add_to_pipeline(entry: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.add_to_pipeline(entry)
    res = _supabase.table("pipeline_entries").upsert(entry, on_conflict="project_id").execute()
    return res.data[0] if res.data else entry


def update_pipeline_entry(project_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_pipeline_entry(project_id, updates)
    res = _supabase.table("pipeline_entries").update(updates).eq("project_id", project_id).execute()
    return res.data[0] if res.data else None


def remove_from_pipeline(project_id: str) -> bool:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.remove_from_pipeline(project_id)
    _supabase.table("pipeline_entries").delete().eq("project_id", project_id).execute()
    return True


# ─── Agents ───────────────────────────────────────────────────────────────────

def insert_agent(agent: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.insert_agent(agent)

    res = _supabase.table("agents").insert(agent).execute()
    return res.data[0] if res.data else agent


def get_all_agents() -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_all_agents()

    res = _supabase.table("agents").select("*").execute()
    return res.data or []


def get_agent(agent_id: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_agent(agent_id)

    res = _supabase.table("agents").select("*").eq("id", agent_id).single().execute()
    return res.data


def update_agent(agent_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_agent(agent_id, updates)

    res = _supabase.table("agents").update(updates).eq("id", agent_id).execute()
    return res.data[0] if res.data else None


# ─── Conversations & Messages ─────────────────────────────────────────────────

def insert_message(message: Dict[str, Any], access_token: Optional[str] = None) -> Dict[str, Any]:
    """Persist a single chat message (user or assistant) to Supabase."""
    if not USE_REAL_DB:
        return message  # no-op in mock mode
    try:
        if access_token:
            # Use an authenticated client so Supabase RLS policies are satisfied
            authed = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
            authed.postgrest.auth(access_token)
            res = authed.table("messages").insert(message).execute()
        else:
            res = _supabase.table("messages").insert(message).execute()
        return res.data[0] if res.data else message
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"insert_message failed: {e}")
        return message


def get_messages(conversation_id: str) -> List[Dict[str, Any]]:
    """Return all messages for a conversation, oldest first."""
    if not USE_REAL_DB:
        return []
    res = (
        _supabase.table("messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )
    return res.data or []


def list_conversations(user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    """Return the most recent conversations for a user."""
    if not USE_REAL_DB:
        return []
    res = (
        _supabase.table("conversations")
        .select("id, title, updated_at, created_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


# ─── Emails ───────────────────────────────────────────────────────────────────

def insert_email(email: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.insert_email(email)

    res = _supabase.table("emails").insert(email).execute()
    return res.data[0] if res.data else email


def get_all_emails() -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_all_emails()

    res = _supabase.table("emails").select("*").execute()
    return res.data or []


# ─── User Profiles ─────────────────────────────────────────────────────────────

def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_user_profile(user_id)
    try:
        res = _supabase.table("user_profiles").select("*").eq("user_id", user_id).single().execute()
        return res.data
    except Exception:
        return None


def upsert_user_profile(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.upsert_user_profile(user_id, data)
    try:
        payload = {**data, "user_id": user_id}
        res = _supabase.table("user_profiles").upsert(payload, on_conflict="user_id").execute()
        return res.data[0] if res.data else payload
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"upsert_user_profile failed: {e}")
        return data


# ─── Discovery Jobs ─────────────────────────────────────────────────────────────

def insert_discovery_job(job: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.insert_discovery_job(job)
    try:
        res = _supabase.table("discovery_jobs").insert(job).execute()
        return res.data[0] if res.data else job
    except Exception:
        return job


def update_discovery_job(job_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_discovery_job(job_id, updates)
    try:
        res = _supabase.table("discovery_jobs").update(updates).eq("id", job_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def get_discovery_job(job_id: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_discovery_job(job_id)
    try:
        res = _supabase.table("discovery_jobs").select("*").eq("id", job_id).single().execute()
        return res.data
    except Exception:
        return None


def get_discovery_job_by_city(city: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_discovery_job_by_city(city)
    try:
        res = (
            _supabase.table("discovery_jobs")
            .select("*")
            .ilike("city", city)
            .neq("status", "failed")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception:
        return None


# ─── Activities ────────────────────────────────────────────────────────────────

def insert_activity(activity: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.insert_activity(activity)
    try:
        res = _supabase.table("pipeline_activities").insert(activity).execute()
        return res.data[0] if res.data else activity
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"insert_activity failed: {e}")
        return activity


def get_activities_for_entry(pipeline_entry_id: str) -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_activities_for_entry(pipeline_entry_id)
    try:
        res = (
            _supabase.table("pipeline_activities")
            .select("*")
            .eq("pipeline_entry_id", pipeline_entry_id)
            .order("created_at", desc=False)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def get_all_activities() -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_all_activities()
    try:
        res = (
            _supabase.table("pipeline_activities")
            .select("*")
            .order("created_at", desc=False)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def update_activity(activity_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_activity(activity_id, updates)
    try:
        res = _supabase.table("pipeline_activities").update(updates).eq("id", activity_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


# ─── Notifications ─────────────────────────────────────────────────────────────

def insert_notification(notif: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.insert_notification(notif)
    try:
        res = _supabase.table("notifications").insert(notif).execute()
        return res.data[0] if res.data else notif
    except Exception:
        return notif


def get_notifications(user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_notifications(user_id, unread_only)
    try:
        q = _supabase.table("notifications").select("*").eq("user_id", user_id).order("created_at", desc=True)
        if unread_only:
            q = q.eq("read", False)
        res = q.execute()
        return res.data or []
    except Exception:
        return []


def mark_notifications_read(notification_ids: List[str]) -> None:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.mark_notifications_read(notification_ids)
    try:
        _supabase.table("notifications").update({"read": True}).in_("id", notification_ids).execute()
    except Exception:
        pass


# ─── Watchlist ─────────────────────────────────────────────────────────────────

def get_watchlist(user_id: str) -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_watchlist(user_id)
    try:
        res = (
            _supabase.table("watchlist_entries")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def add_to_watchlist(entry: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.add_to_watchlist(entry)
    import logging
    _log = logging.getLogger(__name__)
    try:
        # Try INSERT first; if duplicate (same user+company), UPDATE instead
        res = (
            _supabase.table("watchlist_entries")
            .upsert(entry, on_conflict="user_id,company_name")
            .execute()
        )
        if res.data:
            _log.info(f"add_to_watchlist: saved {entry.get('company_name')} for user {str(entry.get('user_id', ''))[:8]}...")
            return res.data[0]
        # Upsert returned no data — may have been blocked; try a plain insert
        _log.warning(f"add_to_watchlist: upsert returned no data for {entry.get('company_name')}, trying insert")
        res2 = _supabase.table("watchlist_entries").insert(entry).execute()
        return res2.data[0] if res2.data else entry
    except Exception as e:
        _log.error(f"add_to_watchlist FAILED for {entry.get('company_name')}: {e}")
        raise  # surface to caller so the API route returns a proper error


def remove_from_watchlist(user_id: str, company_name: str) -> bool:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.remove_from_watchlist(user_id, company_name)
    try:
        _supabase.table("watchlist_entries").delete().eq("user_id", user_id).eq("company_name", company_name).execute()
        return True
    except Exception:
        return False


def update_watchlist_entry(user_id: str, company_name: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_watchlist_entry(user_id, company_name, updates)
    try:
        res = (
            _supabase.table("watchlist_entries")
            .update(updates)
            .eq("user_id", user_id)
            .eq("company_name", company_name)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception:
        return None


# ─── Contacts ─────────────────────────────────────────────────────────────────

def upsert_contacts(user_id: str, contacts: list[dict]) -> int:
    if not USE_REAL_DB:
        return len(contacts)
    count = 0
    for i in range(0, len(contacts), 50):
        chunk = contacts[i : i + 50]
        res = _supabase.table("contacts").upsert(
            chunk, on_conflict="user_id,email_primary"
        ).execute()
        count += len(res.data)
    return count


def get_contacts(user_id: str, strength: str = None, industry: str = None,
                 search: str = None, limit: int = 500) -> list[dict]:
    if not USE_REAL_DB:
        return []
    q = (
        _supabase.table("contacts")
        .select("*, company:contact_companies(id,name,domain,industry)")
        .eq("user_id", user_id)
        .eq("is_duplicate", False)
        .order("relationship_score", desc=True)
        .limit(limit)
    )
    if strength:
        q = q.eq("relationship_strength", strength)
    if industry:
        q = q.eq("industry", industry)
    if search:
        q = q.ilike("display_name", f"%{search}%")
    res = q.execute()
    return res.data or []


def get_contacts_by_domain(user_id: str, domain: str) -> List[Dict[str, Any]]:
    """Find contacts whose email domain matches the given domain."""
    if not USE_REAL_DB:
        return []
    try:
        res = (
            _supabase.table("contacts")
            .select("id, display_name, email_primary, job_title, relationship_score, relationship_strength, emails_sent_90d, emails_received_90d, last_interaction_at")
            .eq("user_id", user_id)
            .eq("is_duplicate", False)
            .ilike("email_primary", f"%@{domain}")
            .order("relationship_score", desc=True)
            .limit(5)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


def get_contact(contact_id: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        return None
    res = _supabase.table("contacts").select("*").eq("id", contact_id).execute()
    return res.data[0] if res.data else None


def update_contact(contact_id: str, updates: dict) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        return updates
    res = _supabase.table("contacts").update(updates).eq("id", contact_id).execute()
    return res.data[0] if res.data else None


def delete_contact(contact_id: str) -> None:
    if not USE_REAL_DB:
        return
    _supabase.table("contacts").delete().eq("id", contact_id).execute()


def upsert_contact_companies(user_id: str, companies: list[dict]) -> int:
    if not USE_REAL_DB:
        return len(companies)
    count = 0
    for i in range(0, len(companies), 50):
        chunk = companies[i : i + 50]
        res = _supabase.table("contact_companies").upsert(
            chunk, on_conflict="user_id,domain"
        ).execute()
        count += len(res.data)
    return count


def get_contact_companies(user_id: str) -> list[dict]:
    if not USE_REAL_DB:
        return []
    res = (
        _supabase.table("contact_companies")
        .select("*")
        .eq("user_id", user_id)
        .order("strongest_score", desc=True)
        .execute()
    )
    return res.data or []


def upsert_contact_sync_job(user_id: str, job: dict) -> dict:
    if not USE_REAL_DB:
        return job
    job["user_id"] = user_id
    res = _supabase.table("contact_sync_jobs").upsert(
        job, on_conflict="user_id,source"
    ).execute()
    return res.data[0] if res.data else job


def get_contact_sync_job(user_id: str, source: str = "gmail") -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        return None
    res = (
        _supabase.table("contact_sync_jobs")
        .select("*")
        .eq("user_id", user_id)
        .eq("source", source)
        .execute()
    )
    return res.data[0] if res.data else None


# ─── Documents ─────────────────────────────────────────────────────────────────

# In-memory store for mock / dev mode
_mock_documents: List[Dict[str, Any]] = []


def create_document(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not USE_REAL_DB:
        _mock_documents.append(doc)
        return doc
    try:
        res = _supabase.table("documents").insert(doc).execute()
        return res.data[0] if res.data else doc
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"create_document failed: {e}")
        return doc


def get_documents(
    user_id: str,
    doc_type: Optional[str] = None,
    project_id: Optional[str] = None,
    pipeline_entry_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        docs = [d for d in _mock_documents if d.get("user_id") == user_id]
        if doc_type:
            docs = [d for d in docs if d.get("type") == doc_type]
        if project_id:
            docs = [d for d in docs if d.get("project_id") == project_id]
        return sorted(docs, key=lambda d: d.get("created_at", ""), reverse=True)
    try:
        q = (
            _supabase.table("documents")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
        )
        if doc_type:
            q = q.eq("type", doc_type)
        if project_id:
            q = q.eq("project_id", project_id)
        if pipeline_entry_id:
            q = q.eq("pipeline_entry_id", pipeline_entry_id)
        res = q.execute()
        return res.data or []
    except Exception:
        return []


def get_document(doc_id: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        return next((d for d in _mock_documents if d.get("id") == doc_id), None)
    try:
        res = _supabase.table("documents").select("*").eq("id", doc_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def update_document(doc_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        for i, d in enumerate(_mock_documents):
            if d.get("id") == doc_id:
                _mock_documents[i] = {**d, **updates}
                return _mock_documents[i]
        return None
    try:
        res = _supabase.table("documents").update(updates).eq("id", doc_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def delete_document(doc_id: str) -> bool:
    if not USE_REAL_DB:
        global _mock_documents
        before = len(_mock_documents)
        _mock_documents = [d for d in _mock_documents if d.get("id") != doc_id]
        return len(_mock_documents) < before
    try:
        _supabase.table("documents").delete().eq("id", doc_id).execute()
        return True
    except Exception:
        return False


# ─── Permits ───────────────────────────────────────────────────────────────────

def get_permits(
    user_id: str,
    search: Optional[str] = None,
    project_type: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    region: Optional[str] = None,
    builder_company: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_permits(
            user_id, search=search, project_type=project_type, status=status,
            city=city, region=region, builder_company=builder_company,
            min_value=min_value, max_value=max_value, date_from=date_from, date_to=date_to,
        )
    try:
        q = _supabase.table("permits").select("*").eq("user_id", user_id)
        if search:
            q = q.or_(f"address.ilike.%{search}%,city.ilike.%{search}%,builder_company.ilike.%{search}%,description.ilike.%{search}%")
        if project_type:
            q = q.ilike("project_type", project_type)
        if status:
            q = q.ilike("status", status)
        if city:
            q = q.ilike("city", city)
        if region:
            q = q.ilike("region", region)
        if builder_company:
            q = q.ilike("builder_company", f"%{builder_company}%")
        if min_value is not None:
            q = q.gte("value", min_value)
        if max_value is not None:
            q = q.lte("value", max_value)
        if date_from:
            q = q.gte("issued_date", date_from)
        if date_to:
            q = q.lte("issued_date", date_to)
        res = q.order("issued_date", desc=True).execute()
        return res.data or []
    except Exception:
        return []


def get_permit(permit_id: str) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_permit(permit_id)
    try:
        res = _supabase.table("permits").select("*").eq("id", permit_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def add_permits(permits: List[Dict[str, Any]]) -> int:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.add_permits(permits)
    try:
        res = _supabase.table("permits").insert(permits).execute()
        return len(res.data or [])
    except Exception:
        return 0


def update_permit(permit_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.update_permit(permit_id, updates)
    try:
        res = _supabase.table("permits").update(updates).eq("id", permit_id).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def delete_permits_by_batch(batch_id: str) -> int:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.delete_permits_by_batch(batch_id)
    try:
        res = _supabase.table("permits").delete().eq("import_batch_id", batch_id).execute()
        return len(res.data or [])
    except Exception:
        return 0


def get_permit_batches(user_id: str) -> List[Dict[str, Any]]:
    if not USE_REAL_DB:
        from . import mock_db
        return mock_db.get_permit_batches(user_id)
    try:
        res = (
            _supabase.table("permits")
            .select("import_batch_id, city, created_at")
            .eq("user_id", user_id)
            .not_.is_("import_batch_id", "null")
            .execute()
        )
        batches: Dict[str, Any] = {}
        for row in (res.data or []):
            bid = row["import_batch_id"]
            if bid not in batches:
                batches[bid] = {"id": bid, "permit_count": 0, "cities": set(), "created_at": row.get("created_at")}
            batches[bid]["permit_count"] += 1
            if row.get("city"):
                batches[bid]["cities"].add(row["city"])
        result = []
        for v in batches.values():
            v["cities"] = list(v["cities"])
            result.append(v)
        return result
    except Exception:
        return []
