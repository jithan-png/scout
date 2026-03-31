"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/ui/BottomNav";
import DesktopLanding from "@/components/ui/DesktopLanding";

const SUGGESTIONS = [
  "HVAC · Kelowna",
  "Electrical · BC Interior",
  "Framing · Okanagan",
  "Plumbing · Penticton",
  "Roofing · Vernon",
];

export default function HomePage() {
  const router = useRouter();
  const { setup, setActiveIntent, startAgent, opportunities } = useAppStore();
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hotCount = opportunities.filter((o) => o.priority === "hot").length;
  const hasText = input.trim().length > 0;

  useEffect(() => {
    if (!setup.completed) router.replace("/onboarding");
  }, [setup.completed, router]);

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!setup.completed) {
      router.push("/onboarding");
      return;
    }
    setActiveIntent(trimmed);
    startAgent();
    router.push("/working");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col min-h-dvh bg-base relative">
      <DesktopLanding />
      {/* ── Ambient top glow ─────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "45%",
          background:
            "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(0,200,117,0.1) 0%, transparent 68%)",
          animation: "glowBreathe 5s ease-in-out infinite",
        }}
      />

      <div className="safe-top" />

      {/* ── Logo bar ─────────────────────────────────────────────────── */}
      <header className="relative z-10 px-6 pt-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
              boxShadow: "0 0 16px rgba(0,200,117,0.35)",
            }}
          >
            {/* BuildMapper B glyph */}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z"
                fill="white"
                fillOpacity="0.9"
              />
              <path
                d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z"
                fill="white"
                fillOpacity="0.65"
              />
            </svg>
          </div>
          <span
            className="text-[15px] font-bold tracking-tight"
            style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}
          >
            BuildMapper
          </span>
        </div>

        {setup.completed && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: "rgba(0,200,117,0.1)",
              color: "#34D399",
              border: "1px solid rgba(0,200,117,0.2)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#00C875" }}
            />
            Live
          </div>
        )}
      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col px-6 pt-10">
        {setup.completed ? (
          /* ── Returning user ── */
          <div className="mb-8 animate-fade-up">
            <p
              className="text-[13px] font-medium mb-1.5"
              style={{ color: "#52525B" }}
            >
              Scout found this week
            </p>
            <div className="flex items-baseline gap-3">
              <span
                className="text-[52px] font-bold leading-none"
                style={{
                  letterSpacing: "-0.04em",
                  background: "linear-gradient(135deg, #F4F4F5 60%, #A1A1AA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {hotCount}
              </span>
              <div>
                <p
                  className="text-[17px] font-semibold leading-tight"
                  style={{ color: "#F4F4F5" }}
                >
                  hot leads
                </p>
                <p className="text-[13px]" style={{ color: "#52525B" }}>
                  {opportunities.length} total · 1 warm path
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── First time ── */
          <div className="mb-10">
            <h1
              className="font-bold leading-[1.1] mb-4 animate-fade-up"
              style={{
                fontSize: "clamp(34px, 8vw, 42px)",
                letterSpacing: "-0.035em",
                color: "#F4F4F5",
              }}
            >
              Scout is watching
              <br />
              <span style={{ color: "#00C875" }}>your market.</span>
            </h1>
            <p
              className="text-[15px] leading-relaxed animate-fade-up delay-150"
              style={{ color: "#71717A" }}
            >
              It scans live permits, maps your relationships, and tells
              you exactly who to call.
            </p>
          </div>
        )}

        {/* ── Intent input ──────────────────────────────────────────── */}
        <div
          className="relative rounded-2xl transition-all duration-300 animate-fade-up delay-300"
          style={{
            background: "#1C1C22",
            border: focused
              ? "1px solid rgba(0,200,117,0.4)"
              : "1px solid rgba(255,255,255,0.09)",
            boxShadow: focused
              ? "0 0 0 4px rgba(0,200,117,0.06), 0 0 28px rgba(0,200,117,0.12), 0 4px 24px rgba(0,0,0,0.5)"
              : "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="What do you sell? e.g. Mechanical, Electrical, Framing"
            rows={2}
            className="w-full px-4 pt-4 pb-3 text-[15px] resize-none leading-relaxed"
            style={{
              color: "#F4F4F5",
              background: "transparent",
              outline: "none",
              caretColor: "#00C875",
            }}
          />

          <div className="flex items-center justify-between px-4 pb-3.5">
            <span
              className="text-[12px]"
              style={{ color: "#3F3F46" }}
            >
              {hasText ? "Enter to search" : "e.g. HVAC · Kelowna"}
            </span>

            <button
              onClick={() => handleSubmit(input)}
              disabled={!hasText}
              className="pressable flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                width: 34,
                height: 34,
                background: hasText
                  ? "linear-gradient(135deg, #00C875 0%, #00A860 100%)"
                  : "rgba(255,255,255,0.05)",
                boxShadow: hasText
                  ? "0 0 14px rgba(0,200,117,0.35)"
                  : "none",
                color: hasText ? "#fff" : "#3F3F46",
              }}
            >
              <ArrowUp size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* ── Suggestions / quick actions ────────────────────────────── */}
        {!setup.completed && (
          <div className="mt-6 animate-fade-up delay-500">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#3F3F46" }}
            >
              Quick start
            </p>
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    handleSubmit(s);
                  }}
                  className="pressable flex-shrink-0 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#A1A1AA",
                    border: "1px solid rgba(255,255,255,0.08)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Returning user quick actions ────────────────────────────── */}
        {setup.completed && (
          <div className="mt-6 flex flex-col gap-3 animate-fade-up delay-300">
            <button
              onClick={() => router.push("/opportunities")}
              className="pressable flex items-center justify-between px-4 py-4 rounded-2xl"
              style={{
                background: "#1C1C22",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow:
                  "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="text-left">
                <p
                  className="text-[15px] font-semibold"
                  style={{ color: "#F4F4F5" }}
                >
                  View hot leads
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "#52525B" }}>
                  {hotCount} opportunities ready
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,200,117,0.12)" }}
              >
                <ArrowUp
                  size={14}
                  style={{ color: "#00C875", transform: "rotate(90deg)" }}
                  strokeWidth={2.5}
                />
              </div>
            </button>

            <button
              onClick={() => {
                const q = "Who should I follow up with this week?";
                setInput(q);
                handleSubmit(q);
              }}
              className="pressable flex items-center justify-between px-4 py-4 rounded-2xl"
              style={{
                background: "#1C1C22",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow:
                  "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="text-left">
                <p
                  className="text-[15px] font-semibold"
                  style={{ color: "#F4F4F5" }}
                >
                  Follow-up suggestions
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "#52525B" }}>
                  Scout analyzes your pipeline
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <ArrowUp
                  size={14}
                  style={{ color: "#52525B", transform: "rotate(90deg)" }}
                  strokeWidth={2.5}
                />
              </div>
            </button>
          </div>
        )}
      </main>

      <div className="pb-nav" />
      <BottomNav />
    </div>
  );
}
