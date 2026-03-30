"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useAppStore } from "@/lib/store";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import BottomNav from "@/components/ui/BottomNav";
import type { OpportunityPriority, Opportunity } from "@/lib/types";

const FILTERS: { label: string; value: OpportunityPriority | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Hot", value: "hot" },
  { label: "Warm", value: "warm" },
  { label: "Watch", value: "watch" },
];

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
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
        }}
      />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div
            className="h-3 rounded-full w-16 mb-2"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          <div
            className="h-5 rounded-lg w-52"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        </div>
        <div
          className="w-10 h-10 rounded-full flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
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

// ── Intent filter helper ──────────────────────────────────────────────────────

function matchesIntent(opp: Opportunity, intent: string): boolean {
  const q = intent.toLowerCase();
  return (
    opp.project.type.toLowerCase().includes(q) ||
    opp.project.description.toLowerCase().includes(q) ||
    opp.project.city.toLowerCase().includes(q) ||
    opp.company.name.toLowerCase().includes(q) ||
    opp.matchReasons.some(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.detail.toLowerCase().includes(q)
    )
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const router = useRouter();
  const { opportunities, isLoadingOpportunities, savedOpportunityIds, selectOpportunity, activeIntent } =
    useAppStore();
  const [filter, setFilter] = useState<OpportunityPriority | "all">("all");

  // When an intent search was run, pre-filter by relevance
  const intentFiltered = activeIntent
    ? opportunities.filter((o) => matchesIntent(o, activeIntent))
    : opportunities;

  // If intent filter yields nothing, fall back to full list
  const baseList = intentFiltered.length > 0 ? intentFiltered : opportunities;

  const filtered =
    filter === "all"
      ? baseList
      : baseList.filter((o) => o.priority === filter);

  const counts = {
    hot: baseList.filter((o) => o.priority === "hot").length,
    warm: baseList.filter((o) => o.priority === "warm").length,
    watch: baseList.filter((o) => o.priority === "watch").length,
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
              My Leads
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#52525B" }}>
              {isLoadingOpportunities ? (
                <span style={{ color: "#3F3F46" }}>Loading…</span>
              ) : (
                <>
                  {baseList.length} opportunities · {counts.hot} hot
                  {activeIntent && (
                    <span style={{ color: "#3F3F46" }}> · "{activeIntent}"</span>
                  )}
                </>
              )}
            </p>
          </div>
          <button
            className="pressable w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <SlidersHorizontal size={16} strokeWidth={2} style={{ color: "#A1A1AA" }} />
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FILTERS.map(({ label, value }) => {
            const isActive = filter === value;
            const count = value === "all" ? baseList.length : counts[value];
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className="pressable flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold transition-all duration-200"
                style={
                  isActive
                    ? {
                        background: "#00C875",
                        color: "#09090B",
                        boxShadow: "0 0 14px rgba(0,200,117,0.25)",
                      }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        color: "#71717A",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                {label}
                <span
                  className="text-[11px] font-bold"
                  style={{ opacity: isActive ? 0.7 : 0.5 }}
                >
                  {isLoadingOpportunities ? "—" : count}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Cards ──────────────────────────────────────────────────── */}
      <main className="px-5">
        <div className="flex flex-col gap-3 pb-2">
          {isLoadingOpportunities ? (
            // Skeleton placeholders
            <>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <SkeletonCard />
                </div>
              ))}
            </>
          ) : (
            <>
              {filtered.map((opp, i) => (
                <div
                  key={opp.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <OpportunityCard
                    opportunity={opp}
                    isSaved={savedOpportunityIds.has(opp.id)}
                    index={i}
                    onClick={() => {
                      selectOpportunity(opp.id);
                      router.push(`/opportunities/${opp.id}`);
                    }}
                  />
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-[14px]" style={{ color: "#52525B" }}>
                    No leads in this filter
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <div className="pb-nav" />
      <BottomNav />
    </div>
  );
}
