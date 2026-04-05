"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bell, Check, X, Clock, ChevronDown, ChevronUp,
  Mail, Phone, ArrowRight, Sparkles, Zap, Trophy, ThumbsDown,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/ui/BottomNav";
import FloatingChat from "@/components/ui/FloatingChat";
import OpportunityDetailContent from "@/components/opportunities/OpportunityDetailContent";
import type { ActivityItem, ActivityItemType } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function isItemActive(item: ActivityItem): boolean {
  if (item.status !== "pending") return false;
  if (item.snoozedUntil && new Date(item.snoozedUntil) > new Date()) return false;
  if (item.dueAt && new Date(item.dueAt) > new Date()) return false;
  return true;
}

function isItemUpcoming(item: ActivityItem): boolean {
  return item.status === "pending" && !!item.dueAt && new Date(item.dueAt) > new Date();
}

function formatDueDate(dueAt: string): string {
  const days = Math.round((new Date(dueAt).getTime() - Date.now()) / 86400000);
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  high: {
    dot: "#EF4444",
    label: "Action needed",
    labelColor: "#EF4444",
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.18)",
  },
  medium: {
    dot: "#F59E0B",
    label: "Update",
    labelColor: "#F59E0B",
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.15)",
  },
  low: {
    dot: "#52525B",
    label: "Info",
    labelColor: "#71717A",
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.07)",
  },
};

const TYPE_ICONS: Record<ActivityItemType, React.ReactNode> = {
  follow_up:     <Clock size={14} strokeWidth={2} style={{ color: "#F59E0B" }} />,
  new_matches:   <Sparkles size={14} strokeWidth={2} style={{ color: "#00C875" }} />,
  hot_lead:      <Zap size={14} strokeWidth={2} style={{ color: "#EF4444" }} />,
  permit_issued: <Zap size={14} strokeWidth={2} style={{ color: "#EF4444" }} />,
  scan_complete: <Bell size={14} strokeWidth={2} style={{ color: "#52525B" }} />,
  outcome:       <Trophy size={14} strokeWidth={2} style={{ color: "#F59E0B" }} />,
  like_signal:   <Sparkles size={14} strokeWidth={2} style={{ color: "#A78BFA" }} />,
};

// ── Review sheet ──────────────────────────────────────────────────────────────

function ReviewSheet({ oppId, onClose }: { oppId: string; onClose: () => void }) {
  const { opportunities } = useAppStore();
  const opp = opportunities.find((o) => o.id === oppId);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 w-full max-w-[430px] flex flex-col"
        style={{
          height: "88dvh",
          background: "#09090B",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {opp ? (
            <OpportunityDetailContent opp={opp} onBack={onClose} compact />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
              <p className="text-[14px]" style={{ color: "#52525B" }}>
                This lead isn&apos;t in your pipeline yet.
              </p>
              <p className="text-[12px]" style={{ color: "#3F3F46" }}>
                Go to Scout and ask about it to add it.
              </p>
              <button onClick={onClose} className="pressable mt-2 text-[13px] font-semibold" style={{ color: "#00C875" }}>
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Outcome chooser ───────────────────────────────────────────────────────────

function OutcomeChooser({
  item,
  onDone,
}: {
  item: ActivityItem;
  onDone: () => void;
}) {
  const { markOutcome } = useAppStore();
  return (
    <div
      className="mt-3 p-3 rounded-xl animate-fade-up"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <p className="text-[11px] font-semibold mb-2.5 uppercase tracking-wider" style={{ color: "#52525B" }}>
        How did it go?
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => { markOutcome(item.id, "won"); onDone(); }}
          className="pressable flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold"
          style={{ background: "rgba(0,200,117,0.12)", border: "1px solid rgba(0,200,117,0.25)", color: "#34D399" }}
        >
          <Trophy size={13} strokeWidth={2} />Won it
        </button>
        <button
          onClick={() => { markOutcome(item.id, "lost"); onDone(); }}
          className="pressable flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717A" }}
        >
          <ThumbsDown size={13} strokeWidth={2} />Not this time
        </button>
      </div>
    </div>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({
  item,
  onReview,
}: {
  item: ActivityItem;
  onReview: (oppId: string) => void;
}) {
  const router = useRouter();
  const {
    dismissActivityItem,
    completeActivityItem,
    snoozeActivityItem,
    markContacted,
  } = useAppStore();

  const [showOutcome, setShowOutcome] = useState(false);
  const [exiting, setExiting] = useState(false);

  const p = PRIORITY_CONFIG[item.priority];
  const icon = TYPE_ICONS[item.type];
  const isDone = item.status === "done";
  const isDismissed = item.status === "dismissed";
  const isSnoozed = !!(item.snoozedUntil && new Date(item.snoozedUntil) > new Date());

  const exitThen = (fn: () => void) => {
    setExiting(true);
    setTimeout(fn, 250);
  };

  const handleDismiss = () => exitThen(() => dismissActivityItem(item.id));
  const handleComplete = () => exitThen(() => completeActivityItem(item.id));

  const handlePrimary = () => {
    switch (item.primaryAction) {
      case "call":
        if (item.phone) window.open(`tel:${item.phone}`, "_self");
        if (item.oppId) markContacted(item.oppId);
        handleComplete();
        break;
      case "email":
        if (item.email) {
          window.open(`mailto:${item.email}`, "_self");
          if (item.oppId) markContacted(item.oppId);
          handleComplete();
        } else if (item.oppId) {
          onReview(item.oppId);
        }
        break;
      case "review":
        if (item.oppId) onReview(item.oppId);
        break;
      case "outcome":
        setShowOutcome(true);
        break;
      case "browse":
        router.push("/opportunities");
        handleComplete();
        break;
    }
  };

  const primaryLabel: Record<string, string> = {
    call: "Call",
    email: item.email ? "Send email" : "Open lead",
    review: "View lead",
    outcome: "Log outcome",
    browse: "Review leads",
  };

  const primaryStyle =
    item.priority === "high"
      ? {
          background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
          color: "#fff",
          boxShadow: "0 0 14px rgba(0,200,117,0.25)",
        }
      : {
          background: "rgba(255,255,255,0.07)",
          color: "#A1A1AA",
          border: "1px solid rgba(255,255,255,0.09)",
        };

  const doneLabel =
    item.outcome === "won"
      ? "WON"
      : item.outcome === "lost"
      ? "LOST"
      : isDismissed
      ? "SKIPPED"
      : "DONE";

  return (
    <div
      className="rounded-2xl p-4 relative transition-all duration-250"
      style={{
        background: isDone || isDismissed ? "rgba(255,255,255,0.02)" : p.bg,
        border: `1px solid ${isDone || isDismissed ? "rgba(255,255,255,0.05)" : p.border}`,
        opacity: exiting ? 0 : isDone || isDismissed || isSnoozed ? 0.5 : 1,
        transform: exiting ? "scale(0.97)" : "scale(1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0">{icon}</div>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: isDone || isDismissed ? "#3F3F46" : p.dot }} />
          <span className="text-[10px] font-bold tracking-wider uppercase flex-shrink-0" style={{ color: isDone || isDismissed ? "#3F3F46" : p.labelColor }}>
            {isDone || isDismissed ? doneLabel : isSnoozed ? "SNOOZED 2D" : p.label}
          </span>
          <span className="text-[10px] truncate" style={{ color: "#3F3F46" }}>
            · {timeAgo(item.createdAt)}
          </span>
        </div>

        {!isDone && !isDismissed && (
          <button
            onClick={handleDismiss}
            className="pressable flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}
            aria-label="Dismiss"
          >
            <X size={10} strokeWidth={2.5} style={{ color: "#52525B" }} />
          </button>
        )}
        {(isDone || isDismissed) && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: item.outcome === "won" ? "rgba(0,200,117,0.15)" : "rgba(255,255,255,0.05)" }}
          >
            <Check size={9} strokeWidth={2.5} style={{ color: item.outcome === "won" ? "#00C875" : "#3F3F46" }} />
          </div>
        )}
      </div>

      {/* Body */}
      <p
        className="text-[14px] font-semibold leading-snug mb-1"
        style={{ color: isDone || isDismissed ? "#52525B" : "#F4F4F5" }}
      >
        {item.title}
      </p>
      <p className="text-[12px] leading-relaxed" style={{ color: isDone || isDismissed ? "#3F3F46" : "#71717A" }}>
        {item.body}
      </p>

      {/* Outcome chooser inline */}
      {showOutcome && (
        <OutcomeChooser
          item={item}
          onDone={() => {
            setShowOutcome(false);
            handleComplete();
          }}
        />
      )}

      {/* Action row — only for active items */}
      {!isDone && !isDismissed && !isSnoozed && !showOutcome && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Primary */}
          <button
            onClick={handlePrimary}
            className="pressable flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold flex-shrink-0"
            style={primaryStyle}
          >
            {item.primaryAction === "call" && <Phone size={12} strokeWidth={2} />}
            {item.primaryAction === "email" && <Mail size={12} strokeWidth={2} />}
            {(item.primaryAction === "review" || item.primaryAction === "browse") && (
              <ArrowRight size={12} strokeWidth={2} />
            )}
            {item.primaryAction === "outcome" && <Trophy size={12} strokeWidth={2} />}
            {primaryLabel[item.primaryAction]}
          </button>

          {/* Snooze for high priority */}
          {item.priority === "high" && (
            <button
              onClick={() => snoozeActivityItem(item.id)}
              className="pressable flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-semibold"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#52525B",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Clock size={10} strokeWidth={2} />
              Snooze 2d
            </button>
          )}

          {/* Log outcome for follow_up items */}
          {item.type === "follow_up" && (
            <button
              onClick={() => setShowOutcome(true)}
              className="pressable flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-semibold ml-auto"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#3F3F46",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <Trophy size={10} strokeWidth={2} />
              Log outcome
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-up">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.12)" }}
      >
        <Check size={22} strokeWidth={2} style={{ color: "#00C875" }} />
      </div>
      <p className="text-[15px] font-semibold mb-2" style={{ color: "#F4F4F5" }}>
        You&apos;re all caught up
      </p>
      <p className="text-[13px] leading-relaxed" style={{ color: "#52525B" }}>
        Scout will notify you when permits are issued, follow-ups are due, or new leads match your profile.
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { activityItems, addActivityItem } = useAppStore();
  const { data: session } = useSession();
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [reviewOppId, setReviewOppId] = useState<string | null>(null);
  const [floatingQuery, setFloatingQuery] = useState<string | null>(null);

  // ── Poll for new cron-discovered opportunities on mount ───────────────────
  useEffect(() => {
    if (!session?.user?.email) return;
    const STORAGE_KEY = "scout_last_activity_check";
    const lastCheck = localStorage.getItem(STORAGE_KEY) ?? new Date(0).toISOString();

    fetch("/api/opportunities?source=cron_scan")
      .then((r) => r.json())
      .then((data: Array<{ id: string; score: number; priority: string; timing?: string; project?: { address?: string; city?: string; type?: string }; company?: { name?: string }; suggestedAction?: string; actionType?: string; _source?: string }>) => {
        if (!Array.isArray(data)) return;

        // Group new cron results since last check
        const newOpps = data.filter((o) => {
          // We don't have created_at on the client type, so use localStorage timestamp
          // Opportunities returned are ordered by score desc — inject top ones
          return true; // we'll deduplicate via activityItems
        });

        if (!newOpps.length) return;

        // Check if we already have a recent new_matches item from this batch
        const alreadyHasItem = activityItems.some(
          (i) => i.type === "new_matches" && new Date(i.createdAt) > new Date(lastCheck)
        );

        if (!alreadyHasItem) {
          const hotCount = newOpps.filter((o) => o.priority === "hot").length;
          const total = newOpps.length;
          const topCity = newOpps[0]?.project?.city ?? "your area";

          addActivityItem({
            type: "new_matches",
            status: "pending",
            priority: hotCount > 0 ? "high" : "medium",
            title: `Scout found ${total} new lead${total !== 1 ? "s" : ""} while you were away`,
            body: `${hotCount > 0 ? `${hotCount} hot lead${hotCount !== 1 ? "s" : ""} in ${topCity}` : `New opportunities in ${topCity}`}. Review and reach out.`,
            primaryAction: "browse",
          });

          localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  const activeItems = activityItems.filter(isItemActive);
  const needsActionItems = activeItems.filter((i) => i.priority === "high");
  const updateItems = activeItems.filter((i) => i.priority !== "high");
  const upcomingItems = activityItems.filter(isItemUpcoming);
  const completedItems = activityItems.filter(
    (i) => i.status === "done" || i.status === "dismissed"
  );

  const pendingCount = needsActionItems.length;

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: "#09090B" }}>
      <div className="safe-top" />

      {/* ── Header ─── */}
      <header className="px-5 pt-5 pb-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-[24px] font-bold leading-tight"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              Activity
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#52525B" }}>
              {pendingCount > 0
                ? `${pendingCount} action${pendingCount !== 1 ? "s" : ""} need${pendingCount === 1 ? "s" : ""} your attention`
                : updateItems.length > 0
                ? `${updateItems.length} update${updateItems.length !== 1 ? "s" : ""} from Scout`
                : "You're all caught up"}
            </p>
          </div>
          {pendingCount > 0 && (
            <div
              className="px-3 py-1.5 rounded-full"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)" }}
            >
              <span className="text-[13px] font-bold" style={{ color: "#EF4444" }}>{pendingCount}</span>
            </div>
          )}
        </div>
      </header>

      {/* ── Scrollable feed ─── */}
      <main className="flex-1 overflow-y-auto px-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}>

        {/* ── Zone 1: Needs Your Attention ─── */}
        {needsActionItems.length > 0 && (
          <section className="mb-6">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#EF4444" }}>
              Needs your attention
            </p>
            <div className="flex flex-col gap-3">
              {needsActionItems.map((item) => (
                <ActivityCard key={item.id} item={item} onReview={setReviewOppId} />
              ))}
            </div>
          </section>
        )}

        {/* ── Zone 2: Updates ─── */}
        {updateItems.length > 0 && (
          <section className="mb-6">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "#52525B" }}>
              Updates
            </p>
            <div className="flex flex-col gap-3">
              {updateItems.map((item) => (
                <ActivityCard key={item.id} item={item} onReview={setReviewOppId} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ─── */}
        {activeItems.length === 0 && upcomingItems.length === 0 && <EmptyState />}

        {/* ── Zone 3: Upcoming ─── */}
        {upcomingItems.length > 0 && (
          <section className="mb-6">
            <button
              onClick={() => setUpcomingExpanded(!upcomingExpanded)}
              className="pressable flex items-center gap-2 w-full mb-3 py-1"
            >
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#3F3F46" }}>
                Upcoming · {upcomingItems.length}
              </p>
              {upcomingExpanded
                ? <ChevronUp size={12} strokeWidth={2.5} style={{ color: "#3F3F46" }} />
                : <ChevronDown size={12} strokeWidth={2.5} style={{ color: "#3F3F46" }} />
              }
            </button>
            {upcomingExpanded && (
              <div className="flex flex-col gap-2">
                {upcomingItems.map((item) => (
                  <div key={item.id} className="px-4 py-3 rounded-2xl" style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: "#A1A1AA" }}>{item.title}</p>
                        <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: "#52525B" }}>{item.body}</p>
                      </div>
                      <span
                        className="flex-shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full"
                        style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.15)" }}
                      >
                        <Clock size={10} strokeWidth={2.5} className="inline mr-1" />
                        {formatDueDate(item.dueAt!)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Zone 4: Completed ─── */}
        {completedItems.length > 0 && (
          <section className="mb-4">
            <button
              onClick={() => setCompletedExpanded(!completedExpanded)}
              className="pressable flex items-center gap-2 w-full mb-3 py-1"
            >
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#3F3F46" }}>
                Completed · {completedItems.length}
              </p>
              {completedExpanded
                ? <ChevronUp size={12} strokeWidth={2.5} style={{ color: "#3F3F46" }} />
                : <ChevronDown size={12} strokeWidth={2.5} style={{ color: "#3F3F46" }} />
              }
            </button>
            {completedExpanded && (
              <div className="flex flex-col gap-2">
                {completedItems.slice(0, 20).map((item) => (
                  <ActivityCard key={item.id} item={item} onReview={setReviewOppId} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <BottomNav />
      <FloatingChat triggerQuery={floatingQuery} />

      {/* ── Review sheet ─── */}
      {reviewOppId && (
        <ReviewSheet oppId={reviewOppId} onClose={() => setReviewOppId(null)} />
      )}
    </div>
  );
}
