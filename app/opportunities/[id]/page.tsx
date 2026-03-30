"use client";

import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  MapPin,
  Calendar,
  DollarSign,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  Globe,
  FileText,
  Linkedin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import ScoreBreakdown from "@/components/opportunities/ScoreBreakdown";
import type { RelationshipStrength, ScoutOpportunity, LeadSourceRecord } from "@/lib/types";

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function StrengthPill({ strength }: { strength: RelationshipStrength }) {
  const cfg: Record<RelationshipStrength, { label: string; color: string; bg: string }> = {
    strong: { label: "Strong", color: "#34D399", bg: "rgba(0,200,117,0.12)" },
    medium: { label: "Medium", color: "#FCD34D", bg: "rgba(245,158,11,0.12)" },
    weak: { label: "Weak", color: "#71717A", bg: "rgba(255,255,255,0.06)" },
    none: { label: "None", color: "#52525B", bg: "rgba(255,255,255,0.04)" },
  };
  const c = cfg[strength];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────

function LargeScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? "#00C875" : score >= 65 ? "#F59E0B" : "#71717A";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="relative text-center">
        <div className="text-[18px] font-bold" style={{ color }}>{score}</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#3F3F46" }}>
      {children}
    </p>
  );
}

// ── Source evidence card ──────────────────────────────────────────────────────

function SourceEvidenceCard({ record }: { record: LeadSourceRecord }) {
  const sourceConfigs = {
    permit: {
      icon: <Building2 size={13} strokeWidth={2} />,
      label: "Official Permit Record",
      color: "#60A5FA",
      bg: "rgba(96,165,250,0.08)",
      border: "rgba(96,165,250,0.18)",
    },
    web: {
      icon: <Globe size={13} strokeWidth={2} />,
      label: "Web Mention",
      color: "#A1A1AA",
      bg: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.09)",
    },
    procurement: {
      icon: <FileText size={13} strokeWidth={2} />,
      label: "Public Tender",
      color: "#A78BFA",
      bg: "rgba(167,139,250,0.08)",
      border: "rgba(167,139,250,0.18)",
    },
    linkedin: {
      icon: <Linkedin size={13} strokeWidth={2} />,
      label: "LinkedIn Signal",
      color: "#22D3EE",
      bg: "rgba(34,211,238,0.08)",
      border: "rgba(34,211,238,0.18)",
    },
    unknown: {
      icon: <Globe size={13} strokeWidth={2} />,
      label: "External Source",
      color: "#52525B",
      bg: "rgba(255,255,255,0.03)",
      border: "rgba(255,255,255,0.06)",
    },
  };

  const cfg = sourceConfigs[record.source_type] ?? sourceConfigs.unknown;
  const postUrl = record.linkedin_post_url ?? record.source_url;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
        {record.source_date && (
          <span className="ml-auto text-[11px]" style={{ color: "#52525B" }}>
            {formatDate(record.source_date)}
          </span>
        )}
      </div>

      {/* LinkedIn-specific: poster info */}
      {record.source_type === "linkedin" && (record.poster_name || record.poster_company) && (
        <div className="flex items-center gap-1.5 mb-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
            style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE" }}
          >
            {record.poster_name?.charAt(0) ?? "?"}
          </div>
          <span className="text-[12px] font-semibold" style={{ color: "#F4F4F5" }}>
            {record.poster_name ?? "Unknown poster"}
          </span>
          {record.poster_company && (
            <span className="text-[12px]" style={{ color: "#71717A" }}>
              at {record.poster_company}
            </span>
          )}
        </div>
      )}

      {/* Title and excerpt */}
      {record.title && (
        <p className="text-[13px] font-semibold mb-1" style={{ color: "#F4F4F5" }}>
          {record.title}
        </p>
      )}
      {record.excerpt && (
        <p className="text-[12px] leading-relaxed mb-2" style={{ color: "#71717A" }}>
          {record.excerpt.slice(0, 200)}{record.excerpt.length > 200 ? "…" : ""}
        </p>
      )}

      {/* Link */}
      {postUrl && (
        <button
          onClick={() => window.open(postUrl, "_blank")}
          className="pressable flex items-center gap-1.5 text-[12px] font-semibold"
          style={{ color: cfg.color }}
        >
          <ExternalLink size={11} strokeWidth={2.5} />
          {record.source_type === "linkedin"
            ? "View post"
            : record.source_type === "procurement"
            ? "View tender"
            : "View source"}
        </button>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { opportunities, savedOpportunityIds, saveOpportunity, unsaveOpportunity } = useAppStore();
  const [scoreExpanded, setScoreExpanded] = useState(false);

  const opp = opportunities.find((o) => o.id === params.id);

  if (!opp) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center" style={{ background: "#09090B" }}>
        <p style={{ color: "#52525B" }}>Opportunity not found</p>
        <button onClick={() => router.back()} className="mt-4 text-[14px] font-semibold pressable" style={{ color: "#00C875" }}>
          Go back
        </button>
      </div>
    );
  }

  // Cast to ScoutOpportunity to access rich fields (may be undefined for mock data)
  const scout = opp as ScoutOpportunity;
  const isSaved = savedOpportunityIds.has(opp.id);
  const priorityColor = opp.priority === "hot" ? "#EF4444" : opp.priority === "warm" ? "#F59E0B" : "#71717A";

  // Conditional data fields
  const hasAddress = !!(opp.project.address || opp.project.city);
  const hasValue = !!(scout.estimatedValue ?? opp.project.value);
  const displayValue = scout.estimatedValue ?? opp.project.value;
  const hasDescription = !!opp.project.description;
  const hasProjectDetails = !!(hasDescription || scout.unitCount || scout.storeyCount);
  const hasTimeline = !!(scout.earliestSignalDate || opp.project.issuedDate);
  const hasRelationship = opp.relationship.hasWarmPath && opp.relationship.path.length > 0;
  const hasCompanies = (scout.companies?.length ?? 0) > 0;
  const hasSourceRecords = (scout.sourceRecords?.length ?? 0) > 0;
  const hasScoreBreakdown = !!scout.scoreBreakdown;

  return (
    <div className="flex flex-col min-h-dvh bg-base">
      <div className="safe-top" />

      {/* ── Header ─── */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="pressable w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <ArrowLeft size={17} strokeWidth={2} style={{ color: "#A1A1AA" }} />
        </button>
        <p className="flex-1 text-[13px] font-medium truncate" style={{ color: "#52525B" }}>
          {opp.company.name}
        </p>
        <button
          onClick={() => isSaved ? unsaveOpportunity(opp.id) : saveOpportunity(opp.id)}
          className="pressable w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {isSaved
            ? <BookmarkCheck size={17} style={{ color: "#00C875" }} strokeWidth={2} />
            : <Bookmark size={17} style={{ color: "#71717A" }} strokeWidth={2} />}
        </button>
      </header>

      <div className="pb-8 animate-fade-up">

        {/* ── Hero: priority + name + score + breakdown ─── */}
        <div className="px-5 pb-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: priorityColor }}>
              {opp.priority}
            </span>
            <span style={{ color: "#3F3F46" }}>·</span>
            <span className="text-[12px]" style={{ color: "#52525B" }}>{opp.project.type}</span>
          </div>

          <div className="flex items-start justify-between gap-3 mb-4">
            <h1
              className="flex-1 text-[22px] font-bold leading-tight"
              style={{ letterSpacing: "-0.025em", color: "#F4F4F5" }}
            >
              {opp.project.name}
            </h1>
            <LargeScoreRing score={opp.score} />
          </div>

          {/* Score breakdown — collapsible */}
          {hasScoreBreakdown && (
            <div
              className="rounded-2xl p-4"
              style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <button
                onClick={() => setScoreExpanded(!scoreExpanded)}
                className="pressable w-full flex items-center justify-between mb-3"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#3F3F46" }}>
                  Score breakdown
                </span>
                <span style={{ color: "#52525B" }}>
                  {scoreExpanded
                    ? <ChevronUp size={14} strokeWidth={2} />
                    : <ChevronDown size={14} strokeWidth={2} />}
                </span>
              </button>
              <ScoreBreakdown breakdown={scout.scoreBreakdown} collapsed={!scoreExpanded} />
            </div>
          )}
        </div>

        {/* ── Location (if present) ─── */}
        {hasAddress && (
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
              <MapPin size={12} style={{ color: "#3F3F46" }} />
              <span className="text-[13px]" style={{ color: "#71717A" }}>
                {[opp.project.address, opp.project.city].filter(Boolean).join(", ")}
              </span>
            </div>
          </div>
        )}

        {/* ── Value + timeline (if present) ─── */}
        {(hasValue || hasTimeline) && (
          <div className="px-5 py-4 flex gap-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {hasValue && (
              <div className="flex items-center gap-2">
                <DollarSign size={12} style={{ color: "#3F3F46" }} />
                <span className="text-[13px] font-semibold" style={{ color: "#71717A" }}>
                  {formatValue(displayValue)}
                </span>
              </div>
            )}
            {hasTimeline && (
              <div className="flex items-center gap-2">
                <Calendar size={12} style={{ color: "#3F3F46" }} />
                <span className="text-[13px]" style={{ color: "#71717A" }}>
                  {formatDate(scout.earliestSignalDate ?? opp.project.issuedDate)} · {opp.timing}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Project details (if present) ─── */}
        {hasProjectDetails && (
          <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel>Project details</SectionLabel>
            {hasDescription && (
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#71717A" }}>
                {opp.project.description}
              </p>
            )}
            {(scout.unitCount || scout.storeyCount) && (
              <div className="flex gap-4">
                {scout.unitCount && (
                  <div
                    className="px-3 py-2 rounded-xl text-center"
                    style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-[16px] font-bold" style={{ color: "#F4F4F5" }}>{scout.unitCount}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "#52525B" }}>units</p>
                  </div>
                )}
                {scout.storeyCount && (
                  <div
                    className="px-3 py-2 rounded-xl text-center"
                    style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <p className="text-[16px] font-bold" style={{ color: "#F4F4F5" }}>{scout.storeyCount}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "#52525B" }}>storeys</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Suggested action ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Suggested action</SectionLabel>
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.15)" }}
          >
            <p className="text-[15px] font-semibold mb-4" style={{ color: "#34D399" }}>
              {opp.suggestedAction}
            </p>
            <div className="flex gap-2 flex-wrap">
              {opp.actionType === "email" && (
                <ActionButton
                  icon={<Mail size={13} strokeWidth={2.5} />}
                  label="Draft email"
                  onClick={() => {
                    const subject = encodeURIComponent(`Re: ${opp.project.name}`);
                    const body = encodeURIComponent(`Hi,\n\nI noticed the recent activity for ${opp.project.name} in ${opp.project.city} and wanted to reach out.\n\nWe specialize in [your trade] and would love to discuss how we can support this project.\n\nWould you have 10 minutes for a quick call?\n\nBest,`);
                    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
                  }}
                />
              )}
              {opp.actionType === "call" && (
                <ActionButton icon={<Phone size={13} strokeWidth={2.5} />} label="Call now" onClick={() => window.open("tel:", "_self")} />
              )}
              {(opp.actionType === "connect" || opp.actionType === "research") && (
                <ActionButton
                  icon={<ExternalLink size={13} strokeWidth={2.5} />}
                  label="Find contact"
                  onClick={() => {
                    const q = encodeURIComponent(`${opp.company.name} construction`);
                    window.open(`https://www.linkedin.com/search/results/people/?keywords=${q}`, "_blank");
                  }}
                />
              )}
              <ActionButton
                icon={<Building2 size={13} strokeWidth={2.5} />}
                label="Company profile"
                secondary
                onClick={() => {
                  const q = encodeURIComponent(opp.company.name);
                  window.open(`https://www.google.com/search?q=${q}+construction+company`, "_blank");
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Relationship path (if present) ─── */}
        {hasRelationship && (
          <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel>Your warm path in</SectionLabel>
            <div
              className="rounded-2xl p-4"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="text-[13px] font-semibold" style={{ color: "#FCD34D" }}>{opp.relationship.summary}</p>
                <span className="ml-auto text-[11px] font-semibold" style={{ color: "#F59E0B" }}>{opp.relationship.confidence}%</span>
              </div>
              <div className="flex flex-col gap-0">
                {opp.relationship.path.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={
                          step.type === "you"
                            ? { background: "linear-gradient(135deg, #00C875, #00A860)", color: "#fff", boxShadow: "0 0 10px rgba(0,200,117,0.3)" }
                            : step.type === "contact"
                            ? { background: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }
                            : { background: "rgba(255,255,255,0.07)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.1)" }
                        }
                      >
                        {step.type === "you" ? "Y" : step.label.charAt(0).toUpperCase()}
                      </div>
                      {i < opp.relationship.path.length - 1 && (
                        <div className="w-px flex-1 my-1" style={{ minHeight: 16, background: "linear-gradient(to bottom, rgba(245,158,11,0.3), rgba(245,158,11,0.1))" }} />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-[14px] font-semibold leading-tight" style={{ color: "#F4F4F5" }}>{step.label}</p>
                      {step.detail && <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>{step.detail}</p>}
                      {step.strength && step.strength !== "none" && <div className="mt-1.5"><StrengthPill strength={step.strength} /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Why Scout flagged this ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Why Scout flagged this</SectionLabel>
          <div className="flex flex-col gap-2">
            {opp.matchReasons.map((reason) => (
              <div
                key={reason.label}
                className="flex items-start gap-3 px-3 py-3 rounded-xl"
                style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#00C875" }} />
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "#F4F4F5" }}>{reason.label}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>{reason.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Companies on project (if present) ─── */}
        {hasCompanies && (
          <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel>Companies on project</SectionLabel>
            <div className="flex flex-col gap-2">
              {scout.companies!.map((co) => (
                <div
                  key={co.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Building2 size={16} style={{ color: "#52525B" }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold" style={{ color: "#F4F4F5" }}>{co.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>
                      {co.roles.join(", ")}
                    </p>
                  </div>
                  {co.phone && (
                    <button onClick={() => window.open(`tel:${co.phone}`, "_self")} className="pressable">
                      <Phone size={14} style={{ color: "#52525B" }} strokeWidth={2} />
                    </button>
                  )}
                  {co.email && (
                    <button onClick={() => window.open(`mailto:${co.email}`, "_self")} className="pressable">
                      <Mail size={14} style={{ color: "#52525B" }} strokeWidth={2} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Source evidence (always shown) ─── */}
        <div className="px-5 py-5">
          <SectionLabel>Source evidence</SectionLabel>
          <div className="flex flex-col gap-3">
            {hasSourceRecords
              ? scout.sourceRecords.map((sr, i) => (
                  <SourceEvidenceCard key={i} record={sr} />
                ))
              : (
                // Fallback for mock data: show a basic permit card
                <SourceEvidenceCard
                  record={{
                    source_type: "permit",
                    confidence: "medium",
                    title: opp.project.type + " permit",
                    excerpt: opp.project.description,
                    source_date: opp.project.issuedDate,
                  }}
                />
              )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  secondary = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  secondary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
      style={
        secondary
          ? { background: "rgba(255,255,255,0.05)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }
          : { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 14px rgba(0,200,117,0.25)" }
      }
    >
      {icon}
      {label}
    </button>
  );
}
