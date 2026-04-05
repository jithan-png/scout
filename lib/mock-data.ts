import type {
  ScoutOpportunity,
  Alert,
  AgentUpdate,
  DataConnection,
  SearchIntent,
} from "./types";

export const MOCK_OPPORTUNITIES: ScoutOpportunity[] = [
  // ── opp-1: PERMIT — contact row, unit count, stage badge ──────────────────
  {
    id: "opp-1",
    project: {
      id: "proj-1",
      name: "Kelowna Mixed-Use Development",
      address: "2450 Bernard Ave",
      city: "Kelowna",
      type: "Mixed-Use",
      value: 4800000,
      stage: "permitted",
      issuedDate: "2026-03-25",
      description:
        "6-storey mixed-use development with ground-floor retail and 42 residential units. Mechanical, electrical, and specialty trade packages open.",
    },
    company: {
      id: "co-1",
      name: "Skyline Developments",
      type: "developer",
      website: "skylinedev.ca",
      size: "50-200",
      recentProjects: 7,
    },
    relationship: {
      hasWarmPath: true,
      strength: "strong",
      summary: "You know 2 people here",
      path: [
        { label: "You", type: "you" },
        {
          label: "James Kowalski",
          type: "contact",
          detail: "Project Manager at Skyline",
          strength: "strong",
        },
        { label: "Skyline Developments", type: "company" },
      ],
      confidence: 91,
    },
    matchReasons: [
      {
        label: "Trade match",
        detail: "Mechanical packages match your profile",
        type: "trade",
      },
      {
        label: "Filed 3 days ago",
        detail: "Early mover advantage",
        type: "timing",
      },
      { label: "Kelowna", detail: "Your primary market", type: "location" },
    ],
    score: 94,
    priority: "hot",
    suggestedAction: "Email James — you have a warm intro",
    actionType: "email",
    timing: "3 days ago",
    savedAt: undefined,
    // ScoutOpportunity fields
    scoreBreakdown: {
      total: 94,
      request_fit: 28,
      timing: 18,
      commercial: 14,
      relationship: 24,
      confidence: 10,
      priority: "hot",
    },
    primarySource: "permit",
    sourceRecords: [
      {
        source_type: "permit",
        confidence: "high",
        title: "Building Permit BP-2026-1842 — Kelowna",
        excerpt:
          "6-storey mixed-use building, 42 residential units, ground floor commercial. Permit issued March 25, 2026.",
        source_date: "2026-03-25",
        source_url: "https://permits.kelowna.ca/BP-2026-1842",
      },
    ],
    unitCount: 42,
    storeyCount: 6,
    projectStatus: "Permitted",
    earliestSignalDate: "2026-03-25",
    companies: [
      {
        id: "co-1",
        name: "Skyline Developments",
        roles: ["Developer", "Owner"],
        website: "skylinedev.ca",
      },
    ],
    contacts: [
      {
        id: "ct-1",
        name: "James Kowalski",
        role: "Project Manager",
        email: "james.k@skylinedev.ca",
        phone: "250-555-0142",
      },
      {
        id: "ct-2",
        name: "Amanda Chen",
        role: "Estimator",
        email: "a.chen@skylinedev.ca",
      },
    ],
  },

  // ── opp-2: PROCUREMENT — tender URL, closing date, no warm path ───────────
  {
    id: "opp-2",
    project: {
      id: "proj-2",
      name: "BC Infrastructure: Penticton Aquatic Centre Expansion",
      address: "583 Power St",
      city: "Penticton",
      type: "Institutional",
      value: 8200000,
      stage: "pre_construction",
      issuedDate: "2026-03-18",
      description:
        "Expansion of existing aquatic facility — new 50m lap pool, accessible changerooms, mechanical and HVAC systems. Public tender open to qualified trade contractors.",
    },
    company: {
      id: "co-2",
      name: "BC Infrastructure Benefits",
      type: "gc",
      size: "200+",
      recentProjects: 24,
      website: "bcib.ca",
    },
    relationship: {
      hasWarmPath: false,
      strength: "none",
      summary: "No direct connection",
      path: [],
      confidence: 0,
    },
    matchReasons: [
      {
        label: "HVAC package",
        detail: "$1.4M mechanical scope matches your profile",
        type: "trade",
      },
      {
        label: "High value",
        detail: "$8.2M total project",
        type: "value",
      },
      {
        label: "Closes Apr 14",
        detail: "14 days to submit",
        type: "timing",
      },
    ],
    score: 76,
    priority: "warm",
    suggestedAction: "Download tender documents and review scope before deadline",
    actionType: "research",
    timing: "13 days ago",
    // ScoutOpportunity fields
    scoreBreakdown: {
      total: 76,
      request_fit: 26,
      timing: 14,
      commercial: 15,
      relationship: 11,
      confidence: 10,
      priority: "warm",
    },
    primarySource: "procurement",
    sourceRecords: [
      {
        source_type: "procurement",
        confidence: "high",
        title: "BCIB Tender T-2026-0412: Penticton Aquatic Centre Expansion",
        excerpt:
          "Invitation to tender for mechanical, electrical, and specialty trade packages. Mandatory site visit April 8. Submissions close April 14, 2026 at 2:00 PM PST.",
        source_date: "2026-04-14",
        source_url: "https://bcib.ca/tenders/T-2026-0412",
      },
    ],
    projectStatus: "Tender Open",
    earliestSignalDate: "2026-03-18",
    companies: [
      {
        id: "co-2",
        name: "BC Infrastructure Benefits",
        roles: ["Owner", "Procurement"],
        website: "bcib.ca",
      },
    ],
  },

  // ── opp-3: LINKEDIN — quoted excerpt, poster attribution, warm path ────────
  {
    id: "opp-3",
    project: {
      id: "proj-3",
      name: "Vernon Seniors Living — Phase 3",
      address: "3200 Highway 6",
      city: "Vernon",
      type: "Multi-Family",
      value: 7400000,
      stage: "active",
      issuedDate: "2026-03-15",
      description:
        "72-unit seniors housing complex. Active construction phase. Looking for HVAC and fire suppression subcontractors.",
    },
    company: {
      id: "co-3",
      name: "Meridian Housing Group",
      type: "developer",
      website: "meridianhousing.ca",
      size: "200+",
      recentProjects: 12,
    },
    relationship: {
      hasWarmPath: true,
      strength: "medium",
      summary: "1 shared connection",
      path: [
        { label: "You", type: "you" },
        {
          label: "Rachel Torres",
          type: "contact",
          detail: "Estimator you met at CanBuild 2025",
          strength: "medium",
        },
        { label: "Meridian Housing Group", type: "company" },
      ],
      confidence: 64,
    },
    matchReasons: [
      { label: "HVAC match", detail: "Active bid opportunity", type: "trade" },
      {
        label: "Active stage",
        detail: "Decisions being made now",
        type: "timing",
      },
      {
        label: "Warm path",
        detail: "You know Rachel Torres",
        type: "relationship",
      },
    ],
    score: 82,
    priority: "hot",
    suggestedAction: "Ask Rachel for an intro to the PM",
    actionType: "connect",
    timing: "13 days ago",
    // ScoutOpportunity fields
    scoreBreakdown: {
      total: 82,
      request_fit: 25,
      timing: 16,
      commercial: 14,
      relationship: 20,
      confidence: 7,
      priority: "hot",
    },
    primarySource: "linkedin",
    sourceRecords: [
      {
        source_type: "linkedin",
        confidence: "high",
        title: "Meridian Housing Group is hiring trade contractors for Phase 3",
        excerpt:
          "Excited to announce we're moving into the active construction phase on our Vernon seniors community. We have HVAC, fire suppression, and millwork packages available for qualified local subs. DM or email procurement@meridianhousing.ca with your trade and capacity.",
        linkedin_post_url: "https://linkedin.com/posts/meridian-housing-123456",
        poster_name: "David Park",
        poster_company: "Meridian Housing Group",
        source_date: "2026-03-15",
      },
    ],
    projectStatus: "Active Construction",
    earliestSignalDate: "2026-03-15",
    companies: [
      {
        id: "co-3",
        name: "Meridian Housing Group",
        roles: ["Developer", "Owner"],
        website: "meridianhousing.ca",
      },
    ],
    contacts: [
      {
        id: "ct-3",
        name: "Rachel Torres",
        role: "Estimator",
        email: "r.torres@meridianhousing.ca",
      },
      {
        id: "ct-4",
        name: "David Park",
        role: "VP Construction",
        email: "d.park@meridianhousing.ca",
      },
    ],
  },

  // ── opp-4: WEB — article title, excerpt snippet ───────────────────────────
  {
    id: "opp-4",
    project: {
      id: "proj-4",
      name: "Kamloops Downtown Revitalization",
      address: "360 St. Paul St",
      city: "Kamloops",
      type: "Commercial",
      value: 3100000,
      stage: "pre_construction",
      issuedDate: "2026-03-22",
      description:
        "Mixed commercial redevelopment of a former retail block. City-funded revitalization project entering design-build procurement phase.",
    },
    company: {
      id: "co-4",
      name: "City of Kamloops — Development Services",
      type: "developer",
      size: "200+",
      recentProjects: 8,
    },
    relationship: {
      hasWarmPath: false,
      strength: "weak",
      summary: "Possible connection via LinkedIn",
      path: [],
      confidence: 22,
    },
    matchReasons: [
      { label: "Commercial reno", detail: "Your specialty", type: "trade" },
      {
        label: "City-funded",
        detail: "Stable procurement timeline",
        type: "value",
      },
      {
        label: "Kamloops",
        detail: "Adjacent to your market",
        type: "location",
      },
    ],
    score: 58,
    priority: "watch",
    suggestedAction: "Monitor for RFQ release — expected Q2 2026",
    actionType: "research",
    timing: "6 days ago",
    // ScoutOpportunity fields
    scoreBreakdown: {
      total: 58,
      request_fit: 20,
      timing: 8,
      commercial: 12,
      relationship: 8,
      confidence: 10,
      priority: "watch",
    },
    primarySource: "web",
    sourceRecords: [
      {
        source_type: "web",
        confidence: "medium",
        title: "Kamloops secures $3.1M for downtown revitalization — Kamloops This Week",
        excerpt:
          "The City of Kamloops has approved funding for a major revitalization project targeting the 300-block of St. Paul Street. The project will include commercial facade upgrades, new streetscaping, and mixed-use infill construction. A design-build RFQ is expected to be issued in Q2 2026.",
        source_url: "https://kamloopsthisweek.com/news/downtown-revitalization-2026",
        source_date: "2026-03-22",
      },
    ],
    projectStatus: "Pre-Procurement",
    earliestSignalDate: "2026-03-22",
    companies: [
      {
        id: "co-4",
        name: "City of Kamloops",
        roles: ["Owner", "Procuring Entity"],
      },
    ],
  },

  // ── opp-5: PERMIT — strong warm path, incumbent, recent (green timing) ─────
  {
    id: "opp-5",
    project: {
      id: "proj-5",
      name: "West Kelowna Townhomes Phase 2",
      address: "445 Gellatly Rd",
      city: "West Kelowna",
      type: "Residential",
      value: 3200000,
      stage: "pre_construction",
      issuedDate: "2026-03-29",
      description:
        "24-unit townhome development. Phase 2 of existing community. GC is repeat client of the developer.",
    },
    company: {
      id: "co-5",
      name: "Gellatly Homes",
      type: "developer",
      size: "10-50",
      recentProjects: 4,
    },
    relationship: {
      hasWarmPath: true,
      strength: "strong",
      summary: "You've worked with them before",
      path: [
        { label: "You", type: "you" },
        {
          label: "Gellatly Homes",
          type: "company",
          detail: "Phase 1 client",
          strength: "strong",
        },
      ],
      confidence: 88,
    },
    matchReasons: [
      {
        label: "Past client",
        detail: "You completed Phase 1",
        type: "relationship",
      },
      {
        label: "Just filed",
        detail: "Today",
        type: "timing",
      },
      { label: "West Kelowna", detail: "Your market", type: "location" },
    ],
    score: 97,
    priority: "hot",
    suggestedAction: "Call your contact directly — you're the incumbent",
    actionType: "call",
    timing: "today",
    // ScoutOpportunity fields
    scoreBreakdown: {
      total: 97,
      request_fit: 29,
      timing: 20,
      commercial: 13,
      relationship: 25,
      confidence: 10,
      priority: "hot",
    },
    primarySource: "permit",
    sourceRecords: [
      {
        source_type: "permit",
        confidence: "high",
        title: "Building Permit BP-2026-2201 — West Kelowna",
        excerpt:
          "24-unit townhome development, Phase 2 of Gellatly Commons. Structural, mechanical, and electrical packages to be awarded.",
        source_date: "2026-03-29",
        source_url: "https://permits.westkelowna.ca/BP-2026-2201",
      },
    ],
    unitCount: 24,
    storeyCount: 3,
    projectStatus: "Pre-Construction",
    earliestSignalDate: "2026-03-29",
    companies: [
      {
        id: "co-5",
        name: "Gellatly Homes",
        roles: ["Developer", "Owner"],
      },
    ],
    contacts: [
      {
        id: "ct-5",
        name: "Mike Gellatly",
        role: "Owner / Developer",
        phone: "250-555-0188",
        email: "mike@gellatly.ca",
      },
    ],
  },
];

export const MOCK_ALERTS: Alert[] = [
  {
    id: "alert-1",
    title: "New match in Kelowna",
    body: "Skyline Developments just filed a $4.8M permit — you know 2 people there.",
    type: "warm_path",
    opportunityId: "opp-1",
    createdAt: "2026-03-28T07:15:00Z",
    read: false,
  },
  {
    id: "alert-2",
    title: "Follow up with Gellatly Homes",
    body: "It's been 14 days since your last interaction. Phase 2 permits just dropped.",
    type: "follow_up",
    opportunityId: "opp-5",
    createdAt: "2026-03-27T08:30:00Z",
    read: false,
  },
  {
    id: "alert-3",
    title: "3 new permits this week",
    body: "Scout found 3 new projects matching your profile in Kelowna and Vernon.",
    type: "new_opportunity",
    createdAt: "2026-03-26T09:00:00Z",
    read: true,
  },
  {
    id: "alert-4",
    title: "Meridian Housing — bid window open",
    body: "Vernon Seniors Living is in active construction. HVAC packages are now being awarded.",
    type: "update",
    opportunityId: "opp-3",
    createdAt: "2026-03-25T14:20:00Z",
    read: true,
  },
];

export const MOCK_AGENT_UPDATES: AgentUpdate[] = [
  {
    id: "upd-1",
    message: "Scanning live permits in your area...",
    type: "scanning",
    timestamp: "2026-03-28T07:10:00Z",
  },
  {
    id: "upd-2",
    message: "Found recent permits matching your profile",
    type: "finding",
    timestamp: "2026-03-28T07:11:30Z",
  },
  {
    id: "upd-3",
    message: "Cross-referencing your contact network...",
    type: "mapping",
    timestamp: "2026-03-28T07:12:00Z",
  },
  {
    id: "upd-4",
    message: "Scoring each lead against your profile",
    type: "matching",
    timestamp: "2026-03-28T07:13:00Z",
  },
  {
    id: "upd-5",
    message: "Done — your top leads are ready",
    type: "complete",
    timestamp: "2026-03-28T07:14:00Z",
  },
];

export const MOCK_DATA_CONNECTIONS: DataConnection[] = [
  {
    id: "conn-whatsapp",
    name: "WhatsApp",
    type: "whatsapp",
    status: "disconnected",
  },
  {
    id: "conn-gmail",
    name: "Gmail",
    type: "gmail",
    status: "connected",
    connectedAt: "2026-01-15T10:00:00Z",
    dataPoints: "1,240 contacts · 2 years of email",
  },
  {
    id: "conn-contacts",
    name: "Phone Contacts",
    type: "contacts",
    status: "connected",
    connectedAt: "2026-01-15T10:05:00Z",
    dataPoints: "387 contacts",
  },
  {
    id: "conn-crm",
    name: "HubSpot",
    type: "crm",
    status: "disconnected",
  },
  {
    id: "conn-excel",
    name: "Excel / CSV",
    type: "excel",
    status: "disconnected",
  },
];

export const MOCK_SEARCH_INTENTS: SearchIntent[] = [
  {
    id: "intent-1",
    text: "Mechanical and HVAC subcontracting in Kelowna and West Kelowna",
    createdAt: "2026-03-20T09:00:00Z",
    status: "active",
    resultCount: 12,
  },
  {
    id: "intent-2",
    text: "Commercial electrical work in the Okanagan",
    createdAt: "2026-03-22T11:30:00Z",
    status: "active",
    resultCount: 7,
  },
];
