"""
Scout Domain Models
All types used by the Scout pipeline, from raw source records through to the
final ranked Opportunity output. These are the canonical domain objects — they
do not depend on any specific database schema or adapter format.
"""
from __future__ import annotations
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─── Enumerations ─────────────────────────────────────────────────────────────

class SourceType(str, Enum):
    INTERNAL_DB  = "internal_db"   # BuildMapper permit uploads
    WEB_EVIDENCE = "web_evidence"  # Tavily open web search
    PROCUREMENT  = "procurement"   # Public tender / RFP feeds
    LINKEDIN     = "linkedin"      # LinkedIn public post signals


class SourceConfidence(str, Enum):
    HIGH   = "high"    # Official record (permit, tender), explicit participants
    MEDIUM = "medium"  # Multiple corroborating web sources, likely resolution
    LOW    = "low"     # Single web mention, inferred participants, old data


class ProjectStatus(str, Enum):
    PRE_APPLICATION = "pre_application"
    PLANNING        = "planning"
    PERMITTED       = "permitted"
    ACTIVE          = "active"
    COMPLETE        = "complete"
    UNKNOWN         = "unknown"


class CompanyRole(str, Enum):
    BUILDER    = "builder"
    APPLICANT  = "applicant"
    OWNER      = "owner"
    ARCHITECT  = "architect"
    GC         = "gc"
    CONSULTANT = "consultant"
    SUPPLIER   = "supplier"


class RelationshipStatus(str, Enum):
    PRIOR_CUSTOMER = "prior_customer"  # in pipeline (won or active)
    DIRECT         = "direct"          # strong Gmail contact at company
    WATCHED        = "watched"         # on user's watchlist
    INDIRECT       = "indirect"        # weak contact or 2nd degree
    UNKNOWN        = "unknown"         # no connection found


class WarmthPreference(str, Enum):
    WARM_ONLY  = "warm_only"
    WARM_FIRST = "warm_first"
    ANY        = "any"


class WorkType(str, Enum):
    PRIVATE = "private"
    PUBLIC  = "public"
    ANY     = "any"


class Urgency(str, Enum):
    URGENT = "urgent"
    NORMAL = "normal"
    FUTURE = "future"


class ActionType(str, Enum):
    EMAIL    = "email"
    CALL     = "call"
    CONNECT  = "connect"
    RESEARCH = "research"
    WATCH    = "watch"
    SAVE     = "save"


# ─── Intent ──────────────────────────────────────────────────────────────────

class Geography(BaseModel):
    city:    Optional[str] = None
    state:   Optional[str] = None   # province or state
    country: str = "Canada"
    region:  Optional[str] = None   # e.g. "Okanagan", "Fraser Valley"


class UserIntent(BaseModel):
    raw_query:          str
    geographies:        List[Geography] = []
    trade_categories:   List[str] = []    # e.g. ["HVAC", "framing"]
    project_types:      List[str] = []    # e.g. ["multifamily", "townhome"]
    project_classes:    List[str] = []    # e.g. ["residential", "commercial"]
    stage_preferences:  List[str] = []    # e.g. ["framing", "pre_construction"]
    warmth_preference:  WarmthPreference = WarmthPreference.ANY
    work_type:          WorkType = WorkType.ANY
    value_min:          Optional[float] = None
    value_max:          Optional[float] = None
    company_types:      List[str] = []    # e.g. ["gc", "developer"]
    urgency:            Urgency = Urgency.NORMAL
    parsed_by:          str = "fallback"  # "claude" | "fallback"


# ─── Raw Source Records ───────────────────────────────────────────────────────

class RawRecord(BaseModel):
    """Unprocessed output from a single adapter. Preserves full provenance."""
    source_type: SourceType
    confidence:  SourceConfidence
    raw_data:    Dict[str, Any]
    source_url:  Optional[str] = None
    source_date: Optional[str] = None   # ISO date string, if known
    fetched_at:  datetime = Field(default_factory=datetime.utcnow)


# ─── Normalized Entities ─────────────────────────────────────────────────────

class NormalizedCompany(BaseModel):
    id:         str
    name:       str
    roles:      List[CompanyRole] = []
    phone:      Optional[str] = None
    email:      Optional[str] = None
    website:    Optional[str] = None
    confidence: float = 1.0   # 0.0–1.0; lower if name was inferred


class NormalizedContact(BaseModel):
    id:         str
    name:       str
    role:       str
    company_id: Optional[str] = None
    phone:      Optional[str] = None
    email:      Optional[str] = None


class SourceRecord(BaseModel):
    """Processed source reference attached to a NormalizedProject."""
    source_type:        SourceType
    source_url:         Optional[str] = None
    source_date:        Optional[str] = None
    confidence:         SourceConfidence
    title:              Optional[str] = None   # page title or record title
    excerpt:            Optional[str] = None   # brief description from this source
    # LinkedIn-specific fields
    linkedin_post_url:  Optional[str] = None   # direct URL to the LinkedIn post
    poster_name:        Optional[str] = None   # person who made the post
    poster_company:     Optional[str] = None   # their company


class NormalizedProject(BaseModel):
    id:                   str
    name:                 Optional[str] = None
    address:              Optional[str] = None
    city:                 str
    state_province:       str
    country:              str = "Canada"
    region:               Optional[str] = None
    project_class:        Optional[str] = None
    project_type:         Optional[str] = None
    description:          str = ""
    status:               ProjectStatus = ProjectStatus.UNKNOWN
    estimated_value:      Optional[float] = None
    unit_count:           Optional[int] = None
    storey_count:         Optional[int] = None
    building_form:        Optional[str] = None
    tags:                 List[str] = []
    earliest_signal_date: Optional[str] = None
    latest_signal_date:   Optional[str] = None
    source_records:       List[SourceRecord] = []
    companies:            List[NormalizedCompany] = []
    contacts:             List[NormalizedContact] = []
    # Internal DB id if matched, for dedup tracking
    internal_id:          Optional[str] = None


# ─── Relationship Intelligence ────────────────────────────────────────────────

class RelationshipSignal(BaseModel):
    signal_type:    RelationshipStatus
    entity_name:    str             # company or contact name
    entity_type:    str             # "company" | "contact"
    strength:       float           # 0.0–1.0
    evidence:       str             # human-readable explanation
    source:         str = ""        # "watchlist" | "gmail" | "pipeline"


class ConnectionHop(BaseModel):
    label:    str
    type:     str             # "you" | "contact" | "company"
    detail:   Optional[str] = None
    strength: Optional[str] = None  # "strong" | "medium" | "weak"


class RelationshipContext(BaseModel):
    status:          RelationshipStatus = RelationshipStatus.UNKNOWN
    strength:        float = 0.0
    has_warm_path:   bool = False
    signals:         List[RelationshipSignal] = []
    connection_path: List[ConnectionHop] = []
    summary:         str = "No connection found"


# ─── Scoring ─────────────────────────────────────────────────────────────────

class OpportunityScore(BaseModel):
    total:        int = 0      # 0–100
    request_fit:  int = 0      # 0–30: geography + trade + type + stage
    timing:       int = 0      # 0–20: recency + entry window fit
    commercial:   int = 0      # 0–15: value + scale
    relationship: int = 0      # 0–25: warmth of connection
    confidence:   int = 0      # 0–10: data source quality
    priority:     str = "watch"  # "hot" | "warm" | "watch"


# ─── Opportunity (final output) ───────────────────────────────────────────────

class SurfacedReason(BaseModel):
    label:   str
    detail:  str
    type:    str   # "geography" | "trade" | "timing" | "relationship" | "value" | "procurement"


class RecommendedAction(BaseModel):
    label:       str
    detail:      str
    action_type: ActionType


class Opportunity(BaseModel):
    id:                 str
    project:            NormalizedProject
    score:              OpportunityScore
    relationship:       RelationshipContext
    surfaced_reasons:   List[SurfacedReason] = []
    recommended_action: RecommendedAction
    created_at:         datetime = Field(default_factory=datetime.utcnow)


# ─── Scout Result ─────────────────────────────────────────────────────────────

class ScoutResult(BaseModel):
    intent:        UserIntent
    opportunities: List[Opportunity] = []
    sources_used:  List[str] = []       # e.g. ["internal_db", "web_evidence"]
    coverage_note: str = ""             # honest statement about data coverage
    elapsed_ms:    int = 0
