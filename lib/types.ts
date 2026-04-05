// ── Core domain types ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  name?: string;
  phone?: string;
  whatsappPhone?: string;
  whatISell: string[];
  whereIOperate: string[];
  projectTypes: string[];
  whatsappConnected: boolean;
  contactsConnected: boolean;
  emailConnected: boolean;
}

export interface SearchIntent {
  id: string;
  text: string;
  createdAt: string;
  status: "active" | "paused" | "completed";
  resultCount: number;
}

export interface Project {
  id: string;
  name: string;
  address: string;
  city: string;
  type: string;
  value: number;
  stage: "pre_construction" | "permitted" | "active" | "nearing_completion";
  issuedDate: string;
  description: string;
}

export interface Company {
  id: string;
  name: string;
  type: "developer" | "gc" | "subcontractor" | "supplier";
  website?: string;
  size?: string;
  recentProjects: number;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  companyId: string;
  email?: string;
  phone?: string;
  interactionCount: number;
  lastInteraction: string;
  source: "gmail" | "contacts" | "linkedin" | "crm";
}

export type RelationshipStrength = "strong" | "medium" | "weak" | "none";

export interface ConnectionStep {
  label: string;
  type: "you" | "contact" | "company" | "project";
  detail?: string;
  strength?: RelationshipStrength;
}

export interface RelationshipSignal {
  hasWarmPath: boolean;
  strength: RelationshipStrength;
  summary: string; // "You know 2 people here"
  path: ConnectionStep[];
  confidence: number; // 0-100
}

export interface MatchReason {
  label: string;
  detail: string;
  type: "trade" | "location" | "timing" | "value" | "relationship";
}

export type OpportunityPriority = "hot" | "warm" | "watch";

export interface Opportunity {
  id: string;
  project: Project;
  company: Company;
  relationship: RelationshipSignal;
  matchReasons: MatchReason[];
  score: number; // 0-100
  priority: OpportunityPriority;
  suggestedAction: string;
  actionType: "email" | "call" | "connect" | "research";
  timing: string; // "3 days ago", "just filed"
  savedAt?: string;
}

export interface AgentUpdate {
  id: string;
  message: string;
  type: "scanning" | "matching" | "mapping" | "finding" | "complete";
  timestamp: string;
}

export interface Alert {
  id: string;
  title: string;
  body: string;
  type: "new_opportunity" | "warm_path" | "follow_up" | "update";
  opportunityId?: string;
  createdAt: string;
  read: boolean;
}

// ── Scout Real-Data Types ──────────────────────────────────────────────────────

export type LeadSource = "permit" | "web" | "procurement" | "linkedin" | "unknown";

export interface ScoreBreakdown {
  total: number;
  request_fit: number;   // max 30
  timing: number;        // max 20
  commercial: number;    // max 15
  relationship: number;  // max 25
  confidence: number;    // max 10
  priority: "hot" | "warm" | "watch";
}

export interface LeadSourceRecord {
  source_type: LeadSource;
  source_url?: string;
  source_date?: string;
  confidence: "high" | "medium" | "low";
  title?: string;
  excerpt?: string;
  linkedin_post_url?: string;
  poster_name?: string;
  poster_company?: string;
}

export interface ScoutOpportunity extends Opportunity {
  scoreBreakdown: ScoreBreakdown;
  primarySource: LeadSource;
  sourceRecords: LeadSourceRecord[];
  // Extra project fields from the rich backend model
  estimatedValue?: number;
  unitCount?: number;
  storeyCount?: number;
  projectStatus?: string;
  earliestSignalDate?: string;
  companies?: Array<{
    id: string;
    name: string;
    roles: string[];
    phone?: string;
    email?: string;
    website?: string;
  }>;
  contacts?: Array<{
    id: string;
    name: string;
    role: string;
    phone?: string;
    email?: string;
  }>;
}

export interface DataConnection {
  id: string;
  name: string;
  type: "whatsapp" | "gmail" | "contacts" | "crm" | "excel";
  status: "connected" | "disconnected" | "pending";
  connectedAt?: string;
  dataPoints?: string; // "847 contacts", "2 years of email"
}

// ── Scout panel types ──────────────────────────────────────────────────────────

export interface LikeSignals {
  projectTypes: string[];
  cities: string[];
}

export interface PermitEntry {
  id?: string;
  address: string;
  city?: string;
  project_type?: string;
  value?: number;
  builder_company?: string;
  builder_name?: string;
  builder_phone?: string;
  builder_email?: string;
  issued_date?: string;
  status?: string;
  description?: string;
}

export interface ScoutPanelData {
  type: "permit" | "dashboard";
  title?: string;
  data: {
    // permit panel
    query?: string;
    permits?: PermitEntry[];
    cities?: string[];
    types?: string[];
    // dashboard panel
    view_type?: "score_bars" | "permit_summary" | "pipeline_funnel" | "company_brief";
    bars?: Array<{ label: string; value: number; max: number }>;
    stats?: Array<{ label: string; value: string | number; color?: string }>;
    stages?: Array<{ label: string; count: number }>;
    company?: { name: string; website?: string; description?: string; contacts?: Array<{ name: string; role?: string; phone?: string; email?: string }> };
  };
}

// ── Activity types ─────────────────────────────────────────────────────────────

export type ActivityItemType =
  | "follow_up"      // nudge X days after a contact action
  | "new_matches"    // Scout found new leads matching profile
  | "hot_lead"       // hot/issued permit needs attention now
  | "permit_issued"  // a specific permit flipped to Issued
  | "scan_complete"  // Scout finished a scan run
  | "outcome"        // prompt to log win/loss after contacted lead goes cold
  | "like_signal";   // similar leads to ones the user liked

export type ActivityItemStatus = "pending" | "done" | "dismissed" | "snoozed";
export type ActivityItemPriority = "high" | "medium" | "low";
export type ActivityOutcome = "won" | "lost";

export interface ActivityItem {
  id: string;
  type: ActivityItemType;
  status: ActivityItemStatus;
  priority: ActivityItemPriority;
  title: string;
  body: string;
  oppId?: string;          // linked opp — used by Review action
  companyName?: string;    // for display without full opp lookup
  phone?: string;          // pre-filled for Call action
  email?: string;          // pre-filled for Email action
  primaryAction: "call" | "email" | "review" | "outcome" | "browse";
  createdAt: string;       // ISO
  dueAt?: string;          // ISO — item hidden until this time (follow_up scheduling)
  outcome?: ActivityOutcome;
  snoozedUntil?: string;   // ISO — item hidden until snoozed period expires
}

// ── Conversation session types ─────────────────────────────────────────────────

export interface ConversationSession {
  id: string;
  title: string;   // first user message, truncated to 40 chars
  date: string;    // ISO date string (creation)
  // Inline shape of ChatMessage to avoid circular import with store.ts
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    blocks?: unknown[];
    chips?: string[];
    panelData?: ScoutPanelData;
  }>;
}
