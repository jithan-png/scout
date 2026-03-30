/**
 * BuildMapper Mobile — API client
 * Talks to the agentic-os FastAPI backend.
 * Base URL is set via NEXT_PUBLIC_API_URL in .env.local
 */

import type { Opportunity, OpportunityPriority } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
