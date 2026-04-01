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
  Wrench,
  Clock,
  Users,
  Search,
  ClipboardList,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useRouter as useNextRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import ScoreBreakdown from "@/components/opportunities/ScoreBreakdown";
import FloatingChat from "@/components/ui/FloatingChat";
import type { RelationshipStrength, ScoutOpportunity, LeadSourceRecord } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Sales stages ──────────────────────────────────────────────────────────────

const SALES_STAGES = [
  { id: "research",  label: "Research",          step: 1 },
  { id: "outreach",  label: "Initial Outreach",  step: 2 },
  { id: "followup",  label: "Follow Up",         step: 3 },
  { id: "meeting",   label: "Discovery Meeting", step: 4 },
  { id: "proposal",  label: "Proposal",          step: 5 },
];

function getStageFromActionType(actionType: string): number {
  if (actionType === "research") return 0;
  if (actionType === "email" || actionType === "connect") return 1;
  if (actionType === "call") return 2;
  return 1;
}

// ── Score dimension explanations ──────────────────────────────────────────────

const DIM_EXPLAIN: Record<string, string> = {
  request_fit:  "How well this project matches your trades and target project types",
  relationship: "Strength of your connections to people on this project",
  timing:       "How early you are — permits just filed score highest",
  commercial:   "Estimated project value and contract potential",
  confidence:   "Quality and completeness of the underlying data",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StrengthPill({ strength }: { strength: RelationshipStrength }) {
  const cfg: Record<RelationshipStrength, { label: string; color: string; bg: string }> = {
    strong: { label: "Strong", color: "#34D399", bg: "rgba(0,200,117,0.12)" },
    medium: { label: "Medium", color: "#FCD34D", bg: "rgba(245,158,11,0.12)" },
    weak:   { label: "Weak",   color: "#71717A", bg: "rgba(255,255,255,0.06)" },
    none:   { label: "None",   color: "#52525B", bg: "rgba(255,255,255,0.04)" },
  };
  const c = cfg[strength];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: c.color, background: c.bg }}>
      {c.label}
    </span>
  );
}

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

function ActionButton({
  icon, label, secondary = false, onClick,
}: {
  icon: React.ReactNode; label: string; secondary?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
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

// ── Source evidence card ──────────────────────────────────────────────────────

function SourceEvidenceCard({ record }: { record: LeadSourceRecord }) {
  const sourceConfigs = {
    permit: { icon: <Building2 size={13} strokeWidth={2} />, label: "Official Permit Record", color: "#60A5FA", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.18)" },
    web: { icon: <Globe size={13} strokeWidth={2} />, label: "Web Mention", color: "#A1A1AA", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)" },
    procurement: { icon: <FileText size={13} strokeWidth={2} />, label: "Public Tender", color: "#A78BFA", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)" },
    linkedin: { icon: <Linkedin size={13} strokeWidth={2} />, label: "LinkedIn Signal", color: "#22D3EE", bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.18)" },
    unknown: { icon: <Globe size={13} strokeWidth={2} />, label: "External Source", color: "#52525B", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)" },
  };

  const cfg = sourceConfigs[record.source_type] ?? sourceConfigs.unknown;
  const postUrl = record.linkedin_post_url ?? record.source_url;

  return (
    <div className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
        {record.source_date && (
          <span className="ml-auto text-[11px]" style={{ color: "#52525B" }}>{formatDate(record.source_date)}</span>
        )}
      </div>
      {record.source_type === "linkedin" && (record.poster_name || record.poster_company) && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE" }}>
            {record.poster_name?.charAt(0) ?? "?"}
          </div>
          <span className="text-[12px] font-semibold" style={{ color: "#F4F4F5" }}>{record.poster_name ?? "Unknown poster"}</span>
          {record.poster_company && <span className="text-[12px]" style={{ color: "#71717A" }}>at {record.poster_company}</span>}
        </div>
      )}
      {record.title && <p className="text-[13px] font-semibold mb-1" style={{ color: "#F4F4F5" }}>{record.title}</p>}
      {record.excerpt && (
        <p className="text-[12px] leading-relaxed mb-2" style={{ color: "#71717A" }}>
          {record.excerpt.slice(0, 200)}{record.excerpt.length > 200 ? "…" : ""}
        </p>
      )}
      {postUrl && (
        <button onClick={() => window.open(postUrl, "_blank")} className="pressable flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: cfg.color }}>
          <ExternalLink size={11} strokeWidth={2.5} />
          {record.source_type === "linkedin" ? "View post" : record.source_type === "procurement" ? "View tender" : "View source"}
        </button>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { opportunities, savedOpportunityIds, saveOpportunity, unsaveOpportunity, setup } = useAppStore();

  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [emailDraftOpen, setEmailDraftOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

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

  const scout = opp as ScoutOpportunity;
  const isSaved = savedOpportunityIds.has(opp.id);
  const priorityColor = opp.priority === "hot" ? "#EF4444" : opp.priority === "warm" ? "#F59E0B" : "#71717A";

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

  // Sales stage
  const stageIdx = getStageFromActionType(opp.actionType);
  const currentStage = SALES_STAGES[stageIdx];

  // Draft email body
  const userTrades = setup.whatISell.slice(0, 2).join(" and ") || "our services";
  const contactName = scout.contacts?.[0]?.name ?? scout.companies?.[0]?.name ?? "there";
  const emailSubject = `Following up on ${opp.project.name}`;
  const emailBody = `Hi ${contactName},

I came across the recent ${opp.project.type.toLowerCase()} activity for ${opp.project.name}${opp.project.city ? ` in ${opp.project.city}` : ""} and wanted to reach out.

We specialize in ${userTrades} and have worked on similar ${opp.project.type.toLowerCase()} projects in the area${displayValue ? ` — this looks like a ${formatValue(displayValue)} project` : ""}.

Would you be open to a quick 10-minute call to explore whether there's a fit?

Best regards,`;

  const copyEmail = () => {
    const full = `Subject: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(full).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    });
  };

  const openInScout = () => {
    const q = encodeURIComponent(`Refine this email draft for ${opp.project.name}:\n\n${emailBody}`);
    router.push(`/scout?q=${q}`);
  };

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

      <div className="pb-28 animate-fade-up">

        {/* ── Hero: priority + name + score ─── */}
        <div className="px-5 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: priorityColor }}>
              {opp.priority}
            </span>
            <span style={{ color: "#3F3F46" }}>·</span>
            <span className="text-[12px]" style={{ color: "#52525B" }}>{opp.project.type}</span>
          </div>

          <div className="flex items-start justify-between gap-3 mb-5">
            <h1 className="flex-1 text-[22px] font-bold leading-tight" style={{ letterSpacing: "-0.025em", color: "#F4F4F5" }}>
              {opp.project.name}
            </h1>
            <LargeScoreRing score={opp.score} />
          </div>

          {/* Score breakdown — always visible, collapsible for detail */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={() => setScoreExpanded(!scoreExpanded)}
              className="pressable w-full flex items-center justify-between px-4 pt-4 pb-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#3F3F46" }}>
                  Opportunity score
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: priorityColor, background: `${priorityColor}18` }}>
                  {opp.score}/100
                </span>
              </div>
              <span style={{ color: "#52525B" }}>
                {scoreExpanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
              </span>
            </button>

            <div className="px-4 pb-4">
              {hasScoreBreakdown ? (
                <ScoreBreakdown breakdown={scout.scoreBreakdown} collapsed={!scoreExpanded} />
              ) : (
                /* Fallback when no breakdown data */
                <div className="flex items-center gap-3">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${opp.score}%`, background: priorityColor }} />
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: priorityColor }}>{opp.score}%</span>
                </div>
              )}

              {/* Explanation text when expanded */}
              {scoreExpanded && hasScoreBreakdown && (
                <div className="mt-4 pt-4 flex flex-col gap-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  {Object.entries(DIM_EXPLAIN).map(([key, text]) => (
                    <div key={key} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#3F3F46" }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: "#52525B" }}>
                        <span className="font-semibold" style={{ color: "#71717A" }}>
                          {key === "request_fit" ? "Request fit" : key === "confidence" ? "Data quality" : key.charAt(0).toUpperCase() + key.slice(1)}:
                        </span>{" "}
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Connection paths — always shown ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Connection paths</SectionLabel>
          {hasRelationship ? (
            <div className="rounded-2xl p-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Users size={11} color="#F59E0B" strokeWidth={2.5} />
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
          ) : (
            /* No direct connection state */
            <div className="rounded-2xl p-4" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[13px] font-semibold mb-1" style={{ color: "#A1A1AA" }}>No direct connection found yet</p>
              <p className="text-[12px] mb-4" style={{ color: "#52525B" }}>Scout hasn't mapped a warm path to this project. You can search for one manually.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(opp.company.name)}`, "_blank")}
                  className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.18)", color: "#22D3EE" }}
                >
                  <Linkedin size={12} strokeWidth={2} />
                  Search LinkedIn
                </button>
                <button
                  onClick={() => router.push(`/scout?q=${encodeURIComponent(`Who do I know connected to ${opp.company.name}?`)}`)}
                  className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.18)", color: "#34D399" }}
                >
                  <Sparkles size={12} strokeWidth={2} />
                  Ask Scout
                </button>
                <button
                  onClick={() => router.push("/profile")}
                  className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717A" }}
                >
                  <Users size={12} strokeWidth={2} />
                  Browse contacts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Location ─── */}
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

        {/* ── Value + timeline ─── */}
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

        {/* ── Project details ─── */}
        {hasProjectDetails && (
          <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel>Project details</SectionLabel>
            {hasDescription && (
              <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#71717A" }}>{opp.project.description}</p>
            )}
            {(scout.unitCount || scout.storeyCount) && (
              <div className="flex gap-4">
                {scout.unitCount && (
                  <div className="px-3 py-2 rounded-xl text-center" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[16px] font-bold" style={{ color: "#F4F4F5" }}>{scout.unitCount}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "#52525B" }}>units</p>
                  </div>
                )}
                {scout.storeyCount && (
                  <div className="px-3 py-2 rounded-xl text-center" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[16px] font-bold" style={{ color: "#F4F4F5" }}>{scout.storeyCount}</p>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: "#52525B" }}>storeys</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Sales sequence ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Next step</SectionLabel>

          {/* Stage progress */}
          <div className="rounded-2xl p-4 mb-3" style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.15)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#34D399" }}>
                Stage {currentStage.step} of {SALES_STAGES.length}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: "#52525B" }}>{currentStage.label}</span>
            </div>

            {/* Mini progress bar */}
            <div className="flex gap-1 mb-3">
              {SALES_STAGES.map((s, i) => (
                <div
                  key={s.id}
                  className="flex-1 rounded-full transition-all duration-500"
                  style={{
                    height: 3,
                    background: i < stageIdx ? "rgba(0,200,117,0.5)" : i === stageIdx ? "#00C875" : "rgba(255,255,255,0.08)",
                    boxShadow: i === stageIdx ? "0 0 6px rgba(0,200,117,0.5)" : "none",
                  }}
                />
              ))}
            </div>

            <p className="text-[13px] font-semibold mb-4" style={{ color: "#34D399" }}>
              {opp.suggestedAction}
            </p>

            {/* Action buttons — horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => { setEmailDraftOpen(!emailDraftOpen); setQuoteOpen(false); }}
                className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                style={
                  emailDraftOpen
                    ? { background: "rgba(0,200,117,0.15)", color: "#34D399", border: "1px solid rgba(0,200,117,0.3)" }
                    : { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 14px rgba(0,200,117,0.25)" }
                }
              >
                <Mail size={13} strokeWidth={2.5} />
                Draft email
              </button>

              {(scout.contacts?.[0]?.phone || scout.companies?.[0]?.phone) && (
                <button
                  onClick={() => window.open(`tel:${scout.contacts?.[0]?.phone ?? scout.companies?.[0]?.phone}`, "_self")}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Phone size={13} strokeWidth={2.5} />
                  Call
                </button>
              )}

              <button
                onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(opp.company.name)}`, "_blank")}
                className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                style={{ background: "rgba(34,211,238,0.08)", color: "#22D3EE", border: "1px solid rgba(34,211,238,0.18)" }}
              >
                <Linkedin size={13} strokeWidth={2.5} />
                LinkedIn
              </button>

              <button
                onClick={() => { setQuoteOpen(!quoteOpen); setEmailDraftOpen(false); }}
                className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                style={{ background: "rgba(167,139,250,0.08)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.18)" }}
              >
                <ClipboardList size={13} strokeWidth={2.5} />
                Create quote
              </button>

              <button
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(opp.company.name + " construction")}`, "_blank")}
                className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", color: "#71717A", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Search size={13} strokeWidth={2.5} />
                Research
              </button>
            </div>
          </div>

          {/* Draft email — inline expansion */}
          {emailDraftOpen && (
            <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ background: "#1C1C22", border: "1px solid rgba(0,200,117,0.2)" }}>
              {/* Email header */}
              <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={13} style={{ color: "#00C875" }} strokeWidth={2} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#00C875" }}>Draft email</span>
                </div>
                <div className="flex gap-2 text-[12px] mb-1">
                  <span style={{ color: "#3F3F46", width: 48, flexShrink: 0 }}>To:</span>
                  <span style={{ color: "#71717A" }}>{contactName !== "there" ? contactName : opp.company.name}</span>
                </div>
                <div className="flex gap-2 text-[12px]">
                  <span style={{ color: "#3F3F46", width: 48, flexShrink: 0 }}>Subject:</span>
                  <span style={{ color: "#F4F4F5", fontWeight: 500 }}>{emailSubject}</span>
                </div>
              </div>

              {/* Email body */}
              <div className="px-4 py-4">
                <pre className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "#A1A1AA" }}>
                  {emailBody}
                </pre>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={copyEmail}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={
                    emailCopied
                      ? { background: "rgba(0,200,117,0.12)", color: "#34D399", border: "1px solid rgba(0,200,117,0.25)" }
                      : { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 12px rgba(0,200,117,0.2)" }
                  }
                >
                  {emailCopied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2.5} />}
                  {emailCopied ? "Copied!" : "Copy email"}
                </button>
                <button
                  onClick={openInScout}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Sparkles size={13} strokeWidth={2.5} />
                  Refine in Scout
                </button>
              </div>
            </div>
          )}

          {/* Create quote placeholder */}
          {quoteOpen && (
            <div className="rounded-2xl p-4 animate-fade-up" style={{ background: "#1C1C22", border: "1px solid rgba(167,139,250,0.2)" }}>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList size={13} style={{ color: "#A78BFA" }} strokeWidth={2} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#A78BFA" }}>Quote builder</span>
              </div>
              <p className="text-[13px]" style={{ color: "#71717A" }}>
                Coming soon — set up your pricing template in Profile and Scout will auto-fill quotes for each opportunity.
              </p>
              <button
                onClick={() => router.push("/profile")}
                className="pressable flex items-center gap-1.5 mt-3 text-[12px] font-semibold"
                style={{ color: "#A78BFA" }}
              >
                Set up pricing <ArrowRight size={11} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        {/* ── Why Scout flagged this ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Why Scout flagged this</SectionLabel>
          <div className="flex flex-col gap-2">
            {opp.matchReasons.map((reason) => {
              const iconMap: Record<string, React.ReactNode> = {
                trade_match:  <Wrench size={13} strokeWidth={2} style={{ color: "#00C875" }} />,
                timing:       <Clock size={13} strokeWidth={2} style={{ color: "#F59E0B" }} />,
                relationship: <Users size={13} strokeWidth={2} style={{ color: "#FCD34D" }} />,
                location:     <MapPin size={13} strokeWidth={2} style={{ color: "#60A5FA" }} />,
              };
              const icon = iconMap[reason.type] ?? (
                <div className="w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0" style={{ background: "#00C875" }} />
              );
              return (
                <div
                  key={reason.label}
                  className="flex items-start gap-3 px-3 py-3 rounded-xl"
                  style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#F4F4F5" }}>{reason.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "#71717A" }}>{reason.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Companies on project ─── */}
        {hasCompanies && (
          <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel>Companies on project</SectionLabel>
            <div className="flex flex-col gap-2">
              {scout.companies!.map((co) => (
                <div key={co.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <Building2 size={16} style={{ color: "#52525B" }} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold" style={{ color: "#F4F4F5" }}>{co.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>{co.roles.join(", ")}</p>
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

        {/* ── Source evidence ─── */}
        <div className="px-5 py-5">
          <SectionLabel>Source evidence</SectionLabel>
          <div className="flex flex-col gap-3">
            {hasSourceRecords
              ? scout.sourceRecords.map((sr, i) => <SourceEvidenceCard key={i} record={sr} />)
              : (
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

      <FloatingChat
        context={`Opportunity: ${opp.project.name}, ${opp.company.name}, ${opp.project.city}${(scout.estimatedValue ?? opp.project.value) ? `, ${formatValue(scout.estimatedValue ?? opp.project.value!)}` : ""}, score ${opp.score}`}
      />

      {/* Soft auth bar — shown to unauthenticated users */}
      {!session && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 z-50"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)", paddingTop: 12, background: "rgba(9,9,11,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[12px] text-center mb-2" style={{ color: "#52525B" }}>
            Sign in to draft outreach, save this lead, and chat with Scout
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => signIn("google", { callbackUrl: `/opportunities/${params.id}` })}
              className="pressable flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold"
              style={{ background: "#fff", color: "#111" }}
            >
              <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              onClick={() => router.back()}
              className="pressable px-4 py-3 rounded-xl text-[13px] font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "#52525B" }}
            >
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
