"use client";

import { useRouter } from "next/navigation";
import { Bell, Flame, Users, Clock, RefreshCw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/ui/BottomNav";
import type { Alert } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

const ALERT_META: Record<
  Alert["type"],
  { icon: React.ElementType; color: string; bg: string }
> = {
  new_opportunity: {
    icon: Flame,
    color: "#EF4444",
    bg: "rgba(239,68,68,0.10)",
  },
  warm_path: {
    icon: Users,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
  },
  follow_up: {
    icon: Clock,
    color: "#00C875",
    bg: "rgba(0,200,117,0.10)",
  },
  update: {
    icon: RefreshCw,
    color: "#A1A1AA",
    bg: "rgba(255,255,255,0.06)",
  },
};

function AlertRow({
  alert,
  onPress,
  index,
}: {
  alert: Alert;
  onPress: () => void;
  index: number;
}) {
  const { icon: Icon, color, bg } = ALERT_META[alert.type];

  return (
    <button
      onClick={onPress}
      className="w-full text-left pressable animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className="flex items-start gap-3 px-4 py-4 rounded-2xl transition-all duration-200"
        style={{
          background: alert.read ? "rgba(255,255,255,0.02)" : "#1C1C22",
          border: alert.read
            ? "1px solid rgba(255,255,255,0.04)"
            : "1px solid rgba(255,255,255,0.07)",
          boxShadow: alert.read
            ? "none"
            : "0 1px 1px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          opacity: alert.read ? 0.55 : 1,
        }}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: bg }}
        >
          <Icon size={15} style={{ color }} strokeWidth={2} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className="text-[14px] leading-tight"
              style={{
                color: alert.read ? "#71717A" : "#F4F4F5",
                fontWeight: alert.read ? 400 : 600,
              }}
            >
              {alert.title}
            </p>
            <span
              className="text-[11px] flex-shrink-0"
              style={{ color: "#3F3F46" }}
            >
              {timeAgo(alert.createdAt)}
            </span>
          </div>
          <p
            className="text-[13px] mt-1 leading-snug"
            style={{ color: "#52525B" }}
          >
            {alert.body}
          </p>
        </div>

        {/* Unread dot */}
        {!alert.read && (
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
            style={{
              background: "#00C875",
              boxShadow: "0 0 6px rgba(0,200,117,0.5)",
            }}
          />
        )}
      </div>
    </button>
  );
}

export default function ActivityPage() {
  const router = useRouter();
  const { alerts, unreadCount, markAlertRead, markAllRead } = useAppStore();

  const unread = alerts.filter((a) => !a.read);
  const read = alerts.filter((a) => a.read);

  return (
    <div className="flex flex-col min-h-dvh bg-base">
      <div className="safe-top" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-5 pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-[24px] font-bold"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              Activity
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "#52525B" }}>
              {unreadCount > 0
                ? `${unreadCount} new`
                : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="pressable text-[13px] font-semibold"
              style={{ color: "#00C875" }}
            >
              Mark all read
            </button>
          )}
        </div>
      </header>

      <main className="px-5 pb-2">
        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Bell size={22} style={{ color: "#3F3F46" }} strokeWidth={1.75} />
            </div>
            <p className="text-[14px] font-semibold" style={{ color: "#52525B" }}>
              No activity yet
            </p>
            <p className="text-[13px] mt-1" style={{ color: "#3F3F46" }}>
              Scout will notify you when new leads are found
            </p>
          </div>
        )}

        {unread.length > 0 && (
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#3F3F46" }}
            >
              New
            </p>
            <div className="flex flex-col gap-2">
              {unread.map((alert, i) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  index={i}
                  onPress={() => {
                    markAlertRead(alert.id);
                    if (alert.opportunityId) {
                      router.push(`/opportunities/${alert.opportunityId}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {read.length > 0 && (
          <div className="mb-6">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#3F3F46" }}
            >
              Earlier
            </p>
            <div className="flex flex-col gap-2">
              {read.map((alert, i) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  index={i}
                  onPress={() => {
                    if (alert.opportunityId) {
                      router.push(`/opportunities/${alert.opportunityId}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="pb-nav" />
      <BottomNav />
    </div>
  );
}
