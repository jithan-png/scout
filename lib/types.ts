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
