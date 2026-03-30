"use client";

import { useState, useEffect } from "react";
import { ArrowUp, Copy, Check, Smartphone, MessageCircle } from "lucide-react";

const SUGGESTIONS = [
  "HVAC · Kelowna",
  "Electrical · BC Interior",
  "Framing · Okanagan",
  "Plumbing · Penticton",
  "Roofing · Vernon",
];

const APP_URL = "buildmapper.app";

// ── BuildMapper logo glyph ───────────────────────────────────────────────────

function BLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.9" />
      <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.65" />
    </svg>
  );
}

// ── Phone mock phase screens ─────────────────────────────────────────────────

function MockHome({ input }: { input: string }) {
  return (
    <div className="flex flex-col h-full relative" style={{ background: "#09090B", padding: "28px 18px 18px" }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "45%",
          background: "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(0,200,117,0.09) 0%, transparent 70%)",
        }}
      />

      {/* Logo row */}
      <div className="flex items-center gap-1.5 mb-7 relative">
        <div
          className="w-6 h-6 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
            boxShadow: "0 0 12px rgba(0,200,117,0.3)",
          }}
        >
          <BLogo size={11} />
        </div>
        <span className="text-[12px] font-bold" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
          BuildMapper
        </span>
      </div>

      {/* Headline */}
      <div className="relative mb-5">
        <h3
          className="font-bold leading-tight mb-2"
          style={{ fontSize: 20, letterSpacing: "-0.03em", color: "#F4F4F5" }}
        >
          Scout is watching
          <br />
          <span style={{ color: "#00C875" }}>your market.</span>
        </h3>
        <p className="text-[10px] leading-relaxed" style={{ color: "#71717A" }}>
          Live permits · Your network · Who to call
        </p>
      </div>

      {/* Input card */}
      <div
        className="rounded-[14px]"
        style={{
          background: "#1C1C22",
          border: "1px solid rgba(0,200,117,0.35)",
          boxShadow: "0 0 0 3px rgba(0,200,117,0.05), 0 0 20px rgba(0,200,117,0.1)",
        }}
      >
        <div className="px-3 pt-3 pb-2">
          <p className="text-[9px] mb-1.5" style={{ color: "#52525B" }}>
            What do you sell? e.g. Mechanical, Electrical
          </p>
          <p className="text-[11px] font-medium" style={{ color: "#F4F4F5", minHeight: 16 }}>
            {input || "\u00A0"}
          </p>
        </div>
        <div className="flex items-center justify-between px-3 pb-3">
          <span className="text-[9px]" style={{ color: "#3F3F46" }}>
            HVAC · Kelowna
          </span>
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              background: input
                ? "linear-gradient(135deg, #00C875 0%, #00A860 100%)"
                : "rgba(255,255,255,0.05)",
              boxShadow: input ? "0 0 10px rgba(0,200,117,0.3)" : "none",
            }}
          >
            <ArrowUp size={10} color={input ? "white" : "#3F3F46"} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Chips */}
      <div className="flex gap-1.5 mt-3 flex-wrap">
        {["HVAC · Kelowna", "Electrical", "Framing"].map((c) => (
          <span
            key={c}
            className="px-2 py-1 rounded-full text-[9px] font-medium"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "#A1A1AA",
              border: "1px solid rgba(255,255,255,0.07)",
              whiteSpace: "nowrap",
            }}
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function MockWorking() {
  return (
    <div
      className="flex flex-col h-full items-center justify-center gap-5 relative"
      style={{ background: "#09090B" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,200,117,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Orb with rings */}
      <div className="relative flex items-center justify-center">
        <div
          className="absolute rounded-full"
          style={{
            width: 100,
            height: 100,
            background: "rgba(0,200,117,0.05)",
            border: "1px solid rgba(0,200,117,0.12)",
            animation: "ringPulse 2.8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 68,
            height: 68,
            background: "rgba(0,200,117,0.07)",
            border: "1px solid rgba(0,200,117,0.18)",
            animation: "ringPulse 2.8s ease-in-out 0.5s infinite",
          }}
        />
        <div
          className="rounded-full flex items-center justify-center relative z-10"
          style={{
            width: 44,
            height: 44,
            background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
            boxShadow: "0 0 24px rgba(0,200,117,0.45)",
            animation: "orbPulse 2.4s ease-in-out infinite",
          }}
        >
          <BLogo size={16} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col items-center gap-1 relative">
        <p className="text-[12px] font-semibold" style={{ color: "#F4F4F5" }}>
          Scout is searching
        </p>
        <p className="text-[10px]" style={{ color: "#52525B" }}>
          Scanning live permits...
        </p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{
                background: "#00C875",
                animation: `typing 1.4s ease ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockDone() {
  return (
    <div className="flex flex-col h-full" style={{ background: "#09090B", padding: "22px 18px 18px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-[7px] flex items-center justify-center"
            style={{
              width: 20,
              height: 20,
              background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
            }}
          >
            <BLogo size={10} />
          </div>
          <span
            className="text-[11px] font-bold"
            style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}
          >
            BuildMapper
          </span>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(0,200,117,0.1)",
            border: "1px solid rgba(0,200,117,0.2)",
          }}
        >
          <span className="w-1 h-1 rounded-full" style={{ background: "#00C875" }} />
          <span className="text-[8px] font-semibold" style={{ color: "#34D399" }}>
            Live
          </span>
        </div>
      </div>

      {/* Count */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span
            className="font-bold leading-none"
            style={{
              fontSize: 40,
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, #F4F4F5 60%, #A1A1AA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            5
          </span>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#F4F4F5" }}>
              leads found
            </p>
            <p className="text-[9px]" style={{ color: "#52525B" }}>
              3 hot · 1 warm · 1 to watch
            </p>
          </div>
        </div>
      </div>

      {/* Top lead card */}
      <div
        className="rounded-[12px] p-3 mb-3"
        style={{
          background: "#141418",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: "rgba(239,68,68,0.12)",
              color: "#EF4444",
              letterSpacing: "0.03em",
            }}
          >
            HOT
          </span>
          <span className="text-[8px]" style={{ color: "#52525B" }}>
            2 days ago
          </span>
        </div>
        <p className="text-[10px] font-semibold leading-tight mb-1" style={{ color: "#F4F4F5" }}>
          West Kelowna Townhomes Ph.2
        </p>
        <p className="text-[9px] mb-2" style={{ color: "#52525B" }}>
          Gellatly Homes · $3.2M
        </p>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#00C875" }} />
          <span className="text-[9px]" style={{ color: "#34D399" }}>
            You&apos;ve worked with them before
          </span>
        </div>
      </div>

      {/* CTA */}
      <button
        className="w-full py-2.5 rounded-xl text-[11px] font-semibold"
        style={{
          background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
          color: "#fff",
        }}
      >
        View all 5 leads →
      </button>
    </div>
  );
}

// ── Phone frame with cycling phases ─────────────────────────────────────────

type PhaseKey = "home" | "working" | "done";

const PHASES: { key: PhaseKey; duration: number }[] = [
  { key: "home", duration: 3500 },
  { key: "working", duration: 4200 },
  { key: "done", duration: 5000 },
];

function PhoneMockup() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [typedInput, setTypedInput] = useState("");

  const fullText = "HVAC · Kelowna";

  // Typewriter effect for home phase
  useEffect(() => {
    if (phaseIndex !== 0) {
      setTypedInput("");
      return;
    }
    setTypedInput("");
    let i = 0;
    // Small delay before typing starts
    const startDelay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setTypedInput(fullText.slice(0, i));
        if (i >= fullText.length) clearInterval(interval);
      }, 65);
      return () => clearInterval(interval);
    }, 600);
    return () => clearTimeout(startDelay);
  }, [phaseIndex]);

  // Phase cycling with fade
  useEffect(() => {
    const phase = PHASES[phaseIndex];
    const fadeOut = setTimeout(() => setVisible(false), phase.duration - 400);
    const advance = setTimeout(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
      setVisible(true);
    }, phase.duration);
    return () => {
      clearTimeout(fadeOut);
      clearTimeout(advance);
    };
  }, [phaseIndex]);

  const currentPhase = PHASES[phaseIndex].key;

  return (
    <div
      style={{
        width: 270,
        height: 552,
        borderRadius: 44,
        background: "#1C1C1E",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.1), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,200,117,0.07)",
        padding: 8,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Screen */}
      <div
        style={{
          borderRadius: 38,
          width: "100%",
          height: "100%",
          background: "#09090B",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 100,
            height: 26,
            borderRadius: 20,
            background: "#000",
            zIndex: 20,
          }}
        />

        {/* Phase content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: visible ? 1 : 0,
            transition: "opacity 400ms ease",
          }}
        >
          {currentPhase === "home" && <MockHome input={typedInput} />}
          {currentPhase === "working" && <MockWorking />}
          {currentPhase === "done" && <MockDone />}
        </div>
      </div>

      {/* Physical side buttons */}
      <div style={{ position: "absolute", width: 3, height: 28, borderRadius: 2, background: "#2C2C2E", left: -3, top: 82 }} />
      <div style={{ position: "absolute", width: 3, height: 28, borderRadius: 2, background: "#2C2C2E", left: -3, top: 118 }} />
      <div style={{ position: "absolute", width: 3, height: 52, borderRadius: 2, background: "#2C2C2E", right: -3, top: 100 }} />
    </div>
  );
}

// ── Main desktop overlay ─────────────────────────────────────────────────────

export default function DesktopLanding() {
  const [input, setInput] = useState("");
  const [showMobilePrompt, setShowMobilePrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setShowMobilePrompt(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
    } catch {
      // fallback: select a temp input
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSMS = () => {
    window.open(`sms:?body=Check out BuildMapper — ${APP_URL}`);
  };

  return (
    <div
      className="hidden md:flex fixed inset-0 z-50"
      style={{ background: "#09090B" }}
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 55% 55% at 15% 50%, rgba(0,200,117,0.05) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 45% 55% at 85% 50%, rgba(0,200,117,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Left column ────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center flex-1 px-14 xl:px-20" style={{ maxWidth: 640 }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 animate-fade-up" style={{ animationDelay: "0ms" }}>
          <div
            className="rounded-[14px] flex items-center justify-center flex-shrink-0"
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
              boxShadow: "0 0 20px rgba(0,200,117,0.35)",
            }}
          >
            <BLogo size={18} />
          </div>
          <span
            className="text-[20px] font-bold"
            style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}
          >
            BuildMapper
          </span>
        </div>

        {/* Headline */}
        <div className="mb-8 animate-fade-up" style={{ animationDelay: "80ms" }}>
          <h1
            className="font-bold leading-[1.1] mb-4"
            style={{
              fontSize: "clamp(40px, 4vw, 56px)",
              letterSpacing: "-0.035em",
              color: "#F4F4F5",
            }}
          >
            Scout is watching
            <br />
            <span style={{ color: "#00C875" }}>your market.</span>
          </h1>
          <p
            className="text-[17px] leading-relaxed"
            style={{ color: "#71717A", maxWidth: 420 }}
          >
            It scans live permits, maps your relationships, and tells you exactly who to call.
          </p>
        </div>

        {!showMobilePrompt ? (
          <>
            {/* Search input */}
            <div className="mb-4 animate-fade-up" style={{ animationDelay: "160ms" }}>
              <div
                className="relative rounded-2xl"
                style={{
                  background: "#1C1C22",
                  border: "1px solid rgba(255,255,255,0.09)",
                  boxShadow:
                    "0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  placeholder="What do you sell? e.g. Mechanical, Electrical, Framing"
                  className="w-full px-5 pt-4 pb-3 text-[15px] leading-relaxed bg-transparent"
                  style={{ color: "#F4F4F5", outline: "none", caretColor: "#00C875" }}
                />
                <div className="flex items-center justify-between px-5 pb-4">
                  <span className="text-[12px]" style={{ color: "#3F3F46" }}>
                    {input ? "Enter to search" : "e.g. HVAC · Kelowna"}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    className="flex items-center justify-center rounded-full transition-all duration-200"
                    style={{
                      width: 34,
                      height: 34,
                      background: input.trim()
                        ? "linear-gradient(135deg, #00C875 0%, #00A860 100%)"
                        : "rgba(255,255,255,0.05)",
                      boxShadow: input.trim()
                        ? "0 0 14px rgba(0,200,117,0.35)"
                        : "none",
                      color: input.trim() ? "#fff" : "#3F3F46",
                    }}
                  >
                    <ArrowUp size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestion chips */}
            <div
              className="flex flex-wrap gap-2 mb-10 animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setInput(s);
                    setShowMobilePrompt(true);
                  }}
                  className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-all duration-200"
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

            {/* Best on mobile divider + URL row */}
            <div className="animate-fade-up" style={{ animationDelay: "320ms" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                <span className="text-[11px] font-medium" style={{ color: "#52525B" }}>
                  Best on mobile
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl"
                  style={{
                    background: "#1C1C22",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Smartphone size={14} style={{ color: "#52525B", flexShrink: 0 }} />
                  <span className="text-[13px] font-mono" style={{ color: "#71717A" }}>
                    {APP_URL}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200"
                  style={{
                    background: copied ? "rgba(0,200,117,0.1)" : "rgba(255,255,255,0.05)",
                    color: copied ? "#34D399" : "#A1A1AA",
                    border: `1px solid ${copied ? "rgba(0,200,117,0.2)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Mobile prompt state */
          <div className="animate-fade-up">
            <div
              className="p-6 rounded-2xl mb-4"
              style={{
                background: "#1C1C22",
                border: "1px solid rgba(0,200,117,0.15)",
                boxShadow: "0 0 40px rgba(0,200,117,0.05)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: "rgba(0,200,117,0.1)",
                    border: "1px solid rgba(0,200,117,0.2)",
                  }}
                >
                  <Smartphone size={16} style={{ color: "#00C875" }} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold" style={{ color: "#F4F4F5" }}>
                    Open on your phone
                  </p>
                  <p className="text-[12px]" style={{ color: "#52525B" }}>
                    Scout works best as a mobile experience
                  </p>
                </div>
              </div>

              {/* URL + copy */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl"
                  style={{
                    background: "#141418",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-[13px] font-mono" style={{ color: "#71717A" }}>
                    {APP_URL}
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200"
                  style={{
                    background: copied ? "rgba(0,200,117,0.1)" : "rgba(255,255,255,0.05)",
                    color: copied ? "#34D399" : "#A1A1AA",
                    border: `1px solid ${copied ? "rgba(0,200,117,0.2)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>

              {/* SMS CTA */}
              <button
                onClick={handleSMS}
                className="w-full py-3.5 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                  color: "#fff",
                  boxShadow: "0 0 24px rgba(0,200,117,0.25)",
                }}
              >
                <MessageCircle size={17} />
                Text me the link
              </button>
            </div>

            <button
              onClick={() => setShowMobilePrompt(false)}
              className="text-[13px] transition-colors duration-150"
              style={{ color: "#52525B" }}
            >
              ← Back
            </button>
          </div>
        )}
      </div>

      {/* ── Right column — phone mockup ─────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.025,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Green glow behind phone */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 340,
            height: 340,
            background: "radial-gradient(circle, rgba(0,200,117,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Floating phone */}
        <div style={{ animation: "float 7s ease-in-out infinite" }}>
          <PhoneMockup />
        </div>
      </div>
    </div>
  );
}
