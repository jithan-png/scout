import type { PermitEntry } from "./types";
import type { ScoutOpportunity, OpportunityPriority } from "./types";

export function permitOppId(permit: PermitEntry): string {
  const slug = (permit.id ?? permit.address).replace(/[^a-z0-9]/gi, "-").toLowerCase();
  return `permit-${slug}`;
}

export function permitToOpportunity(permit: PermitEntry): ScoutOpportunity {
  const s = (permit.status ?? "").toLowerCase();
  const isIssued = /issued|approved|active/.test(s);
  const priority: OpportunityPriority = isIssued ? "hot" : "warm";
  const score = isIssued ? 72 : 54;
  const id = permitOppId(permit);

  const contacts: ScoutOpportunity["contacts"] =
    permit.builder_phone || permit.builder_email || permit.builder_name
      ? [
          {
            id: `${id}-contact`,
            name: permit.builder_name ?? permit.builder_company ?? "Builder",
            role: "Builder / GC",
            phone: permit.builder_phone,
            email: permit.builder_email,
          },
        ]
      : [];

  return {
    id,
    project: {
      id: `${id}-project`,
      name: permit.address,
      address: permit.address,
      city: permit.city ?? "",
      type: permit.project_type ?? "Construction",
      value: permit.value ?? 0,
      stage: isIssued ? "permitted" : "pre_construction",
      issuedDate: permit.issued_date ?? "",
      description: permit.description ?? "",
    },
    company: {
      id: `${id}-co`,
      name: permit.builder_company ?? "Unknown Builder",
      type: "gc",
      recentProjects: 0,
    },
    relationship: {
      hasWarmPath: false,
      strength: "none",
      summary: "No warm path mapped yet",
      path: [],
      confidence: 0,
    },
    matchReasons: [
      {
        label: isIssued ? "Permit issued" : "In review",
        detail: [permit.project_type, permit.city].filter(Boolean).join(" · "),
        type: "timing",
      },
      ...(permit.value
        ? [{ label: "Project value", detail: `$${(permit.value / 1000).toFixed(0)}K contract`, type: "value" as const }]
        : []),
    ],
    score,
    priority,
    suggestedAction: contacts.length
      ? isIssued
        ? "Call builder today — permit just dropped"
        : "Reach out now to get on the GC's radar before subs are locked"
      : isIssued
      ? "Find contact info — permit is live"
      : "Research builder and make first contact",
    actionType: contacts[0]?.phone ? "call" : contacts[0]?.email ? "email" : "research",
    timing: permit.issued_date
      ? `Issued ${permit.issued_date}`
      : isIssued
      ? "Recently issued"
      : "In review",
    // ScoutOpportunity extras
    scoreBreakdown: {
      total: score,
      request_fit: isIssued ? 20 : 14,
      timing: isIssued ? 18 : 10,
      commercial: permit.value ? Math.min(15, Math.floor((permit.value / 1_000_000) * 8)) : 5,
      relationship: 0,
      confidence: isIssued ? 9 : 7,
      priority,
    },
    primarySource: "permit",
    sourceRecords: [
      {
        source_type: "permit",
        source_date: permit.issued_date,
        confidence: "high",
        title: `${permit.project_type ?? "Building"} Permit — ${permit.address}`,
        excerpt: permit.description,
      },
    ],
    contacts,
    companies:
      permit.builder_company
        ? [
            {
              id: `${id}-co`,
              name: permit.builder_company,
              roles: ["Builder", "GC"],
              phone: permit.builder_phone,
              email: permit.builder_email,
            },
          ]
        : [],
    projectStatus: permit.status ?? undefined,
  };
}
