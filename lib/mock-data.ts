import type {
  Opportunity,
  Alert,
  AgentUpdate,
  DataConnection,
  SearchIntent,
} from "./types";

export const MOCK_OPPORTUNITIES: Opportunity[] = [
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
  },
  {
    id: "opp-2",
    project: {
      id: "proj-2",
      name: "Penticton Industrial Warehouse",
      address: "150 Industrial Ave",
      city: "Penticton",
      type: "Industrial",
      value: 2100000,
      stage: "pre_construction",
      issuedDate: "2026-03-20",
      description:
        "New 18,000 sqft distribution warehouse. Steel structure, slab-on-grade. Electrical and plumbing trades needed.",
    },
    company: {
      id: "co-2",
      name: "Okanagan Build Corp",
      type: "gc",
      size: "10-50",
      recentProjects: 3,
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
        label: "Value range",
        detail: "$2.1M fits your target",
        type: "value",
      },
      {
        label: "Pre-construction",
        detail: "Ideal timing to get in early",
        type: "timing",
      },
    ],
    score: 71,
    priority: "warm",
    suggestedAction: "Research key contacts at Okanagan Build",
    actionType: "research",
    timing: "8 days ago",
  },
  {
    id: "opp-3",
    project: {
      id: "proj-3",
      name: "Vernon Seniors Living",
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
  },
  {
    id: "opp-4",
    project: {
      id: "proj-4",
      name: "Kamloops Office Renovation",
      address: "680 Victoria St",
      city: "Kamloops",
      type: "Commercial",
      value: 850000,
      stage: "permitted",
      issuedDate: "2026-03-22",
      description:
        "Full interior renovation of 4-storey office building. Electrical, millwork, and specialty finishes required.",
    },
    company: {
      id: "co-4",
      name: "Pacific Edge Construction",
      type: "gc",
      size: "10-50",
      recentProjects: 5,
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
        label: "Recently permitted",
        detail: "Active bidding window",
        type: "timing",
      },
    ],
    score: 58,
    priority: "watch",
    suggestedAction: "Add to watchlist — connect when bidding opens",
    actionType: "research",
    timing: "6 days ago",
  },
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
      issuedDate: "2026-03-26",
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
        detail: "2 days ago",
        type: "timing",
      },
      { label: "West Kelowna", detail: "Your market", type: "location" },
    ],
    score: 97,
    priority: "hot",
    suggestedAction: "Call your contact directly — you're the incumbent",
    actionType: "call",
    timing: "2 days ago",
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
    name: "CRM",
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
