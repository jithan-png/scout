/**
 * BuildMapper Mobile — API client
 * Talks to the agentic-os FastAPI backend.
 * Base URL is set via NEXT_PUBLIC_API_URL in .env.local
 */

import type { Opportunity, OpportunityPriority, ScoutOpportunity, LeadSource, ScoreBreakdown, LeadSourceRecord } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ── Fetch wrapper ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Scout briefing ────────────────────────────────────────────────────────────

export interface ScoutBriefingResponse {
  briefing: string;
  new_permits_count: number;
  stale_deals_count: number;
  new_permits: BackendPermit[];
  stale_deals: { project_id: string; company: string; stage: string; days_idle: number }[];
}

export async function fetchScoutBriefing(): Promise<ScoutBriefingResponse> {
  return apiFetch<ScoutBriefingResponse>("/api/scout/briefing");
}

// ── Backend permit shape (raw from DB) ───────────────────────────────────────

export interface BackendPermit {
  id: string;
  permit_type?: string;
  address?: string;
  city?: string;
  value?: number;
  construction_value?: number;
  issued_date?: string;
  issued_at?: string;
  description?: string;
  contractor_name?: string;
  contractor_email?: string;
  stage?: string;
  [key: string]: unknown;
}

// ── Transform permit → Opportunity ──────────────────────────────────────────

function deriveScore(permit: BackendPermit): number {
  let score = 50;
  const value = permit.value ?? permit.construction_value ?? 0;

  // Value tier
  if (value >= 5_000_000) score += 20;
  else if (value >= 1_000_000) score += 12;
  else if (value >= 500_000) score += 6;

  // Recency
  const issuedStr = permit.issued_date ?? permit.issued_at ?? "";
  if (issuedStr) {
    const days = Math.floor(
      (Date.now() - new Date(issuedStr).getTime()) / 86_400_000
    );
    if (days <= 3) score += 20;
    else if (days <= 7) score += 12;
    else if (days <= 14) score += 6;
  }

  return Math.min(score, 99);
}

function derivePriority(score: number): OpportunityPriority {
  if (score >= 82) return "hot";
  if (score >= 65) return "warm";
  return "watch";
}

function formatTiming(permit: BackendPermit): string {
  const issuedStr = permit.issued_date ?? permit.issued_at ?? "";
  if (!issuedStr) return "recently";
  const days = Math.floor(
    (Date.now() - new Date(issuedStr).getTime()) / 86_400_000
  );
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function permitToOpportunity(permit: BackendPermit): Opportunity {
  const score = deriveScore(permit);
  const priority = derivePriority(score);
  const value = permit.value ?? permit.construction_value ?? 0;
  const permitType = (permit.permit_type ?? "Construction")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const companyName = permit.contractor_name ?? "Unknown Contractor";

  return {
    id: permit.id,
    project: {
      id: permit.id,
      name: `${permitType} — ${permit.address ?? "Unknown address"}`,
      address: permit.address ?? "",
      city: permit.city ?? "",
      type: permitType,
      value,
      stage: (permit.stage as Opportunity["project"]["stage"]) ?? "permitted",
      issuedDate: permit.issued_date ?? permit.issued_at ?? new Date().toISOString(),
      description: String(permit.description ?? `${permitType} project in ${permit.city ?? "your area"}.`),
    },
    company: {
      id: `co-${permit.id}`,
      name: companyName,
      type: "gc",
      size: "unknown",
      recentProjects: 0,
    },
    relationship: {
      hasWarmPath: false,
      strength: "none",
      summary: "No connection found yet",
      path: [],
      confidence: 0,
    },
    matchReasons: [
      {
        label: "Recent permit",
        detail: `Filed ${formatTiming(permit)}`,
        type: "timing",
      },
      ...(value > 0
        ? [
            {
              label: "Value match",
              detail: `$${value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : `${Math.round(value / 1000)}K`} project`,
              type: "value" as const,
            },
          ]
        : []),
    ],
    score,
    priority,
    suggestedAction:
      priority === "hot"
        ? `Research ${companyName} and draft an intro`
        : priority === "warm"
        ? `Qualify this lead before reaching out`
        : `Watch for more activity on this project`,
    actionType: priority === "hot" ? "email" : priority === "warm" ? "research" : "connect",
    timing: formatTiming(permit),
  };
}

// ── Scout Run (real multi-source pipeline) ────────────────────────────────────

interface BackendScoutOpportunity {
  id: string;
  project: {
    id: string;
    name?: string;
    address?: string;
    city: string;
    state_province: string;
    country: string;
    region?: string;
    project_class?: string;
    project_type?: string;
    description?: string;
    status?: string;
    estimated_value?: number;
    unit_count?: number;
    storey_count?: number;
    earliest_signal_date?: string;
    latest_signal_date?: string;
    source_records: Array<{
      source_type: string;
      source_url?: string;
      source_date?: string;
      confidence: string;
      title?: string;
      excerpt?: string;
      linkedin_post_url?: string;
      poster_name?: string;
      poster_company?: string;
    }>;
    companies: Array<{
      id: string;
      name: string;
      roles: string[];
      phone?: string;
      email?: string;
      website?: string;
    }>;
    contacts: Array<{
      id: string;
      name: string;
      role: string;
      phone?: string;
      email?: string;
    }>;
    internal_id?: string;
  };
  score: {
    total: number;
    request_fit: number;
    timing: number;
    commercial: number;
    relationship: number;
    confidence: number;
    priority: string;
  };
  relationship: {
    status: string;
    strength: number;
    has_warm_path: boolean;
    signals: Array<{
      signal_type: string;
      entity_name: string;
      entity_type: string;
      strength: number;
      evidence: string;
      source: string;
    }>;
    connection_path: Array<{
      label: string;
      type: string;
      detail?: string;
      strength?: string;
    }>;
    summary: string;
  };
  surfaced_reasons: Array<{
    label: string;
    detail: string;
    type: string;
  }>;
  recommended_action: {
    label: string;
    detail: string;
    action_type: string;
  };
}

interface BackendScoutResult {
  intent: unknown;
  opportunities: BackendScoutOpportunity[];
  sources_used: string[];
  coverage_note: string;
  elapsed_ms: number;
}

function mapSourceType(st: string): LeadSource {
  if (st === "internal_db") return "permit";
  if (st === "web_evidence") return "web";
  if (st === "procurement") return "procurement";
  if (st === "linkedin") return "linkedin";
  return "unknown";
}

function backendOppToScout(b: BackendScoutOpportunity): ScoutOpportunity {
  const primarySourceRaw = b.project.source_records[0]?.source_type ?? "unknown";
  const primarySource: LeadSource = mapSourceType(primarySourceRaw);

  const sourceRecords: LeadSourceRecord[] = b.project.source_records.map((sr) => ({
    source_type: mapSourceType(sr.source_type),
    source_url: sr.source_url,
    source_date: sr.source_date,
    confidence: sr.confidence as "high" | "medium" | "low",
    title: sr.title,
    excerpt: sr.excerpt,
    linkedin_post_url: sr.linkedin_post_url,
    poster_name: sr.poster_name,
    poster_company: sr.poster_company,
  }));

  const scoreBreakdown: ScoreBreakdown = {
    total: b.score.total,
    request_fit: b.score.request_fit,
    timing: b.score.timing,
    commercial: b.score.commercial,
    relationship: b.score.relationship,
    confidence: b.score.confidence,
    priority: b.score.priority as "hot" | "warm" | "watch",
  };

  const value = b.project.estimated_value ?? 0;
  const permitType = b.project.project_type ?? "Construction";
  const companyName = b.project.companies[0]?.name ?? b.relationship.connection_path[1]?.label ?? "Unknown";
  const address = b.project.address ?? "";
  const city = b.project.city ?? "";

  const strengthMap: Record<string, "strong" | "medium" | "weak" | "none"> = {
    prior_customer: "strong",
    direct: "strong",
    watched: "medium",
    indirect: "weak",
    unknown: "none",
  };

  const opportunity: Opportunity = {
    id: b.id,
    project: {
      id: b.project.id,
      name: b.project.name ?? `${permitType} — ${address || city}`,
      address,
      city,
      type: permitType,
      value,
      stage: "permitted",
      issuedDate: b.project.earliest_signal_date ?? new Date().toISOString(),
      description: b.project.description ?? "",
    },
    company: {
      id: b.project.companies[0]?.id ?? `co-${b.id}`,
      name: companyName,
      type: "gc",
      size: "unknown",
      recentProjects: 0,
      website: b.project.companies[0]?.website,
    },
    relationship: {
      hasWarmPath: b.relationship.has_warm_path,
      strength: strengthMap[b.relationship.status] ?? "none",
      summary: b.relationship.summary,
      path: b.relationship.connection_path.map((hop) => ({
        label: hop.label,
        type: hop.type as "you" | "contact" | "company" | "project",
        detail: hop.detail,
        strength: (hop.strength as "strong" | "medium" | "weak" | undefined) ?? undefined,
      })),
      confidence: Math.round(b.relationship.strength * 100),
    },
    matchReasons: b.surfaced_reasons.map((r) => ({
      label: r.label,
      detail: r.detail,
      type: (r.type as "trade" | "location" | "timing" | "value" | "relationship") ?? "location",
    })),
    score: b.score.total,
    priority: b.score.priority as "hot" | "warm" | "watch",
    suggestedAction: b.recommended_action.detail,
    actionType: b.recommended_action.action_type as "email" | "call" | "connect" | "research",
    timing: b.project.earliest_signal_date
      ? (() => {
          const days = Math.floor(
            (Date.now() - new Date(b.project.earliest_signal_date!).getTime()) / 86_400_000
          );
          if (days === 0) return "today";
          if (days === 1) return "yesterday";
          return `${days} days ago`;
        })()
      : "recently",
  };

  return {
    ...opportunity,
    scoreBreakdown,
    primarySource,
    sourceRecords,
    estimatedValue: b.project.estimated_value,
    unitCount: b.project.unit_count,
    storeyCount: b.project.storey_count,
    projectStatus: b.project.status,
    earliestSignalDate: b.project.earliest_signal_date,
    companies: b.project.companies,
    contacts: b.project.contacts,
  };
}

export async function runScout(
  query: string,
  userId = "demo-user"
): Promise<{
  opportunities: ScoutOpportunity[];
  coverageNote: string;
  sourcesUsed: LeadSource[];
}> {
  try {
    const data = await apiFetch<BackendScoutResult>("/api/scout/run", {
      method: "POST",
      body: JSON.stringify({ query, user_id: userId }),
    });

    const opportunities = data.opportunities.map(backendOppToScout);
    opportunities.sort((a, b) => {
      const order: Record<string, number> = { hot: 0, warm: 1, watch: 2 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    });

    return {
      opportunities,
      coverageNote: data.coverage_note ?? "",
      sourcesUsed: data.sources_used.map(mapSourceType),
    };
  } catch (err) {
    console.warn("runScout failed, falling back to mock data:", err);
    // Import mock data and wrap with stub ScoutOpportunity fields
    const { MOCK_OPPORTUNITIES } = await import("./mock-data");
    const fallback: ScoutOpportunity[] = MOCK_OPPORTUNITIES.map((o) => ({
      ...o,
      scoreBreakdown: {
        total: o.score,
        request_fit: Math.round(o.score * 0.30),
        timing: Math.round(o.score * 0.20),
        commercial: Math.round(o.score * 0.15),
        relationship: o.relationship.hasWarmPath ? Math.round(o.score * 0.25) : 0,
        confidence: Math.round(o.score * 0.10),
        priority: o.priority,
      },
      primarySource: "permit" as LeadSource,
      sourceRecords: [
        {
          source_type: "permit" as LeadSource,
          confidence: "medium" as const,
          title: "Mock permit record",
          excerpt: o.project.description,
        },
      ],
    }));
    return { opportunities: fallback, coverageNote: "", sourcesUsed: ["permit"] };
  }
}

// ── Opportunities from briefing ───────────────────────────────────────────────

export async function fetchOpportunitiesFromBriefing(): Promise<{
  opportunities: Opportunity[];
  briefing: string;
  newPermitsCount: number;
  staleDealsCount: number;
}> {
  const data = await fetchScoutBriefing();
  const opportunities = data.new_permits.map(permitToOpportunity);
  // Sort: hot first, then warm, then watch
  const order: Record<OpportunityPriority, number> = { hot: 0, warm: 1, watch: 2 };
  opportunities.sort((a, b) => order[a.priority] - order[b.priority]);

  return {
    opportunities,
    briefing: data.briefing,
    newPermitsCount: data.new_permits_count,
    staleDealsCount: data.stale_deals_count,
  };
}
