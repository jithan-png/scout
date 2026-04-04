"use client";

import {
  ArrowLeft, MapPin, Calendar, DollarSign, Building2, Mail, Phone,
  ExternalLink, Globe, FileText, Linkedin, ChevronDown, ChevronUp,
  Wrench, Clock, Users, Search, Copy, Check, Sparkles, Share2, Heart,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import ScoreBreakdown from "@/components/opportunities/ScoreBreakdown";
import FloatingChat from "@/components/ui/FloatingChat";
import SignInSheet from "@/components/ui/SignInSheet";
import { oppToCRMText, oppsToCSV, triggerCSVDownload } from "@/lib/export-utils";
import type { Opportunity, ScoutOpportunity, RelationshipStrength, LeadSourceRecord } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

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

function SourceEvidenceCard({ record }: { record: LeadSourceRecord }) {
  const cfgs = {
    permit:      { icon: <Building2 size={13} strokeWidth={2} />, label: "Official Permit Record", color: "#60A5FA", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.18)" },
    web:         { icon: <Globe size={13} strokeWidth={2} />, label: "Web Mention", color: "#A1A1AA", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)" },
    procurement: { icon: <FileText size={13} strokeWidth={2} />, label: "Public Tender", color: "#A78BFA", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.18)" },
    linkedin:    { icon: <Linkedin size={13} strokeWidth={2} />, label: "LinkedIn Signal", color: "#22D3EE", bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.18)" },
    unknown:     { icon: <Globe size={13} strokeWidth={2} />, label: "External Source", color: "#52525B", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)" },
  };
  const cfg = cfgs[record.source_type] ?? cfgs.unknown;
  const postUrl = record.linkedin_post_url ?? record.source_url;
  return (
    <div className="rounded-xl p-4" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
        {record.source_date && <span className="ml-auto text-[11px]" style={{ color: "#52525B" }}>{formatDate(record.source_date)}</span>}
      </div>
      {record.source_type === "linkedin" && (record.poster_name || record.poster_company) && (
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE" }}>
            {record.poster_name?.charAt(0) ?? "?"}
          </div>
          <span className="text-[12px] font-semibold" style={{ color: "#F4F4F5" }}>{record.poster_name ?? "Unknown poster"}</span>
          {record.poster_company && <span className="text-[12px]" style={{ color: "#A1A1AA" }}>at {record.poster_company}</span>}
        </div>
      )}
      {record.title && <p className="text-[13px] font-semibold mb-1" style={{ color: "#F4F4F5" }}>{record.title}</p>}
      {record.excerpt && <p className="text-[12px] leading-relaxed mb-2" style={{ color: "#A1A1AA" }}>{record.excerpt.slice(0, 200)}{record.excerpt.length > 200 ? "…" : ""}</p>}
      {postUrl && (
        <button onClick={() => window.open(postUrl, "_blank")} className="pressable flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: cfg.color }}>
          <ExternalLink size={11} strokeWidth={2.5} />
          {record.source_type === "linkedin" ? "View post" : record.source_type === "procurement" ? "View tender" : "View source"}
        </button>
      )}
    </div>
  );
}

function StreetViewImage({ src, className = "" }: { src: string; className?: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Street view" onError={() => setHidden(true)} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-1.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Street view</span>
      </div>
    </div>
  );
}

// ── Export sheet ──────────────────────────────────────────────────────────────

function ExportSheet({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopyForCRM = () => {
    navigator.clipboard.writeText(oppToCRMText(opp)).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); onClose(); }, 1500);
    });
  };

  const handleExportCSV = () => {
    triggerCSVDownload(oppsToCSV([opp]), `${opp.project.name.replace(/[^a-z0-9]/gi, "_")}.csv`);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[60]" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[61] rounded-t-3xl p-6 animate-fade-up"
        style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-[14px] font-bold mb-4" style={{ color: "#F4F4F5" }}>Export lead</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExportCSV}
            className="pressable flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-semibold"
            style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.2)", color: "#34D399" }}
          >
            <FileText size={16} strokeWidth={2} />
            Download CSV
          </button>
          <button
            onClick={handleCopyForCRM}
            className="pressable flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[14px] font-semibold"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: copied ? "#34D399" : "#A1A1AA" }}
          >
            {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={2} />}
            {copied ? "Copied!" : "Copy for CRM"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface OpportunityDetailContentProps {
  opp: Opportunity;
  onBack?: () => void;
  /** If true: no FloatingChat, no auth bar, no safe-top spacer. Used inside panel. */
  compact?: boolean;
  signInCallbackUrl?: string;
}

export default function OpportunityDetailContent({
  opp,
  onBack,
  compact = false,
  signInCallbackUrl,
}: OpportunityDetailContentProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { setup, savedOpportunityIds, saveOpportunity, unsaveOpportunity, contactedOpportunityIds, markContacted, likedOpportunityIds, likeOpportunity, setPendingScoutMessage } = useAppStore();

  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [emailDraftOpen, setEmailDraftOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [signInSheetOpen, setSignInSheetOpen] = useState(false);
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [floatingQuery, setFloatingQuery] = useState<string | null>(null);
  const handleAskScout = (query: string) => {
    if (compact) {
      setPendingScoutMessage(query);
    } else {
      setFloatingQuery(null); // reset so useEffect in FloatingChat fires again
      setTimeout(() => setFloatingQuery(query), 10);
    }
  };

  const scout = opp as ScoutOpportunity;
  const isSaved = savedOpportunityIds.has(opp.id);
  const isContacted = contactedOpportunityIds.has(opp.id);
  const isLiked = likedOpportunityIds.has(opp.id);

  const priorityColor = opp.priority === "hot" ? "#EF4444" : opp.priority === "warm" ? "#F59E0B" : "#71717A";
  const actionColor = opp.priority === "hot" ? "#00C875" : opp.priority === "warm" ? "#F59E0B" : "#71717A";

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

  function buildScoreNarrative() {
    const parts: string[] = [];
    if (scout.scoreBreakdown) {
      const bd = scout.scoreBreakdown;
      if (bd.request_fit >= 22) parts.push("strong trade match");
      else if (bd.request_fit >= 15) parts.push("decent trade match");
      if (bd.relationship >= 20) parts.push("direct warm path");
      else if (bd.relationship >= 10) parts.push("indirect connection");
      if (bd.timing >= 16) parts.push("ideal timing");
      else if (bd.timing >= 10) parts.push("good timing");
      if (bd.commercial >= 12) parts.push("high-value contract");
    }
    if (parts.length === 0) return `Scout rated this ${opp.score}/100 based on your profile.`;
    const joined = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];
    return `${joined.charAt(0).toUpperCase() + joined.slice(1)} — Scout rates this ${opp.score}/100.`;
  }

  const relationshipNarrative = hasRelationship ? (() => {
    const contact = opp.relationship.path.find(s => s.type === "contact");
    const company = opp.relationship.path.find(s => s.type === "company");
    if (contact && company) return `You know ${contact.label}${contact.detail ? ` — ${contact.detail}` : ""}. They can connect you directly to ${company.label}.`;
    return opp.relationship.summary;
  })() : null;

  const userTrades = setup.whatISell.slice(0, 2).join(" and ") || "our services";
  const contactName = scout.contacts?.[0]?.name ?? scout.companies?.[0]?.name ?? "there";
  const emailSubject = `Following up on ${opp.project.name}`;
  const emailBody = `Hi ${contactName},

I came across the recent ${opp.project.type.toLowerCase()} activity for ${opp.project.name}${opp.project.city ? ` in ${opp.project.city}` : ""} and wanted to reach out.

We specialize in ${userTrades} and have worked on similar ${opp.project.type.toLowerCase()} projects in the area${displayValue ? ` — this looks like a ${formatValue(displayValue)} project` : ""}.

Would you be open to a quick 10-minute call to explore whether there's a fit?

Best regards,`;

  const copyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
      markContacted(opp.id);
      likeOpportunity(opp);
    });
  };

  const handleCallAction = () => {
    window.open(`tel:${scout.contacts?.[0]?.phone ?? scout.companies?.[0]?.phone ?? ""}`, "_self");
    markContacted(opp.id);
    likeOpportunity(opp);
  };

  const handleEmailDraftOpen = () => {
    setEmailDraftOpen(!emailDraftOpen);
    if (!emailDraftOpen) { markContacted(opp.id); likeOpportunity(opp); }
  };

  const callbackUrl = signInCallbackUrl ?? `/opportunities/${opp.id}`;

  return (
    <div className="flex flex-col min-h-0">
      {/* ── Header ─── */}
      <header
        className="px-5 pt-4 pb-3 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="pressable w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft size={17} strokeWidth={2} style={{ color: "#A1A1AA" }} />
          </button>
        )}
        <p className="flex-1 text-[13px] font-medium truncate" style={{ color: "#52525B" }}>
          {opp.company.name}
        </p>
        <div className="flex items-center gap-2">
          {/* Like button */}
          <button
            onClick={() => likeOpportunity(opp)}
            className="pressable w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: isLiked ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.05)",
              border: isLiked ? "1px solid rgba(0,200,117,0.3)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Heart
              size={15}
              strokeWidth={2}
              style={{ color: isLiked ? "#00C875" : "#71717A" }}
              fill={isLiked ? "#00C875" : "none"}
            />
          </button>
          {/* Export button */}
          <button
            onClick={() => setExportSheetOpen(true)}
            className="pressable w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <Share2 size={15} strokeWidth={2} style={{ color: "#71717A" }} />
          </button>
        </div>
      </header>

      {/* ── Scrollable content ─── */}
      <div className={`overflow-y-auto flex-1 animate-fade-up ${compact ? "pb-4" : "pb-28"}`}>

        {/* ── Hero ─── */}
        <div className="px-5 pt-5 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: priorityColor }}>{opp.priority}</span>
            <span style={{ color: "#3F3F46" }}>·</span>
            <span className="text-[12px]" style={{ color: "#52525B" }}>{opp.project.type}</span>
            {isContacted && (
              <>
                <span style={{ color: "#3F3F46" }}>·</span>
                <span className="text-[10px] font-semibold" style={{ color: "#00C875" }}>Contacted</span>
              </>
            )}
            {isLiked && !isContacted && (
              <>
                <span style={{ color: "#3F3F46" }}>·</span>
                <span className="text-[10px] font-semibold" style={{ color: "#00C875" }}>Liked</span>
              </>
            )}
          </div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <h1 className="flex-1 text-[22px] font-bold leading-tight" style={{ letterSpacing: "-0.025em", color: "#F4F4F5" }}>
              {opp.project.name}
            </h1>
            <LargeScoreRing score={opp.score} />
          </div>

          {/* ── Next Best Action ── */}
          <div className="rounded-2xl p-4" style={{ background: `${actionColor}0d`, border: `1px solid ${actionColor}28` }}>
            <p className="text-[13px] font-semibold mb-2" style={{ color: "#F4F4F5" }}>{opp.suggestedAction}</p>
            <p className="text-[12px] mb-3" style={{ color: "#A1A1AA" }}>{buildScoreNarrative()}</p>
            <div className="flex gap-2">
              {opp.actionType === "email" || opp.actionType === "connect" ? (
                <button onClick={handleEmailDraftOpen}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 14px rgba(0,200,117,0.25)" }}>
                  <Mail size={13} strokeWidth={2.5} />Draft email
                </button>
              ) : opp.actionType === "call" ? (
                <button onClick={handleCallAction}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 14px rgba(0,200,117,0.25)" }}>
                  <Phone size={13} strokeWidth={2.5} />Call now
                </button>
              ) : (
                <button onClick={() => handleAskScout(`Research ${opp.company.name} — who are the key contacts and how should I approach them for ${opp.project.type}?`)}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Search size={13} strokeWidth={2.5} />Research
                </button>
              )}
              <button onClick={() => setScoreExpanded(!scoreExpanded)}
                className="pressable flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-medium"
                style={{ background: "rgba(255,255,255,0.05)", color: "#52525B", border: "1px solid rgba(255,255,255,0.07)" }}>
                {scoreExpanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
                Score
              </button>
            </div>
            {scoreExpanded && hasScoreBreakdown && (
              <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${actionColor}20` }}>
                <ScoreBreakdown breakdown={scout.scoreBreakdown} collapsed={false} />
              </div>
            )}
          </div>
        </div>

        {/* ── Connection paths ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Connection paths</SectionLabel>
          {!session ? (
            <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex flex-col gap-3 mb-4" style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none" }}>
                {[0,1,2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }} />
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="h-3 rounded-full w-32" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-2.5 rounded-full w-24" style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold mb-1" style={{ color: "#F4F4F5" }}>Scout found a connection to {opp.company.name}</p>
                <p className="text-[12px] mb-3" style={{ color: "#A1A1AA" }}>Sign in to see who you know and how to get introduced.</p>
                <button onClick={() => setSignInSheetOpen(true)} className="pressable px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D" }}>
                  Reveal connection →
                </button>
              </div>
            </div>
          ) : hasRelationship ? (
            <div className="rounded-2xl p-4" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Users size={11} color="#F59E0B" strokeWidth={2.5} />
                </div>
                <p className="text-[13px] font-semibold" style={{ color: "#FCD34D" }}>{opp.relationship.summary}</p>
                <span className="ml-auto text-[11px] font-semibold" style={{ color: "#F59E0B" }}>{opp.relationship.confidence}%</span>
              </div>
              {relationshipNarrative && <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#A1A1AA" }}>{relationshipNarrative}</p>}
              <div className="flex flex-col gap-0">
                {opp.relationship.path.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={step.type === "you" ? { background: "linear-gradient(135deg, #00C875, #00A860)", color: "#fff", boxShadow: "0 0 10px rgba(0,200,117,0.3)" }
                          : step.type === "contact" ? { background: "rgba(245,158,11,0.15)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.3)" }
                          : { background: "rgba(255,255,255,0.07)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {step.type === "you" ? "Y" : step.label.charAt(0).toUpperCase()}
                      </div>
                      {i < opp.relationship.path.length - 1 && (
                        <div className="w-px flex-1 my-1" style={{ minHeight: 16, background: "linear-gradient(to bottom, rgba(245,158,11,0.3), rgba(245,158,11,0.1))" }} />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-[14px] font-semibold leading-tight" style={{ color: "#F4F4F5" }}>{step.label}</p>
                      {step.detail && <p className="text-[12px] mt-0.5" style={{ color: "#A1A1AA" }}>{step.detail}</p>}
                      {step.strength && step.strength !== "none" && <div className="mt-1.5"><StrengthPill strength={step.strength} /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[13px] font-semibold mb-1" style={{ color: "#A1A1AA" }}>No direct connection found yet</p>
              <p className="text-[12px] mb-4" style={{ color: "#A1A1AA" }}>Scout hasn't mapped a warm path to this project.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleAskScout(`Find contact info and key decision makers at ${opp.company.name}. Look for the owner, estimator, or project manager.`)}
                  className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.18)", color: "#34D399" }}>
                  <Search size={12} strokeWidth={2} />Find contacts
                </button>
                <button onClick={() => handleAskScout(`Who do I know connected to ${opp.company.name}? Find any warm path.`)}
                  className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.18)", color: "#34D399" }}>
                  <Sparkles size={12} strokeWidth={2} />Ask Scout
                </button>
                <button onClick={() => router.push("/profile")}
                  className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717A" }}>
                  <Users size={12} strokeWidth={2} />Browse contacts
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Value + timeline ─── */}
        {(hasValue || hasTimeline) && (
          <div className="px-5 py-4 flex gap-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {hasValue && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#3F3F46" }}>Estimated Value</p>
                <div className="flex items-center gap-1.5">
                  <DollarSign size={13} style={{ color: "#52525B" }} />
                  <span className="text-[15px] font-bold" style={{ color: "#F4F4F5" }}>{formatValue(displayValue)}</span>
                </div>
              </div>
            )}
            {hasTimeline && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#3F3F46" }}>Filed</p>
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} style={{ color: "#52525B" }} />
                  <span className="text-[14px] font-semibold" style={{ color: "#A1A1AA" }}>{formatDate(scout.earliestSignalDate ?? opp.project.issuedDate)}</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>{opp.timing}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Project details ─── */}
        {hasProjectDetails && (
          <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <SectionLabel>Project details</SectionLabel>
            <div className="rounded-2xl p-4" style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}>
              {hasDescription && <p className="text-[14px] leading-relaxed" style={{ color: "#A1A1AA", marginBottom: (scout.unitCount || scout.storeyCount) ? 16 : 0 }}>{opp.project.description}</p>}
              {(scout.unitCount || scout.storeyCount) && (
                <div className="flex gap-3">
                  {scout.unitCount && (
                    <div className="px-4 py-3 rounded-xl text-center flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-[22px] font-bold" style={{ color: "#F4F4F5" }}>{scout.unitCount}</p>
                      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "#52525B" }}>units</p>
                    </div>
                  )}
                  {scout.storeyCount && (
                    <div className="px-4 py-3 rounded-xl text-center flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <p className="text-[22px] font-bold" style={{ color: "#F4F4F5" }}>{scout.storeyCount}</p>
                      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "#52525B" }}>storeys</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
                    <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>{co.roles.join(", ")}</p>
                  </div>
                  {co.phone && <button onClick={() => window.open(`tel:${co.phone}`, "_self")} className="pressable"><Phone size={14} style={{ color: "#52525B" }} strokeWidth={2} /></button>}
                  {co.email && <button onClick={() => window.open(`mailto:${co.email}`, "_self")} className="pressable"><Mail size={14} style={{ color: "#52525B" }} strokeWidth={2} /></button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Location ─── */}
        {hasAddress && (() => {
          const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
          const addressParts = [opp.project.address, opp.project.city].filter(Boolean);
          const fullAddress = addressParts.join(", ");
          const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
          const staticMapUrl = mapsKey ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(fullAddress)}&zoom=15&size=800x300&scale=2&markers=color:0x00C875%7C${encodeURIComponent(fullAddress)}&style=feature:all%7Celement:geometry%7Ccolor:0x1a1a1a&style=feature:road%7Celement:geometry%7Ccolor:0x2a2a2a&style=feature:road%7Celement:labels.text.fill%7Ccolor:0x666666&style=feature:water%7Celement:geometry%7Ccolor:0x0d0d0d&style=feature:landscape%7Celement:geometry%7Ccolor:0x141414&style=feature:poi%7Cvisibility:off&style=feature:transit%7Cvisibility:off&key=${mapsKey}` : null;
          const streetViewUrl = mapsKey && opp.project.address ? `https://maps.googleapis.com/maps/api/streetview?size=800x360&location=${encodeURIComponent(fullAddress)}&source=outdoor&key=${mapsKey}` : null;
          return (
            <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <SectionLabel>Location</SectionLabel>
              {streetViewUrl && <StreetViewImage src={streetViewUrl} className="mb-3" />}
              {staticMapUrl && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="block mb-3 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={staticMapUrl} alt={`Map of ${fullAddress}`} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                </a>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={13} style={{ color: "#52525B" }} />
                  <span className="text-[13px] font-medium" style={{ color: "#A1A1AA" }}>{fullAddress}</span>
                </div>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-[12px] font-semibold flex-shrink-0 ml-3" style={{ color: "#00C875" }}>
                  Open in Maps →
                </a>
              </div>
            </div>
          );
        })()}

        {/* ── Actions ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Actions</SectionLabel>
          {!session ? (
            <div className="rounded-2xl p-4" style={{ background: "rgba(0,200,117,0.05)", border: "1px solid rgba(0,200,117,0.15)" }}>
              <p className="text-[13px] font-semibold mb-1" style={{ color: "#F4F4F5" }}>Sign in to draft outreach</p>
              <p className="text-[12px] mb-3" style={{ color: "#A1A1AA" }}>Scout will generate a personalised intro email and pull the right contact.</p>
              <button onClick={() => setSignInSheetOpen(true)}
                className="pressable flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 14px rgba(0,200,117,0.2)" }}>
                <Mail size={13} strokeWidth={2.5} />Draft email with Scout
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                <button onClick={handleEmailDraftOpen}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                  style={emailDraftOpen ? { background: "rgba(0,200,117,0.15)", color: "#34D399", border: "1px solid rgba(0,200,117,0.3)" }
                    : { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 14px rgba(0,200,117,0.25)" }}>
                  <Mail size={13} strokeWidth={2.5} />Draft email
                </button>
                {(scout.contacts?.[0]?.phone || scout.companies?.[0]?.phone) && (
                  <button onClick={handleCallAction}
                    className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Phone size={13} strokeWidth={2.5} />Call
                  </button>
                )}
                <button onClick={() => handleAskScout(`Research ${opp.company.name}. Who are the key people, what projects have they done, and what's the best way to approach them?`)}
                  className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Search size={13} strokeWidth={2.5} />Research
                </button>
              </div>

              {emailDraftOpen && (
                <div className="rounded-2xl overflow-hidden animate-fade-up mt-3" style={{ background: "#1C1C22", border: "1px solid rgba(0,200,117,0.2)" }}>
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
                  <div className="px-4 py-4">
                    <pre className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans" style={{ color: "#A1A1AA" }}>{emailBody}</pre>
                  </div>
                  <div className="px-4 pb-4 flex gap-2">
                    <button onClick={copyEmail}
                      className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
                      style={emailCopied ? { background: "rgba(0,200,117,0.12)", color: "#34D399", border: "1px solid rgba(0,200,117,0.25)" }
                        : { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 12px rgba(0,200,117,0.2)" }}>
                      {emailCopied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2.5} />}
                      {emailCopied ? "Copied!" : "Copy email"}
                    </button>
                    <button onClick={() => handleAskScout(`Refine this email draft for ${opp.project.name}:\n\n${emailBody}`)}
                      className="pressable flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <Sparkles size={13} strokeWidth={2.5} />Refine in Scout
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Why Scout flagged this ─── */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <SectionLabel>Why Scout flagged this</SectionLabel>
          <div className="flex flex-col gap-2">
            {opp.matchReasons.map((reason) => {
              const iconMap: Record<string, React.ReactNode> = {
                trade_match: <Wrench size={13} strokeWidth={2} style={{ color: "#00C875" }} />,
                timing: <Clock size={13} strokeWidth={2} style={{ color: "#F59E0B" }} />,
                relationship: <Users size={13} strokeWidth={2} style={{ color: "#FCD34D" }} />,
                location: <MapPin size={13} strokeWidth={2} style={{ color: "#60A5FA" }} />,
              };
              const icon = iconMap[reason.type] ?? <div className="w-1.5 h-1.5 rounded-full mt-0.5 flex-shrink-0" style={{ background: "#00C875" }} />;
              return (
                <div key={reason.label} className="flex items-start gap-3 px-3 py-3 rounded-xl" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex-shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#F4F4F5" }}>{reason.label}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: "#A1A1AA" }}>{reason.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Source evidence ─── */}
        <div className="px-5 py-5">
          <SectionLabel>Source evidence</SectionLabel>
          <div className="flex flex-col gap-3">
            {hasSourceRecords
              ? scout.sourceRecords.map((sr, i) => <SourceEvidenceCard key={i} record={sr} />)
              : <SourceEvidenceCard record={{ source_type: "permit", confidence: "medium", title: opp.project.type + " permit", excerpt: opp.project.description, source_date: opp.project.issuedDate }} />}
          </div>
        </div>

      </div>

      {/* ── Floating chat (full page only) ─── */}
      {!compact && (
        <FloatingChat
          context={`Opportunity: ${opp.project.name}, ${opp.company.name}, ${opp.project.city}, score ${opp.score}`}
          triggerQuery={floatingQuery}
        />
      )}

      {/* ── Soft auth bar (full page only) ─── */}
      {!compact && !session && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 z-40"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)", paddingTop: 12, background: "rgba(9,9,11,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[12px] text-center mb-2" style={{ color: "#52525B" }}>Sign in to draft outreach, see your connection, and get daily alerts</p>
          <button onClick={() => setSignInSheetOpen(true)}
            className="pressable w-full flex items-center justify-center py-3 rounded-xl text-[14px] font-semibold"
            style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 20px rgba(0,200,117,0.2)" }}>
            Save this lead with Google
          </button>
        </div>
      )}

      {exportSheetOpen && <ExportSheet opp={opp} onClose={() => setExportSheetOpen(false)} />}

      <SignInSheet
        open={signInSheetOpen}
        onClose={() => setSignInSheetOpen(false)}
        title="Sign in to unlock this lead"
        description="See your connection path, draft a personalised email, and get alerted when new matching permits are filed."
        callbackUrl={callbackUrl}
      />
    </div>
  );
}
