"""
Auth dependency for FastAPI routes.
Verifies Supabase JWT and extracts the current user.
"""
import os
import logging
from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)


async def get_current_user(authorization: str | None = Header(default=None)):
    """
    FastAPI dependency. Extracts and verifies the Bearer token from the
    Authorization header using Supabase. Returns the authenticated user object.
    Raises 401 if the token is missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header.")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        from supabase import create_client
        client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
        result = client.auth.get_user(token)
        if not result or not result.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        return result.user
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Auth verification failed: {e}")
        raise HTTPException(status_code=401, detail="Token verification failed.")


async def get_optional_user(authorization: str | None = Header(default=None)):
    """
    Like get_current_user but does not raise — returns None if unauthenticated.
    Used during the transition period before auth is required everywhere.
    """
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
