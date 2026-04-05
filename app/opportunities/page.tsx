"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X, CheckSquare, Radar, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import SignInSheet from "@/components/ui/SignInSheet";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import BottomNav from "@/components/ui/BottomNav";
import FloatingChat from "@/components/ui/FloatingChat";
import { oppsToCSV, triggerCSVDownload } from "@/lib/export-utils";
import type { OpportunityPriority, Opportunity, LeadSource, ScoutOpportunity, LikeSignals } from "@/lib/types";

const FILTERS: { label: string; value: OpportunityPriority | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Hot", value: "hot" },
  { label: "Warm", value: "warm" },
  { label: "Watch", value: "watch" },
];

const SOURCE_FILTERS: { label: string; value: LeadSource | "all" }[] = [
  { label: "All Sources", value: "all" },
  { label: "Permit", value: "permit" },
  { label: "Web", value: "web" },
  { label: "Tender", value: "procurement" },
  { label: "LinkedIn", value: "linkedin" },
];

// ── Like boost ────────────────────────────────────────────────────────────────

function computeLikeBoost(opp: Opportunity, signals: LikeSignals): number {
  let boost = 0;
  if (signals.projectTypes.includes(opp.project.type)) boost += 10;
  if (signals.cities.includes(opp.project.city)) boost += 5;
  return boost;
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-4 overflow-hidden relative"
      style={{
        background: "#141418",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
        }}
      />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="h-3 rounded-full w-16 mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-5 rounded-lg w-52" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="h-3 rounded-full w-40" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-3 rounded-full w-28" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="flex gap-2">
        <div className="h-6 rounded-full w-20" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-6 rounded-full w-16" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    </div>
  );
}

// ── Intent filter ─────────────────────────────────────────────────────────────

function matchesIntent(opp: Opportunity, intent: string): boolean {
  const q = intent.toLowerCase();
  return (
    opp.project.type.toLowerCase().includes(q) ||
    opp.project.description.toLowerCase().includes(q) ||
    opp.project.city.toLowerCase().includes(q) ||
    opp.company.name.toLowerCase().includes(q) ||
    opp.matchReasons.some(
      (r) => r.label.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q)
    )
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    opportunities,
    isLoadingOpportunities,
    setOpportunities,
    savedOpportunityIds,
    selectOpportunity,
    activeIntent,
    coverageNote,
    setup,
    hydrateSetup,
    dismissedOpportunityIds,
    dismissOpportunity,
    undoDismissOpportunity,
    likedOpportunityIds,
    likeOpportunity,
    markContacted,
    likeSignals,
  } = useAppStore();

  // ── Load real opportunities from Supabase on mount ───────────────────────
  useEffect(() => {
    if (!session?.user?.email) return;

    // If setup isn't complete locally, try to restore from Supabase
    // (covers new device / cleared localStorage scenarios)
    if (!setup.completed) {
      fetch("/api/profile/setup")
        .then((r) => r.json())
        .then((data) => {
          if (data.setup_completed) {
            hydrateSetup(data.user_trades ?? [], data.user_cities ?? [], data.user_project_types ?? []);
          }
        })
        .catch(() => {});
    }

    setOpportunities([]); // clear mock data
    fetch("/api/opportunities")
      .then((r) => r.json())
      .then((data: ScoutOpportunity[]) => {
        if (Array.isArray(data)) setOpportunities(data);
      })
      .catch((e) => console.error("[opportunities] fetch failed:", e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  // ── Sync dismiss/like/contact actions to Supabase ────────────────────────
  const handleDismissWithSync = (id: string, label: string) => {
    dismissOpportunity(id);
    fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    }).catch(() => {});
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoTarget({ id, label });
    undoTimerRef.current = setTimeout(() => setUndoTarget(null), 3500);
  };

  const handleUndoWithSync = () => {
    if (!undoTarget) return;
    undoDismissOpportunity(undoTarget.id);
    fetch(`/api/opportunities/${undoTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: false }),
    }).catch(() => {});
    setUndoTarget(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const [filter, setFilter] = useState<OpportunityPriority | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [signInSheetOpen, setSignInSheetOpen] = useState(false);

  // Dismiss undo toast
  const [undoTarget, setUndoTarget] = useState<{ id: string; label: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show dismissed leads
  const [showDismissed, setShowDismissed] = useState(false);

  // Scan button
  const [scanState, setScanState] = useState<"idle" | "scanning" | "done">("idle");
  const [scanResult, setScanResult] = useState<string | null>(null);

  const runScan = async () => {
    if (scanState === "scanning") return;
    setScanState("scanning");
    try {
      const res = await fetch("/api/opportunities/scan", { method: "POST" });
      const data = await res.json();
      setScanResult(data.message ?? "Scan complete.");
      const fresh = await fetch("/api/opportunities").then((r) => r.json());
      if (Array.isArray(fresh)) setOpportunities(fresh);
    } catch {
      setScanResult("Scan failed — try again.");
    } finally {
      setScanState("done");
      setTimeout(() => { setScanState("idle"); setScanResult(null); }, 4000);
    }
  };

  // Bulk selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // When panel closes, reset selection
  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDismiss = handleDismissWithSync;
  const handleUndo = handleUndoWithSync;

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  // ── Filtering + sorting ──────────────────────────────────────────────────────

  const intentFiltered = activeIntent
    ? opportunities.filter((o) => matchesIntent(o, activeIntent))
    : opportunities;
  const baseList = intentFiltered.length > 0 ? intentFiltered : opportunities;

  // Remove dismissed
  const undismissed = baseList.filter((o) => !dismissedOpportunityIds.has(o.id));

  const sourceFiltered =
    sourceFilter === "all"
      ? undismissed
      : undismissed.filter((o) => {
          const scout = o as ScoutOpportunity;
          return scout.primarySource === sourceFilter;
        });

  const priorityFiltered =
    filter === "all"
      ? sourceFiltered
      : sourceFiltered.filter((o) => o.priority === filter);

  // Sort by score + like boost
  const filtered = [...priorityFiltered].sort(
    (a, b) =>
      (b.score + computeLikeBoost(b, likeSignals)) -
      (a.score + computeLikeBoost(a, likeSignals))
  );

  const counts = {
    hot: sourceFiltered.filter((o) => o.priority === "hot").length,
    warm: sourceFiltered.filter((o) => o.priority === "warm").length,
    watch: sourceFiltered.filter((o) => o.priority === "watch").length,
  };

  // Bulk export
  const handleBulkExport = () => {
    const selected = filtered.filter((o) => selectedIds.has(o.id));
    const csv = oppsToCSV(selected);
    triggerCSVDownload(csv, `opportunities-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleBulkDismiss = () => {
    selectedIds.forEach((id) => dismissOpportunity(id));
    exitSelection();
  };

  return (
    <div className="flex flex-col bg-base min-h-dvh">
      <div className="safe-top" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1
              className="text-[24px] font-bold leading-tight"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              My Opportunities
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#52525B" }}>
              {isLoadingOpportunities ? (
                <span style={{ color: "#3F3F46" }}>Loading…</span>
              ) : (
                <>
                  Scout found {undismissed.length} leads · {counts.hot} need attention
                  {activeIntent && (
                    <span style={{ color: "#3F3F46" }}> · &ldquo;{activeIntent}&rdquo;</span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Select / Cancel toggle */}
            <button
              onClick={selectionMode ? exitSelection : () => setSelectionMode(true)}
              className="pressable px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{
                background: selectionMode ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.05)",
                color: selectionMode ? "#34D399" : "#71717A",
                border: selectionMode ? "1px solid rgba(0,200,117,0.25)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {selectionMode ? "Cancel" : "Select"}
            </button>
            {/* Source filter */}
            <button
              onClick={() => setFilterSheetOpen(true)}
              className="pressable w-9 h-9 rounded-full flex items-center justify-center relative"
              style={{
                background: sourceFilter !== "all" ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.05)",
                border: sourceFilter !== "all" ? "1px solid rgba(0,200,117,0.3)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <SlidersHorizontal size={16} strokeWidth={2} style={{ color: sourceFilter !== "all" ? "#00C875" : "#A1A1AA" }} />
              {sourceFilter !== "all" && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: "#00C875" }} />
              )}
            </button>
          </div>
        </div>

        {/* Scout scan button — shown when signed in */}
        {session?.user?.email && (
          <button
            onClick={runScan}
            disabled={scanState === "scanning"}
            className="pressable w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 transition-all"
            style={{
              background: scanState === "done"
                ? "rgba(0,200,117,0.10)"
                : "rgba(255,255,255,0.04)",
              border: scanState === "done"
                ? "1px solid rgba(0,200,117,0.25)"
                : "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: scanState === "done"
                  ? "rgba(0,200,117,0.15)"
                  : "rgba(0,200,117,0.08)",
              }}
            >
              {scanState === "scanning" ? (
                <Loader2 size={15} strokeWidth={2} style={{ color: "#00C875", animation: "spin 1s linear infinite" }} />
              ) : (
                <Radar size={15} strokeWidth={2} style={{ color: "#00C875" }} />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold leading-tight" style={{ color: "#F4F4F5" }}>
                {scanState === "scanning" ? "Scanning permits…" : scanState === "done" ? (scanResult ?? "Scan complete") : "Scout for new leads"}
              </p>
              {scanState === "idle" && (
                <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>
                  Scans permits · auto-runs daily
                </p>
              )}
            </div>
          </button>
        )}

        {/* Nudge banner */}
        {!session && !nudgeDismissed && !isLoadingOpportunities && opportunities.length > 0 && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 animate-fade-up"
            style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.18)" }}
          >
            <div className="flex-1">
              <p className="text-[13px] font-semibold leading-tight" style={{ color: "#F4F4F5" }}>
                Get alerted when new matches appear
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>
                Scout scans daily and notifies you before your competitors find out.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSignInSheetOpen(true)}
                className="pressable px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ background: "rgba(0,200,117,0.15)", border: "1px solid rgba(0,200,117,0.3)", color: "#34D399" }}
              >
                Sign in
              </button>
              <button onClick={() => setNudgeDismissed(true)} className="pressable">
                <X size={14} strokeWidth={2} style={{ color: "#3F3F46" }} />
              </button>
            </div>
          </div>
        )}

        {/* Priority filter pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(({ label, value }) => {
            const isActive = !showDismissed && filter === value;
            const count = value === "all" ? sourceFiltered.length : counts[value];
            return (
              <button
                key={value}
                onClick={() => { setFilter(value); setShowDismissed(false); }}
                className="pressable flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200"
                style={
                  isActive
                    ? { background: "#00C875", color: "#09090B", boxShadow: "0 0 14px rgba(0,200,117,0.25)" }
                    : { background: "rgba(255,255,255,0.05)", color: "#71717A", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {label}
                <span className="text-[11px] font-bold" style={{ opacity: isActive ? 0.7 : 0.5 }}>
                  {isLoadingOpportunities ? "—" : count}
                </span>
              </button>
            );
          })}
          {/* Dismissed pill — only show if there are dismissed leads */}
          {dismissedOpportunityIds.size > 0 && (
            <button
              onClick={() => setShowDismissed((v) => !v)}
              className="pressable flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200"
              style={
                showDismissed
                  ? { background: "rgba(239,68,68,0.12)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }
                  : { background: "rgba(255,255,255,0.05)", color: "#52525B", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              Dismissed
              <span className="text-[11px] font-bold" style={{ opacity: 0.7 }}>
                {dismissedOpportunityIds.size}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* ── Filter sheet ────────────────────────────────────────────────── */}
      {filterSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setFilterSheetOpen(false)}
        >
          <div
            className="rounded-t-3xl p-6 animate-fade-up"
            style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <p className="text-[16px] font-bold" style={{ color: "#F4F4F5" }}>Filter by source</p>
              <button onClick={() => setFilterSheetOpen(false)} className="pressable">
                <X size={18} strokeWidth={2} style={{ color: "#71717A" }} />
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {SOURCE_FILTERS.map(({ label, value }) => {
                const isActive = sourceFilter === value;
                return (
                  <button
                    key={value}
                    onClick={() => { setSourceFilter(value); setFilterSheetOpen(false); }}
                    className="pressable flex items-center justify-between px-4 py-3.5 rounded-2xl text-[14px] font-semibold transition-all"
                    style={
                      isActive
                        ? { background: "rgba(0,200,117,0.1)", color: "#34D399", border: "1px solid rgba(0,200,117,0.25)" }
                        : { background: "rgba(255,255,255,0.04)", color: "#A1A1AA", border: "1px solid rgba(255,255,255,0.07)" }
                    }
                  >
                    {label}
                    {isActive && <span style={{ color: "#00C875" }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {sourceFilter !== "all" && (
              <button
                onClick={() => { setSourceFilter("all"); setFilterSheetOpen(false); }}
                className="pressable w-full py-3 rounded-2xl text-[14px] font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "#71717A" }}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Coverage note ──────────────────────────────────────────────── */}
      {coverageNote && !isLoadingOpportunities && (
        <div className="px-5 pb-3">
          <div
            className="px-4 py-3 rounded-xl"
            style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.14)" }}
          >
            <p className="text-[12px] leading-relaxed" style={{ color: "#6EE7B7" }}>
              {coverageNote}
            </p>
          </div>
        </div>
      )}

      {/* ── Cards ──────────────────────────────────────────────────── */}
      <main className="px-5">
        <div className="flex flex-col gap-3 pb-2">
          {isLoadingOpportunities ? (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <SkeletonCard />
                </div>
              ))}
            </>
          ) : (
            <>
              {showDismissed
                ? baseList.filter((o) => dismissedOpportunityIds.has(o.id)).map((opp, i) => (
                    <div key={opp.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <OpportunityCard
                        opportunity={opp}
                        isDismissed
                        onRestore={() => undoDismissOpportunity(opp.id)}
                        onClick={() => {}} // no navigation when viewing dismissed
                        index={i}
                      />
                    </div>
                  ))
                : filtered.map((opp, i) => (
                <div key={opp.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                  <OpportunityCard
                    opportunity={opp}
                    isSaved={savedOpportunityIds.has(opp.id)}
                    isLiked={likedOpportunityIds.has(opp.id)}
                    index={i}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(opp.id)}
                    onSelect={() => toggleSelect(opp.id)}
                    onDismiss={!selectionMode ? () => handleDismiss(opp.id, opp.project.name) : undefined}
                    onClick={() => {
                      selectOpportunity(opp.id);
                      router.push(`/opportunities/${opp.id}`);
                    }}
                  />
                </div>
              ))}

              {filtered.length === 0 && !setup.completed && opportunities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 animate-fade-up">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.15)" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 14 14" fill="none">
                      <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="#00C875" fillOpacity="0.9" />
                      <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="#00C875" fillOpacity="0.6" />
                    </svg>
                  </div>
                  <p className="text-[15px] font-semibold mb-1" style={{ color: "#F4F4F5" }}>
                    Scout hasn&apos;t searched yet
                  </p>
                  <p className="text-[13px] mb-6" style={{ color: "#52525B" }}>
                    Tell Scout what you sell and where you work
                  </p>
                  <button
                    onClick={() => router.push("/scout")}
                    className="pressable px-6 py-3 rounded-2xl text-[14px] font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                      color: "#fff",
                      boxShadow: "0 0 20px rgba(0,200,117,0.25)",
                    }}
                  >
                    Find opportunities
                  </button>
                </div>
              )}

              {filtered.length === 0 && (setup.completed || opportunities.length > 0) && (
                <div className="text-center py-20">
                  <p className="text-[14px]" style={{ color: "#52525B" }}>
                    No opportunities here
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <div className="pb-nav" />
      <BottomNav />
      <FloatingChat />

      {/* ── Dismiss undo toast ──────────────────────────────────────── */}
      {undoTarget && (
        <div
          className="fixed left-1/2 z-50 animate-fade-up"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
            transform: "translateX(-50%)",
            width: "calc(100% - 40px)",
            maxWidth: 390,
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{
              background: "#27272A",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <p className="text-[13px]" style={{ color: "#A1A1AA" }}>
              <span style={{ color: "#F4F4F5" }}>{undoTarget.label}</span> removed
            </p>
            <button
              onClick={handleUndo}
              className="pressable text-[13px] font-semibold ml-4"
              style={{ color: "#00C875" }}
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* ── Bulk selection action bar ────────────────────────────────── */}
      {selectionMode && (
        <div
          className="fixed left-1/2 z-50"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
            transform: "translateX(-50%)",
            width: "calc(100% - 40px)",
            maxWidth: 390,
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: "#1C1C22",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <p className="text-[13px] font-semibold flex-1" style={{ color: "#F4F4F5" }}>
              {selectedIds.size} selected
            </p>
            <button
              onClick={handleBulkExport}
              disabled={selectedIds.size === 0}
              className="pressable px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{
                background: selectedIds.size > 0 ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.04)",
                color: selectedIds.size > 0 ? "#34D399" : "#3F3F46",
                border: selectedIds.size > 0 ? "1px solid rgba(0,200,117,0.25)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Export CSV
            </button>
            <button
              onClick={handleBulkDismiss}
              disabled={selectedIds.size === 0}
              className="pressable px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{
                background: selectedIds.size > 0 ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                color: selectedIds.size > 0 ? "#EF4444" : "#3F3F46",
                border: selectedIds.size > 0 ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Dismiss
            </button>
            <button
              onClick={exitSelection}
              className="pressable"
            >
              <X size={16} strokeWidth={2} style={{ color: "#52525B" }} />
            </button>
          </div>
        </div>
      )}

      <SignInSheet
        open={signInSheetOpen}
        onClose={() => setSignInSheetOpen(false)}
        title="Get alerted when new matches appear"
        description="Scout scans 40+ permit portals daily and notifies you before your competitors find out."
        callbackUrl="/scout"
      />
    </div>
  );
}
