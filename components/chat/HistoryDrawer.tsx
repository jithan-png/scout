"use client";

import { useState, useEffect } from "react";
import { X, Search, Plus, MessageSquare } from "lucide-react";
import type { ConversationSession } from "@/lib/types";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
  onLoadSession: (id: string) => void;
  onNewSession: () => void;
}

function bucketDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This week";
  return "Earlier";
}

const BUCKET_ORDER = ["Today", "Yesterday", "This week", "Earlier"];

export default function HistoryDrawer({
  open,
  onClose,
  sessions,
  onLoadSession,
  onNewSession,
}: HistoryDrawerProps) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  const filtered = sessions.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  // Group by date bucket
  const grouped: Record<string, ConversationSession[]> = {};
  for (const session of filtered) {
    const bucket = bucketDate(session.date);
    if (!grouped[bucket]) grouped[bucket] = [];
    grouped[bucket].push(session);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 flex flex-col"
        style={{
          width: "min(300px, 80vw)",
          background: "rgba(20, 20, 24, 0.97)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pt-12 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[15px] font-semibold" style={{ color: "#F4F4F5", letterSpacing: "-0.01em" }}>
            History
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onNewSession(); }}
              className="pressable w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,200,117,0.10)", border: "1px solid rgba(0,200,117,0.2)" }}
              title="New conversation"
            >
              <Plus size={14} strokeWidth={2} style={{ color: "#00C875" }} />
            </button>
            <button
              onClick={onClose}
              className="pressable w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <X size={14} strokeWidth={2} style={{ color: "#52525B" }} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Search size={13} strokeWidth={2} style={{ color: "#52525B", flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations…"
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: "#E4E4E7" }}
            />
            {query && (
              <button onClick={() => setQuery("")} className="pressable">
                <X size={11} style={{ color: "#52525B" }} />
              </button>
            )}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center pt-12 gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <MessageSquare size={18} strokeWidth={1.5} style={{ color: "#3F3F46" }} />
              </div>
              <p className="text-[13px] text-center" style={{ color: "#52525B" }}>
                No conversations yet.{"\n"}Start chatting with Scout.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] text-center pt-8" style={{ color: "#52525B" }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            BUCKET_ORDER.map((bucket) => {
              const items = grouped[bucket];
              if (!items?.length) return null;
              return (
                <div key={bucket} className="mb-5">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "#3F3F46" }}
                  >
                    {bucket}
                  </p>
                  <div className="flex flex-col gap-1">
                    {items.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => onLoadSession(session.id)}
                        className="pressable w-full text-left px-3 py-2.5 rounded-xl transition-all"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <p
                          className="text-[13px] font-medium leading-snug truncate"
                          style={{ color: "#E4E4E7" }}
                        >
                          {session.title}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "#3F3F46" }}>
                          {formatDate(session.date)} · {session.messages.length} messages
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
