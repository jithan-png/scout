"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, Phone, Mail, Building2, ExternalLink, Search, UserSearch, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { permitToOpportunity, permitOppId } from "@/lib/permit-utils";
import type { PermitEntry, ScoutOpportunity } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtValue(v?: number): string {
  if (!v) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtDate(d?: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return d;
  }
}

function statusPriority(status?: string): {
  label: string; color: string; bg: string; border: string; dot: string;
} {
  const s = (status ?? "").toLowerCase();
  if (/issued|approved|active/.test(s))
    return { label: "ISSUED", color: "#EF4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.2)", dot: "#EF4444" };
  if (/review|pending|submitted/.test(s))
    return { label: "IN REVIEW", color: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.2)", dot: "#F59E0B" };
  return { label: "WATCH", color: "#71717A", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", dot: "#52525B" };
}

// ── Permit card ───────────────────────────────────────────────────────────────

interface PermitCardProps {
  permit: PermitEntry;
  index: number;
  onScoutMessage?: (msg: string) => void;
  onOpenDetail?: (opp: ScoutOpportunity) => void;
  onLeadAdded?: (label: string) => void;
}

function PermitCard({ permit, index, onScoutMessage, onOpenDetail, onLeadAdded }: PermitCardProps) {
  const { addOrUpdateOpportunity, contactedOpportunityIds, opportunities } = useAppStore();

  const p = statusPriority(permit.status);
  const hasContact = !!(permit.builder_phone || permit.builder_email);
  const oppId = permitOppId(permit);
  const isContacted = contactedOpportunityIds.has(oppId);

  const handleClick = () => {
    const opp = permitToOpportunity(permit);
    const isNew = !opportunities.find((o) => o.id === opp.id);
    addOrUpdateOpportunity(opp);
    if (isNew) {
      // Persist to Supabase so it survives refresh
      fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opp),
      }).catch(() => {});
      if (onLeadAdded) onLeadAdded(opp.company.name);
    }
    if (onOpenDetail) {
      onOpenDetail(opp);
    }
  };

  const findContactMsg = `Find contact info for ${permit.builder_company ?? "the builder"} at ${permit.address}${permit.city ? `, ${permit.city}` : ""}`;
  const findDecisionMakerMsg = `Who should I contact at ${permit.builder_company ?? "the GC"} about the ${permit.project_type ?? "project"} at ${permit.address}? Find the owner or estimator.`;
  const researchMsg = permit.builder_company
    ? `Give me a company brief on ${permit.builder_company}`
    : `Research the builder at ${permit.address}`;

  return (
    <button
      onClick={handleClick}
      className="pressable w-full text-left rounded-2xl p-4 relative overflow-hidden animate-fade-up"
      style={{
        background: "#1C1C22",
        border: `1px solid ${isContacted ? "rgba(0,200,117,0.2)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Engineering corner brackets */}
      {[
        { top: 6, left: 6, borderTop: "1px solid rgba(255,255,255,0.1)", borderLeft: "1px solid rgba(255,255,255,0.1)" },
        { top: 6, right: 6, borderTop: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" },
        { bottom: 6, left: 6, borderBottom: "1px solid rgba(255,255,255,0.1)", borderLeft: "1px solid rgba(255,255,255,0.1)" },
        { bottom: 6, right: 6, borderBottom: "1px solid rgba(255,255,255,0.1)", borderRight: "1px solid rgba(255,255,255,0.1)" },
      ].map((s, i) => (
        <div key={i} style={{ position: "absolute", width: 10, height: 10, pointerEvents: "none", ...s }} />
      ))}

      {/* ── Top row ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: p.bg, border: `1px solid ${p.border}` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.dot }} />
            <span className="text-[10px] font-bold tracking-wider" style={{ color: p.color }}>{p.label}</span>
          </div>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
            style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.2)", color: "#60A5FA" }}
          >
            <Building2 size={9} strokeWidth={2.5} />
            PERMIT
          </span>
        </div>
        {isContacted && (
          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} strokeWidth={2} style={{ color: "#00C875" }} />
            <span className="text-[10px] font-semibold" style={{ color: "#00C875" }}>Contacted</span>
          </div>
        )}
      </div>

      {/* ── Address + company ── */}
      <h3 className="text-[17px] font-bold leading-tight mb-0.5" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
        {permit.address || "—"}
      </h3>
      <p className="text-[13px]" style={{ color: "#52525B" }}>
        {permit.builder_company || permit.project_type || "Unknown builder"}
      </p>

      {/* ── Contact preview ── */}
      {permit.builder_name && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
            style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}
          >
            {permit.builder_name.charAt(0)}
          </div>
          <p className="text-[11px]" style={{ color: "#71717A" }}>{permit.builder_name}</p>
        </div>
      )}

      {/* ── Description ── */}
      {permit.description && (
        <p className="text-[12px] leading-relaxed mt-1.5" style={{ color: "#52525B" }}>
          {permit.description.slice(0, 100)}{permit.description.length > 100 ? "…" : ""}
        </p>
      )}

      {/* ── Meta row ── */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2 mb-3">
        {permit.city && (
          <>
            <MapPin size={10} style={{ color: "#3F3F46" }} />
            <span className="text-[12px]" style={{ color: "#71717A" }}>{permit.city}</span>
            <span style={{ color: "#3F3F46" }}>·</span>
          </>
        )}
        <span className="text-[12px] font-semibold" style={{ color: "#71717A" }}>{fmtValue(permit.value)}</span>
        {permit.project_type && (
          <>
            <span style={{ color: "#3F3F46" }}>·</span>
            <span className="text-[12px]" style={{ color: "#71717A" }}>{permit.project_type}</span>
          </>
        )}
        {permit.issued_date && (
          <>
            <span style={{ color: "#3F3F46" }}>·</span>
            <Clock size={10} style={{ color: p.label === "ISSUED" ? "#00C875" : "#3F3F46" }} />
            <span className="text-[12px]" style={{ color: p.label === "ISSUED" ? "#34D399" : "#71717A" }}>
              {fmtDate(permit.issued_date)}
            </span>
          </>
        )}
      </div>

      {/* ── Action row ── */}
      <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {hasContact ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {permit.builder_phone && (
              <a
                href={`tel:${permit.builder_phone}`}
                className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ background: "rgba(0,200,117,0.10)", border: "1px solid rgba(0,200,117,0.2)", color: "#34D399" }}
              >
                <Phone size={11} strokeWidth={2} />
                Call
              </a>
            )}
            {permit.builder_email && (
              <a
                href={`mailto:${permit.builder_email}`}
                className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#A1A1AA" }}
              >
                <Mail size={11} strokeWidth={2} />
                Email
              </a>
            )}
          </div>
        ) : onScoutMessage ? (
          /* No contact info — show research chips */
          <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#3F3F46" }}>
              Next step
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onScoutMessage(findContactMsg)}
                className="pressable flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.18)", color: "#34D399" }}
              >
                <UserSearch size={10} strokeWidth={2} />
                Find contact info
              </button>
              <button
                onClick={() => onScoutMessage(findDecisionMakerMsg)}
                className="pressable flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#A1A1AA" }}
              >
                Find decision maker
              </button>
              <button
                onClick={() => onScoutMessage(researchMsg)}
                className="pressable flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#A1A1AA" }}
              >
                <Search size={10} strokeWidth={2} />
                Research company
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#3F3F46" }}>Next step</p>
            <p className="text-[12px] font-semibold" style={{ color: "#34D399" }}>
              {p.label === "ISSUED" ? "Tap to open full details" : "Get on radar before permit drops"}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface PermitTablePanelProps {
  query?: string;
  permits?: PermitEntry[];
  cities?: string[];
  types?: string[];
  onScoutMessage?: (msg: string) => void;
  onOpenDetail?: (opp: ScoutOpportunity) => void;
  onLeadAdded?: (label: string) => void;
}

export default function PermitTablePanel({ query, permits: initialPermits, cities, types, onScoutMessage, onOpenDetail, onLeadAdded }: PermitTablePanelProps) {
  const [permits, setPermits] = useState<PermitEntry[]>(initialPermits ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPermits?.length) {
      setPermits(initialPermits);
      return;
    }
    // Build structured fetch URL from cities/types params (panel marker approach — never truncated)
    const hasCities = cities && cities.length > 0;
    const hasTypes = types && types.length > 0;
    if (hasCities || hasTypes || query) {
      setLoading(true);
      setError(null);
      let url = "/api/permits/search?limit=50";
      if (hasCities) url += `&cities=${encodeURIComponent(cities!.join(","))}`;
      if (hasTypes) url += `&types=${encodeURIComponent(types!.join(","))}`;
      if (!hasCities && !hasTypes && query) url += `&q=${encodeURIComponent(query)}`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (data.permits ?? data.results ?? []);
          setPermits(list);
        })
        .catch(() => setError("Couldn't load permit data."))
        .finally(() => setLoading(false));
    }
  }, [query, initialPermits, cities, types]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2.2s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-[13px]" style={{ color: "#52525B" }}>{error}</p>
      </div>
    );
  }

  if (!permits.length) {
    return (
      <div className="p-6 text-center">
        <p className="text-[13px]" style={{ color: "#52525B" }}>
          No permits found{query ? ` for "${query}"` : ""}.
        </p>
      </div>
    );
  }

  const issuedCount = permits.filter((p) => /issued|approved|active/.test((p.status ?? "").toLowerCase())).length;

  return (
    <div className="flex flex-col">
      {/* Summary bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 mx-4 mt-1 mb-3 rounded-2xl"
        style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.12)" }}
      >
        <div className="flex-1">
          <p className="text-[13px] font-semibold" style={{ color: "#F4F4F5" }}>
            {permits.length} permit{permits.length !== 1 ? "s" : ""}
            {query ? ` · ${query}` : ""}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>
            {issuedCount} issued · {permits.length - issuedCount} in review · tap any to open
          </p>
        </div>
        {issuedCount > 0 && (
          <div
            className="px-2.5 py-1 rounded-full"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)" }}
          >
            <span className="text-[10px] font-bold tracking-wider" style={{ color: "#EF4444" }}>
              {issuedCount} HOT
            </span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3 px-4">
        {permits.map((permit, i) => (
          <PermitCard
            key={permit.id ?? i}
            permit={permit}
            index={i}
            onScoutMessage={onScoutMessage}
            onOpenDetail={onOpenDetail}
            onLeadAdded={onLeadAdded}
          />
        ))}
      </div>

      {/* Admin link */}
      <div className="flex justify-center py-6">
        <a
          href="/admin/permits"
          className="pressable flex items-center gap-1.5 text-[11px]"
          style={{ color: "#3F3F46" }}
        >
          <ExternalLink size={10} strokeWidth={2} />
          Manage permit data
        </a>
      </div>
    </div>
  );
}
