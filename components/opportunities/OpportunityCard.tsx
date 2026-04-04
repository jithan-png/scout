"use client";

import { MapPin, Clock, Building2, Globe, FileText, Linkedin, X } from "lucide-react";
import type { Opportunity, ScoutOpportunity, LeadSource } from "@/lib/types";

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85 ? "#00C875" : score >= 65 ? "#F59E0B" : "#71717A";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg
        width="44"
        height="44"
        style={{ position: "absolute", transform: "rotate(-90deg)" }}
      >
        {/* Tick marks — like a gauge dial */}
        {Array.from({ length: 8 }, (_, i) => {
          const angle = (i * Math.PI * 2) / 8;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          return (
            <line
              key={i}
              x1={22 + 19 * cos}
              y1={22 + 19 * sin}
              x2={22 + 21.5 * cos}
              y2={22 + 21.5 * sin}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          );
        })}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2.5"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="relative text-[13px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY = {
  hot: {
    label: "HOT",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.2)",
    dot: "#EF4444",
  },
  warm: {
    label: "WARM",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.2)",
    dot: "#F59E0B",
  },
  watch: {
    label: "WATCH",
    color: "#71717A",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.08)",
    dot: "#52525B",
  },
};

// ── Source badge ─────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<
  LeadSource,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  permit: {
    label: "PERMIT",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.10)",
    border: "rgba(96,165,250,0.2)",
    icon: <Building2 size={9} strokeWidth={2.5} />,
  },
  web: {
    label: "WEB",
    color: "#A1A1AA",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.09)",
    icon: <Globe size={9} strokeWidth={2.5} />,
  },
  procurement: {
    label: "TENDER",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.10)",
    border: "rgba(167,139,250,0.2)",
    icon: <FileText size={9} strokeWidth={2.5} />,
  },
  linkedin: {
    label: "LINKEDIN",
    color: "#22D3EE",
    bg: "rgba(34,211,238,0.10)",
    border: "rgba(34,211,238,0.2)",
    icon: <Linkedin size={9} strokeWidth={2.5} />,
  },
  unknown: {
    label: "SOURCE",
    color: "#52525B",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.06)",
    icon: <Globe size={9} strokeWidth={2.5} />,
  },
};

function SourceBadge({ source, count }: { source: LeadSource; count: number }) {
  if (count > 1) {
    return (
      <span
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.09)",
          color: "#71717A",
        }}
      >
        {count} SOURCES
      </span>
    );
  }
  const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.unknown;
  return (
    <span
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface OpportunityCardProps {
  opportunity: Opportunity | ScoutOpportunity;
  isSaved?: boolean;
  isLiked?: boolean;
  isDismissed?: boolean;
  onClick: () => void;
  onDismiss?: () => void;
  onRestore?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  index?: number;
}

export default function OpportunityCard({
  opportunity,
  isSaved,
  isLiked,
  isDismissed,
  onClick,
  onDismiss,
  onRestore,
  selectionMode,
  isSelected,
  onSelect,
  index = 0,
}: OpportunityCardProps) {
  const { project, company, relationship, matchReasons, score, priority, timing, suggestedAction } =
    opportunity;
  const p = PRIORITY[priority];

  // Source info (only present on ScoutOpportunity)
  const scoutOpp = opportunity as ScoutOpportunity;
  const primarySource: LeadSource = scoutOpp.primarySource ?? "unknown";
  const sourceCount = scoutOpp.sourceRecords?.length ?? 1;
  const firstRecord = scoutOpp.sourceRecords?.[0];
  const firstContact = scoutOpp.contacts?.[0];

  // Source-specific derived values
  const linkedinPoster = primarySource === "linkedin" ? (firstRecord?.poster_name ?? null) : null;
  const linkedinExcerpt = primarySource === "linkedin" ? (firstRecord?.excerpt ?? null) : null;
  const tenderUrl = primarySource === "procurement" ? (firstRecord?.source_url ?? null) : null;
  const tenderDate = primarySource === "procurement" ? (firstRecord?.source_date ?? null) : null;
  const webTitle = primarySource === "web" ? (firstRecord?.title ?? null) : null;
  const webExcerpt = primarySource === "web" ? (firstRecord?.excerpt ?? null) : null;
  const unitCount = scoutOpp.unitCount ?? null;
  const projectStageLabel = scoutOpp.projectStatus
    ? scoutOpp.projectStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <button
      onClick={selectionMode ? onSelect : onClick}
      className="w-full text-left pressable"
      style={{ animationDelay: `${index * 80}ms`, opacity: isDismissed ? 0.55 : 1 }}
    >
      <div
        className="rounded-2xl p-4 transition-all duration-200 relative overflow-hidden"
        style={{
          background: "#1C1C22",
          border: isSelected
            ? "1px solid rgba(0,200,117,0.5)"
            : isLiked
            ? "1px solid rgba(0,200,117,0.22)"
            : "1px solid rgba(255,255,255,0.07)",
          boxShadow: isLiked
            ? "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(0,200,117,0.12)"
            : "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Selection checkbox */}
        {selectionMode && (
          <div
            className="absolute top-3 left-3 z-10 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: isSelected ? "#00C875" : "rgba(255,255,255,0.08)",
              border: isSelected ? "none" : "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}

        {/* Dismiss X button — or Restore button when dismissed */}
        {!selectionMode && isDismissed && onRestore && (
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(); }}
            className="pressable absolute top-3 right-3 z-10 px-2 py-1 rounded-lg text-[11px] font-semibold"
            style={{ background: "rgba(0,200,117,0.1)", color: "#34D399", border: "1px solid rgba(0,200,117,0.2)" }}
            aria-label="Restore opportunity"
          >
            Restore
          </button>
        )}
        {!selectionMode && !isDismissed && onDismiss && (
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="pressable absolute top-3 right-3 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "transparent" }}
            aria-label="Remove opportunity"
          >
            <X size={12} strokeWidth={2.5} style={{ color: "#3F3F46" }} />
          </button>
        )}
        {/* Engineering drawing corner brackets */}
        {[
          { top: 6, left: 6, borderTop: "1px solid rgba(255,255,255,0.1)", borderLeft: "1px solid rgba(255,255,255,0.1)" },
          { top: 6, right: 6, borderTop: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" },
          { bottom: 6, left: 6, borderBottom: "1px solid rgba(255,255,255,0.1)", borderLeft: "1px solid rgba(255,255,255,0.1)" },
          { bottom: 6, right: 6, borderBottom: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", width: 10, height: 10, pointerEvents: "none", ...s }} />
        ))}

        {/* ── Top row ─── */}
        <div className="flex items-center justify-between mb-3" style={{ paddingLeft: selectionMode ? 28 : 0 }}>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: p.bg,
                border: `1px solid ${p.border}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: p.dot }}
              />
              <span
                className="text-[10px] font-bold tracking-wider"
                style={{ color: p.color }}
              >
                {p.label}
              </span>
            </div>
            <SourceBadge source={primarySource} count={sourceCount} />
          </div>

          <div className="flex items-center gap-2" style={{ marginRight: onDismiss && !selectionMode ? 20 : 0 }}>
            {isLiked && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(0,200,117,0.1)",
                  color: "#34D399",
                  border: "1px solid rgba(0,200,117,0.2)",
                }}
              >
                Liked
              </span>
            )}
            {isSaved && !isLiked && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#52525B",
                }}
              >
                Saved
              </span>
            )}
            <ScoreRing score={score} />
          </div>
        </div>

        {/* ── Project name + company ─── */}
        <h3
          className="text-[17px] font-bold leading-tight mb-0.5"
          style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}
        >
          {project.name}
        </h3>
        <p className="text-[13px]" style={{ color: "#52525B" }}>
          {company.name}
        </p>

        {/* ── Contact row (any source) ─── */}
        {firstContact && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
            >
              {firstContact.name.charAt(0)}
            </div>
            <p className="text-[11px]" style={{ color: "#71717A" }}>
              {firstContact.name} · {firstContact.role}
            </p>
          </div>
        )}

        {/* ── Source-aware narrative line ─── */}
        {linkedinExcerpt ? (
          <p className="text-[12px] leading-relaxed mt-1.5 mb-3 italic" style={{ color: "#52525B" }}>
            &ldquo;{linkedinExcerpt.slice(0, 120)}{linkedinExcerpt.length > 120 ? "…" : ""}&rdquo;
          </p>
        ) : webExcerpt ? (
          <p className="text-[12px] leading-relaxed mt-1.5 mb-3" style={{ color: "#52525B" }}>
            {webExcerpt.slice(0, 120)}{webExcerpt.length > 120 ? "…" : ""}
          </p>
        ) : matchReasons[0]?.detail ? (
          <p className="text-[12px] leading-relaxed mt-1.5 mb-3" style={{ color: "#52525B" }}>
            {matchReasons[0].detail}
          </p>
        ) : (
          <div className="mb-3" />
        )}

        {/* ── Meta row ─── */}
        {(() => {
          const isRecent = /just|today|hour|1\s*day/i.test(timing);
          return (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <MapPin size={10} style={{ color: "#3F3F46" }} />
              <span className="text-[12px]" style={{ color: "#71717A" }}>
                {project.city}
              </span>
              <span style={{ color: "#3F3F46" }}>·</span>
              <span className="text-[12px] font-semibold" style={{ color: "#71717A" }}>
                {formatValue(project.value)}
              </span>
              {unitCount && (
                <>
                  <span style={{ color: "#3F3F46" }}>·</span>
                  <span className="text-[12px]" style={{ color: "#71717A" }}>{unitCount} units</span>
                </>
              )}
              {projectStageLabel && (
                <>
                  <span style={{ color: "#3F3F46" }}>·</span>
                  <span className="text-[12px]" style={{ color: "#71717A" }}>{projectStageLabel}</span>
                </>
              )}
              <span style={{ color: "#3F3F46" }}>·</span>
              <Clock size={10} style={{ color: isRecent ? "#00C875" : "#3F3F46" }} />
              <span className="text-[12px]" style={{ color: isRecent ? "#34D399" : "#71717A" }}>
                {timing}
              </span>
            </div>
          );
        })()}

        {/* ── Warm path ─── */}
        {relationship.hasWarmPath && (
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-3"
            style={{
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.18)",
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p
              className="text-[12px] font-semibold"
              style={{ color: "#FCD34D" }}
            >
              {relationship.summary}
            </p>
          </div>
        )}

        {/* ── Match reasons ─── */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matchReasons.slice(0, 3).map((r) => (
            <span
              key={r.label}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#71717A",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {r.label}
            </span>
          ))}
        </div>

        {/* ── LinkedIn poster attribution ─── */}
        {linkedinPoster && (
          <p className="text-[11px] mb-3" style={{ color: "#3F3F46" }}>
            via {linkedinPoster}{firstRecord?.poster_company ? ` · ${firstRecord.poster_company}` : ""}
          </p>
        )}

        {/* ── Web title ─── */}
        {webTitle && !webExcerpt && (
          <p className="text-[11px] mb-3 truncate" style={{ color: "#3F3F46" }}>
            {webTitle}
          </p>
        )}

        {/* ── Tender date ─── */}
        {tenderDate && (
          <p className="text-[11px] mb-3" style={{ color: "#A78BFA" }}>
            Closes {new Date(tenderDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
          </p>
        )}

        {/* ── Suggested action / tender CTA ─── */}
        <div
          className="pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#3F3F46" }}>
            Next step
          </p>
          {tenderUrl ? (
            <p className="text-[12px] font-semibold" style={{ color: "#A78BFA" }}>
              View tender document →
            </p>
          ) : (
            <p className="text-[12px] font-semibold" style={{ color: "#34D399" }}>
              {suggestedAction}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
