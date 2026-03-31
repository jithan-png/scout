"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { MOCK_AGENT_UPDATES } from "@/lib/mock-data";
import { runScout } from "@/lib/api";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import type { ScoutOpportunity } from "@/lib/types";

type UpdateType = "scanning" | "matching" | "mapping" | "finding" | "complete";

const TYPE_ICON: Record<UpdateType, React.ReactNode> = {
  scanning: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  finding: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 19-9-9 19-2-8-8-2z" />
    </svg>
  ),
  matching: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  mapping: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  complete: (
    <Check size={12} strokeWidth={2.5} />
  ),
};

const TYPE_COLOR: Record<UpdateType, string> = {
  scanning: "#60A5FA",
  finding: "#F59E0B",
  matching: "#00C875",
  mapping: "#A78BFA",
  complete: "#00C875",
};

export default function WorkingPage() {
  const router = useRouter();
  const { activeIntent, addAgentUpdate, finishAgent, agentUpdates, setScoutBriefing, setCoverageNote, setOpportunities, opportunities, setWhatsappPhone, whatsappPhone } =
    useAppStore();
  const [done, setDone] = useState(false);
  const [showTyping, setShowTyping] = useState(true);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const realDataRef = useRef<ScoutOpportunity[] | null>(null);

  useEffect(() => {
    // Fire real Scout run in parallel with the animation
    const query = activeIntent || "construction leads";
    runScout(query)
      .then(({ opportunities: opps, coverageNote }) => {
        realDataRef.current = opps.length > 0 ? opps : null;
        setLiveCount(opps.length);
        setCoverageNote(coverageNote);
        setScoutBriefing(`Scout found ${opps.length} leads matching your profile.`);
        // Always push real data into the store when it arrives — animation may have
        // already finished before the API returned (pipeline can take 30–60s).
        if (opps.length > 0) {
          setOpportunities(opps);
        }
      })
      .catch(() => {
        realDataRef.current = null;
      });

    const timings = [700, 1700, 2900, 4100, 5500];

    const timeouts = MOCK_AGENT_UPDATES.map((update, i) =>
      setTimeout(() => {
        setShowTyping(i < MOCK_AGENT_UPDATES.length - 1);
        addAgentUpdate(update);
        if (i === MOCK_AGENT_UPDATES.length - 1) {
          setTimeout(() => {
            finishAgent(realDataRef.current ?? undefined);
            setDone(true);
          }, 900);
        }
      }, timings[i])
    );

    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex flex-col min-h-dvh relative overflow-hidden"
      style={{ background: "#09090B" }}
    >
      {/* ── Background: layered radial glows ────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(0,200,117,0.07) 0%, transparent 65%)",
          animation: "glowBreathe 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 40% 30% at 50% 35%, rgba(0,200,117,0.05) 0%, transparent 60%)",
          animation: "glowBreathe 6s ease-in-out 1s infinite",
        }}
      />

      <div className="safe-top" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* ── Orbital animation ──────────────────────────────────────── */}
        <div className="relative flex items-center justify-center mb-10">
          {/* Expanding rings */}
          <div
            className="absolute rounded-full"
            style={{
              width: 120,
              height: 120,
              border: "1px solid rgba(0,200,117,0.25)",
              animation: "ringPulse 2.8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 88,
              height: 88,
              border: "1px solid rgba(0,200,117,0.2)",
              animation: "ringPulse 2.8s ease-in-out 0.5s infinite",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: 60,
              height: 60,
              border: "1px solid rgba(0,200,117,0.3)",
              animation: "ringPulse 2.8s ease-in-out 1s infinite",
            }}
          />

          {/* Core orb */}
          <div
            className="relative z-10 flex items-center justify-center rounded-full"
            style={{
              width: 48,
              height: 48,
              background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
              boxShadow:
                "0 0 0 1px rgba(0,200,117,0.3), 0 0 32px rgba(0,200,117,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              animation: "orbPulse 2.4s ease-in-out infinite",
            }}
          >
            {/* Scout compass/search icon */}
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
        </div>

        {/* ── Intent label ───────────────────────────────────────────── */}
        {activeIntent && !done && (
          <div className="text-center mb-8 px-4">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "#3F3F46" }}
            >
              Searching for
            </p>
            <p
              className="text-[16px] font-semibold leading-snug"
              style={{ color: "#F4F4F5" }}
            >
              {activeIntent}
            </p>
          </div>
        )}

        {/* ── Status stream ───────────────────────────────────────────── */}
        {!done && (
          <div className="w-full max-w-[340px] flex flex-col gap-2">
            {agentUpdates.map((update) => {
              const type = update.type as UpdateType;
              const color = TYPE_COLOR[type];
              return (
                <div
                  key={update.id}
                  className="flex items-center gap-3 animate-status-enter"
                  style={{ animationFillMode: "both" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `rgba(${hexToRgb(color)}, 0.12)`,
                      color,
                    }}
                  >
                    {TYPE_ICON[type]}
                  </div>
                  <p className="text-[13px]" style={{ color: "#A1A1AA" }}>
                    {update.message}
                  </p>
                  <div className="ml-auto flex-shrink-0">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {showTyping && agentUpdates.length < MOCK_AGENT_UPDATES.length && (
              <div className="flex items-center gap-3 animate-fade-in">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-[3px]">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-[3px] h-[3px] rounded-full animate-typing"
                        style={{
                          background: "#52525B",
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[13px]" style={{ color: "#3F3F46" }}>
                  Working...
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Done state ─────────────────────────────────────────────── */}
        {done && (
          <div className="w-full flex flex-col gap-0 animate-scale-in">

            {/* ── Section A: Result count ── */}
            <div className="text-center mb-6">
              <p
                className="text-[72px] font-bold leading-none mb-1"
                style={{
                  letterSpacing: "-0.04em",
                  background: "linear-gradient(135deg, #F4F4F5 0%, #A1A1AA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {liveCount ?? (realDataRef.current?.length ?? 5)}
              </p>
              <p className="text-[20px] font-semibold" style={{ color: "#F4F4F5" }}>
                leads found
              </p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="text-[13px]" style={{ color: "#52525B" }}>
                  {realDataRef.current?.filter((o) => o.priority === "hot").length ?? 3} hot
                </span>
                <span className="w-1 h-1 rounded-full" style={{ background: "#3F3F46" }} />
                <span className="text-[13px]" style={{ color: "#52525B" }}>
                  {realDataRef.current?.filter((o) => o.relationship.hasWarmPath).length ?? 1} warm path
                </span>
                <span className="w-1 h-1 rounded-full" style={{ background: "#3F3F46" }} />
                <span className="text-[13px]" style={{ color: "#52525B" }}>
                  {realDataRef.current?.filter((o) => o.priority === "watch").length ?? 2} to watch
                </span>
              </div>
            </div>

            {/* ── Section B: Top lead card ── */}
            {opportunities[0] && (
              <div className="w-full animate-fade-up" style={{ animationDelay: "200ms" }}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "#3F3F46" }}
                >
                  Your top lead right now
                </p>
                <OpportunityCard
                  opportunity={opportunities[0]}
                  isSaved={false}
                  index={0}
                  onClick={() => router.push(`/opportunities/${opportunities[0].id}`)}
                />
                <button
                  onClick={() => router.push(`/opportunities/${opportunities[0].id}`)}
                  className="pressable w-full py-4 rounded-2xl text-[15px] font-semibold mt-3"
                  style={{
                    background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                    color: "#fff",
                    boxShadow: "0 0 28px rgba(0,200,117,0.3)",
                  }}
                >
                  View this lead →
                </button>
              </div>
            )}

            {/* ── Section C: WhatsApp capture ── */}
            <div className="w-full animate-fade-up" style={{ animationDelay: "400ms" }}>
              <div
                className="rounded-2xl p-4 mt-4"
                style={{
                  background: "#1C1C22",
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                {whatsappSaved || whatsappPhone ? (
                  /* Confirmed state */
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(37,211,102,0.15)" }}
                    >
                      <Check size={14} style={{ color: "#25D366" }} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color: "#F4F4F5" }}>
                        WhatsApp alerts on
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: "#52525B" }}>
                        Scout will text you when new leads arrive
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Capture state */
                  <>
                    <div className="flex items-center gap-2.5 mb-3">
                      <MessageCircle size={15} style={{ color: "#25D366" }} strokeWidth={2} />
                      <p className="text-[14px] font-semibold" style={{ color: "#F4F4F5" }}>
                        Get alerted about leads like this
                      </p>
                    </div>
                    <div
                      className="flex items-center rounded-xl overflow-hidden mb-3"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.09)",
                      }}
                    >
                      <span
                        className="px-3 py-3 text-[14px] flex-shrink-0 border-r"
                        style={{ color: "#71717A", borderColor: "rgba(255,255,255,0.09)" }}
                      >
                        +1
                      </span>
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Phone number"
                        className="flex-1 px-3 py-3 text-[14px] bg-transparent outline-none"
                        style={{ color: "#F4F4F5", caretColor: "#00C875" }}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!phoneInput.trim()) return;
                        setSmsSending(true);
                        try {
                          await fetch(
                            `/api/notify/register`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ phone: phoneInput.trim() }),
                            }
                          );
                        } catch (_) {
                          // fail silently — still save locally
                        }
                        setWhatsappPhone(phoneInput.trim());
                        setWhatsappSaved(true);
                        setSmsSending(false);
                      }}
                      disabled={!phoneInput.trim() || smsSending}
                      className="pressable w-full py-3 rounded-xl text-[14px] font-semibold transition-all duration-200"
                      style={
                        phoneInput.trim()
                          ? {
                              background: "linear-gradient(135deg, #25D366 0%, #1da851 100%)",
                              color: "#fff",
                              boxShadow: "0 0 16px rgba(37,211,102,0.25)",
                            }
                          : {
                              background: "rgba(255,255,255,0.04)",
                              color: "#3F3F46",
                            }
                      }
                    >
                      {smsSending ? "Sending..." : "Send me WhatsApp alerts"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ── See all leads link ── */}
            <button
              onClick={() => router.push("/opportunities")}
              className="pressable text-[14px] font-semibold text-center py-4 mt-1"
              style={{ color: "#52525B" }}
            >
              See all {liveCount ?? opportunities.length} leads →
            </button>

          </div>
        )}
      </div>
    </div>
  );
}

// Helper — convert hex to rgb triplet for rgba()
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}
