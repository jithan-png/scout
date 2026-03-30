"""
Permit Map routes.
Handles permit CRUD, Excel upload, geocoding, and batch management.
"""
import io
import os
import uuid
import logging
from datetime import datetime
from typing import Optional, List

import httpx
import openpyxl
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from pydantic import BaseModel

from db import client as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/permits", tags=["permits"])

# ─── Column name aliases from common Excel exports ────────────────────────────

_COL_MAP = {
    # Standard field names
    "permit issue date": "issued_date",
    "issued date": "issued_date",
    "issue date": "issued_date",
    "date": "issued_date",
    "country": "country",
    "state": "state",
    "region": "region",
    "county": "county",
    "city": "city",
    "address": "address",
    "street address": "address",
    "project class": "project_class",
    "class": "project_class",
    "project type": "project_type",
    "type": "project_type",
    "project description": "description",
    "description": "description",
    "project status": "status",
    "status": "status",
    "value": "value",
    "project value": "value",
    "permit value": "value",
    "builder company": "builder_company",
    "builder name": "builder_name",
    "builder phone": "builder_phone",
    "builder email": "builder_email",
    "applicant company": "applicant_company",
    "applicant name": "applicant_name",
    "applicant phone": "applicant_phone",
    "applicant email": "applicant_email",
    "owner company": "owner_company",
    "owner name": "owner_name",
    "owner phone": "owner_phone",
    "owner email": "owner_email",
    "additional info": "additional_info",
    "additionalinfo": "additional_info",
    "addtionalinfo": "additional_info",   # typo variant in BuildMapper exports
    "additional information": "additional_info",
    "notes": "additional_info",
}


def _normalize_col(name: str) -> str:
    return _COL_MAP.get(name.lower().strip(), name.lower().strip().replace(" ", "_"))


def _parse_value(raw) -> Optional[float]:
    if raw is None:
        return None
    s = str(raw).replace("$", "").replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def _parse_date(raw) -> Optional[str]:
    if raw is None:
        return None
    if hasattr(raw, "strftime"):
        return raw.strftime("%Y-%m-%d")
    s = str(raw).strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m-%d-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s if s else None


async def _geocode(address: str, city: str, state: str) -> tuple[Optional[float], Optional[float]]:
    """Geocode via Nominatim (OpenStreetMap). No API key required."""
    query = f"{address}, {city}, {state}, USA"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "json", "limit": 1},
                headers={"User-Agent": "BuildMapper/1.0 (contact@buildmapper.com)"},
            )
            if r.status_code == 200:
                data = r.json()
                if data:
                    return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as exc:
        logger.warning("Geocode failed for %s: %s", query, exc)
    return None, None


# ─── Request / Response models ────────────────────────────────────────────────

class PermitUpdateRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/")
def list_permits(
    user_id: str = Query(default=""),
    search: Optional[str] = Query(default=None),
    project_type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    city: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    builder_company: Optional[str] = Query(default=None),
    min_value: Optional[float] = Query(default=None),
    max_value: Optional[float] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
):
    permits = db.get_permits(
        user_id,
        search=search,
        project_type=project_type,
        status=status,
        city=city,
        region=region,
        builder_company=builder_company,
        min_value=min_value,
        max_value=max_value,
        date_from=date_from,
        date_to=date_to,
    )
    return {"permits": permits, "total": len(permits)}


@router.get("/batches")
def list_batches(user_id: str = Query(default="")):
    return {"batches": db.get_permit_batches(user_id)}


@router.get("/{permit_id}")
def get_permit(permit_id: str):
    permit = db.get_permit(permit_id)
    if not permit:
        raise HTTPException(status_code=404, detail="Permit not found")
    return permit


@router.patch("/{permit_id}")
def update_permit(permit_id: str, req: PermitUpdateRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    updated = db.update_permit(permit_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Permit not found")
    return updated


@router.delete("/batch/{batch_id}")
def delete_batch(batch_id: str, user_id: str = Query(default="")):
    count = db.delete_permits_by_batch(batch_id)
    return {"deleted": count}


@router.post("/upload")
async def upload_permits(
    file: UploadFile = File(...),
    user_id: str = Query(default=""),
    geocode: bool = Query(default=True),
):
    """
    Upload an Excel file (.xlsx or .xls) containing permit data.
    Columns are mapped via _COL_MAP. Unknown columns are stored in additional_info.
    Returns the number of permits imported plus the batch_id.
    """
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(status_code=400, detail="Please upload an Excel (.xlsx/.xls) or CSV file")

    content = await file.read()
    batch_id = f"batch-{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow().isoformat() + "Z"

    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {exc}")

    if not rows:
        raise HTTPException(status_code=422, detail="File appears to be empty")

    # First row = headers
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    field_map = {i: _normalize_col(h) for i, h in enumerate(headers)}

    KNOWN_FIELDS = {
        "address", "city", "state", "country", "region", "county",
        "project_class", "project_type", "description", "status", "value", "issued_date",
        "builder_company", "builder_name", "builder_phone", "builder_email",
        "applicant_company", "applicant_name", "applicant_phone", "applicant_email",
        "owner_company", "owner_name", "owner_phone", "owner_email",
    }

    permits_to_insert: List[dict] = []
    geocode_queue: List[int] = []  # indices into permits_to_insert needing geocoding

    for row in rows[1:]:
        if all(cell is None for cell in row):
            continue

        record: dict = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "import_batch_id": batch_id,
            "created_at": now,
        }
        extra_parts = []

        for col_idx, cell in enumerate(row):
            if cell is None:
                continue
            field = field_map.get(col_idx, "")
            if field in KNOWN_FIELDS:
                if field == "value":
                    record[field] = _parse_value(cell)
                elif field == "issued_date":
                    record[field] = _parse_date(cell)
                else:
                    record[field] = str(cell).strip() if cell is not None else None
            elif field and field != "additional_info":
                extra_parts.append(f"{headers[col_idx]}: {cell}")

        if extra_parts:
            record["additional_info"] = "; ".join(extra_parts)

        # Skip rows with no address
        if not record.get("address") and not record.get("city"):
            continue

        permits_to_insert.append(record)
        if geocode and record.get("address") and record.get("city"):
            geocode_queue.append(len(permits_to_insert) - 1)

    if not permits_to_insert:
        raise HTTPException(status_code=422, detail="No valid permit rows found in file")

    # Geocode up to 50 permits (Nominatim rate limit: 1 req/s)
    if geocode:
        import asyncio
        geocoded = 0
        for idx in geocode_queue[:50]:
            p = permits_to_insert[idx]
            lat, lng = await _geocode(
                p.get("address", ""),
                p.get("city", ""),
                p.get("state", ""),
            )
            if lat and lng:
                permits_to_insert[idx]["lat"] = lat
                permits_to_insert[idx]["lng"] = lng
                geocoded += 1
            await asyncio.sleep(1.1)  # Nominatim rate limit
    else:
        geocoded = 0

    inserted = db.add_permits(permits_to_insert)
    return {
        "batch_id": batch_id,
        "inserted": inserted,
        "geocoded": geocoded,
        "total_rows": len(permits_to_insert),
    }
