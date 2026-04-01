"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowUp, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

const TRADE_OPTIONS = [
  "Mechanical / HVAC", "Electrical", "Plumbing", "Framing / Structure",
  "Roofing", "Concrete / Foundation", "Drywall / Insulation", "Windows & Doors",
  "Painting & Finishing", "Fire Protection", "General Contracting", "Materials & Supply",
];

const SCAN_MESSAGES = [
  { text: "Scanning live permits in your area...", color: "#60A5FA" },
  { text: "Found recent permit activity matching your profile", color: "#F59E0B" },
  { text: "Cross-referencing relationship signals...", color: "#A78BFA" },
  { text: "Scoring each opportunity against your profile", color: "#00C875" },
  { text: "Done — your opportunities are ready", color: "#00C875" },
];

type Phase = "chat" | "loading" | "payoff";

// ── Shared logo ───────────────────────────────────────────────────────────────

function BLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.9" />
      <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.65" />
    </svg>
  );
}

// ── Phone mockup screens ──────────────────────────────────────────────────────

function PhoneSetup1({ selected }: { selected: string[] }) {
  const preview = TRADE_OPTIONS.slice(0, 9);
  return (
    <div className="relative flex flex-col h-full" style={{
      background: "#09090B",
      padding: "36px 14px 14px",
      backgroundImage: "linear-gradient(rgba(96,165,250,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.05) 1px, transparent 1px)",
      backgroundSize: "12px 12px",
    }}>
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{ height: "40%", background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,200,117,0.08) 0%, transparent 70%)" }}
      />
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-1 relative" style={{ color: "#52525B" }}>
        Step 1 of 3
      </p>
      <p className="text-[15px] font-bold mb-3 relative" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
        What do you sell?
      </p>
      <div className="flex flex-wrap gap-1.5 relative">
        {preview.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <span
              key={opt}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-medium"
              style={{
                background: isSelected ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isSelected ? "rgba(0,200,117,0.3)" : "rgba(255,255,255,0.08)"}`,
                color: isSelected ? "#34D399" : "#71717A",
              }}
            >
              {isSelected && <Check size={6} strokeWidth={3} />}
              {opt}
            </span>
          );
        })}
      </div>

      {/* Construction illustration — blueprint elevation + crane */}
      <div className="absolute bottom-0 inset-x-0 pointer-events-none" style={{ opacity: 0.09 }}>
        <svg width="100%" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ground line */}
          <line x1="0" y1="110" x2="160" y2="110" stroke="white" strokeWidth="0.8"/>
          {/* Main building */}
          <rect x="20" y="20" width="85" height="90" stroke="white" strokeWidth="0.8"/>
          {/* Floor dividers */}
          <line x1="20" y1="50" x2="105" y2="50" stroke="white" strokeWidth="0.5"/>
          <line x1="20" y1="80" x2="105" y2="80" stroke="white" strokeWidth="0.5"/>
          {/* Windows row 1 */}
          <rect x="28" y="27" width="14" height="16" stroke="white" strokeWidth="0.5"/>
          <rect x="50" y="27" width="14" height="16" stroke="white" strokeWidth="0.5"/>
          <rect x="72" y="27" width="14" height="16" stroke="white" strokeWidth="0.5"/>
          {/* Windows row 2 */}
          <rect x="28" y="57" width="14" height="16" stroke="white" strokeWidth="0.5"/>
          <rect x="50" y="57" width="14" height="16" stroke="white" strokeWidth="0.5"/>
          <rect x="72" y="57" width="14" height="16" stroke="white" strokeWidth="0.5"/>
          {/* Door */}
          <rect x="50" y="87" width="18" height="23" stroke="white" strokeWidth="0.5"/>
          {/* Crane tower */}
          <line x1="120" y1="110" x2="120" y2="5" stroke="white" strokeWidth="1"/>
          {/* Crane jib */}
          <line x1="120" y1="5" x2="152" y2="5" stroke="white" strokeWidth="0.8"/>
          <line x1="120" y1="5" x2="108" y2="5" stroke="white" strokeWidth="0.8"/>
          {/* Crane cable */}
          <line x1="146" y1="5" x2="146" y2="28" stroke="white" strokeWidth="0.5"/>
          {/* Crane hook */}
          <rect x="141" y="28" width="10" height="7" stroke="white" strokeWidth="0.5"/>
          {/* Crane base */}
          <line x1="115" y1="110" x2="125" y2="110" stroke="white" strokeWidth="1.5"/>
          {/* Dimension ticks — left */}
          <line x1="10" y1="20" x2="15" y2="20" stroke="white" strokeWidth="0.5"/>
          <line x1="10" y1="50" x2="15" y2="50" stroke="white" strokeWidth="0.5"/>
          <line x1="10" y1="80" x2="15" y2="80" stroke="white" strokeWidth="0.5"/>
          <line x1="10" y1="110" x2="15" y2="110" stroke="white" strokeWidth="0.5"/>
          <line x1="12" y1="20" x2="12" y2="110" stroke="white" strokeWidth="0.4"/>
        </svg>
      </div>
    </div>
  );
}

function PhoneWorking() {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-4 relative" style={{
      background: "#09090B",
      backgroundImage: "linear-gradient(rgba(96,165,250,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.04) 1px, transparent 1px)",
      backgroundSize: "12px 12px",
    }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,200,117,0.08) 0%, transparent 70%)" }}
      />
      <div className="relative flex items-center justify-center">
        {[100, 68].map((size, i) => (
          <div key={size} className="absolute rounded-full" style={{
            width: size, height: size,
            border: "1px solid rgba(0,200,117,0.18)",
            animation: `ringPulse 2.8s ease-in-out ${i * 0.5}s infinite`,
          }} />
        ))}
        <div className="rounded-full flex items-center justify-center relative z-10" style={{
          width: 44, height: 44,
          background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
          boxShadow: "0 0 24px rgba(0,200,117,0.45)",
          animation: "orbPulse 2.4s ease-in-out infinite",
        }}>
          <BLogo size={16} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[11px] font-semibold" style={{ color: "#F4F4F5" }}>Scout is searching</p>
        <div className="flex gap-1 mt-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full" style={{ background: "#00C875", animation: `typing 1.4s ease ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PhonePayoff({ trades, locations }: { trades: string[]; locations: string[] }) {
  const leadCount = Math.min(3 + trades.length + locations.length, 12);
  const hotCount = Math.max(2, Math.floor(leadCount * 0.4));
  return (
    <div className="flex flex-col h-full relative" style={{
      background: "#09090B",
      padding: "22px 14px 14px",
      backgroundImage: "linear-gradient(rgba(96,165,250,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.04) 1px, transparent 1px)",
      backgroundSize: "12px 12px",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <div className="rounded-[7px] flex items-center justify-center" style={{ width: 18, height: 18, background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)" }}>
            <BLogo size={9} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: "#F4F4F5" }}>BuildMapper</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.2)" }}>
          <span className="w-1 h-1 rounded-full" style={{ background: "#00C875" }} />
          <span className="text-[7px] font-semibold" style={{ color: "#34D399" }}>Live</span>
        </div>
      </div>
      {/* Count */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-bold leading-none" style={{
            fontSize: 36, letterSpacing: "-0.04em",
            background: "linear-gradient(135deg, #F4F4F5 60%, #A1A1AA 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>{leadCount}</span>
          <div>
            <p className="text-[11px] font-semibold" style={{ color: "#F4F4F5" }}>opportunities found</p>
            <p className="text-[8px]" style={{ color: "#52525B" }}>{hotCount} hot · {leadCount - hotCount} more</p>
          </div>
        </div>
      </div>
      {/* Blurred lead cards */}
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl p-2.5 mb-2" style={{
          background: "#141418",
          border: "1px solid rgba(255,255,255,0.06)",
          filter: "blur(3px)",
          opacity: i === 2 ? 0.5 : 0.85,
        }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}>HOT</span>
            <span className="text-[7px]" style={{ color: "#52525B" }}>2 days ago</span>
          </div>
          <div className="h-2 rounded mb-1" style={{ background: "rgba(255,255,255,0.08)", width: "75%" }} />
          <div className="h-1.5 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "50%" }} />
        </div>
      ))}
      {/* Lock overlay */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-4" style={{
        top: 120,
        background: "linear-gradient(to bottom, transparent 0%, rgba(9,9,11,0.95) 40%)",
      }}>
        <div className="flex items-center justify-center rounded-full mb-2" style={{
          width: 32, height: 32,
          background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
          boxShadow: "0 0 16px rgba(0,200,117,0.4)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </div>
        <p className="text-[9px] font-semibold text-center" style={{ color: "#F4F4F5" }}>Open on mobile</p>
        <p className="text-[8px] text-center mt-0.5" style={{ color: "#52525B" }}>to see your opportunities</p>
      </div>
    </div>
  );
}

// ── Phone frame ───────────────────────────────────────────────────────────────

const DEMO_TRADES = ["Mechanical / HVAC"];
const DEMO_LOCATIONS = ["Kelowna"];

function PhoneFrame({ phase, trades, locations, slideOverride }: {
  phase: Phase;
  trades: string[];
  locations: string[];
  slideOverride?: number;
}) {
  return (
    <div style={{
      width: 270, height: 552, borderRadius: 44,
      background: "#1C1C1E",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,200,117,0.07)",
      padding: 8, position: "relative", flexShrink: 0,
    }}>
      <div style={{ borderRadius: 38, width: "100%", height: "100%", background: "#09090B", overflow: "hidden", position: "relative" }}>
        {/* Dynamic Island */}
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 100, height: 26, borderRadius: 20, background: "#000", zIndex: 20 }} />
        <div style={{ position: "absolute", inset: 0, transition: "opacity 0.4s ease" }}>
          {phase === "chat" && slideOverride === 0 && <PhoneSetup1 selected={DEMO_TRADES} />}
          {phase === "chat" && slideOverride === 1 && <PhoneWorking />}
          {phase === "chat" && slideOverride === 2 && <PhonePayoff trades={DEMO_TRADES} locations={DEMO_LOCATIONS} />}
          {phase === "loading"  && <PhoneWorking />}
          {phase === "payoff"   && <PhonePayoff trades={trades} locations={locations} />}
        </div>
      </div>
      {/* Side buttons */}
      <div style={{ position: "absolute", width: 3, height: 28, borderRadius: 2, background: "#2C2C2E", left: -3, top: 82 }} />
      <div style={{ position: "absolute", width: 3, height: 28, borderRadius: 2, background: "#2C2C2E", left: -3, top: 118 }} />
      <div style={{ position: "absolute", width: 3, height: 52, borderRadius: 2, background: "#2C2C2E", right: -3, top: 100 }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DesktopLanding() {
  const router = useRouter();
  const { toggleWhatISell, toggleWhereIOperate, toggleProjectType } = useAppStore();
  const [phase, setPhase] = useState<Phase>("chat");
  const [trades, setTrades] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [scanMessages, setScanMessages] = useState<number[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [phoneSlide, setPhoneSlide] = useState(0);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Phone slide cycle during chat phase
  useEffect(() => {
    if (phase !== "chat") return;
    setPhoneSlide(0);
    const id = setInterval(() => setPhoneSlide((s) => (s + 1) % 3), 3000);
    return () => clearInterval(id);
  }, [phase]);

  // Loading sequence
  useEffect(() => {
    if (phase !== "loading") return;
    setScanMessages([]);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    SCAN_MESSAGES.forEach((_, i) => {
      timeouts.push(setTimeout(() => setScanMessages((prev) => [...prev, i]), i * 900 + 400));
    });
    // Navigate to /working after animation — user sees real results before auth gate
    timeouts.push(setTimeout(() => router.push("/working"), SCAN_MESSAGES.length * 900 + 1200));
    return () => timeouts.forEach(clearTimeout);
  }, [phase]);

  const handleChatSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat/parse-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trades?.length) {
          setTrades(data.trades);
          data.trades.forEach((t: string) => toggleWhatISell(t));
        }
        if (data.cities?.length) {
          setLocations(data.cities);
          data.cities.forEach((c: string) => toggleWhereIOperate(c));
        }
        if (data.projectTypes?.length) {
          data.projectTypes.forEach((t: string) => toggleProjectType(t));
        }
      }
    } catch (_) {}
    setChatLoading(false);
    setPhase("loading");
  };

  const autoResizeChat = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const leadCount = Math.min(3 + trades.length + locations.length, 12);
  const hotCount = Math.max(2, Math.floor(leadCount * 0.4));

  return (
    <div className="hidden md:flex fixed inset-0 z-50" style={{ background: "#09090B" }}>
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 55% at 15% 50%, rgba(0,200,117,0.05) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 45% 55% at 85% 50%, rgba(0,200,117,0.03) 0%, transparent 70%)" }} />
      </div>

      {/* ── Left column ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center flex-1 px-14 xl:px-20 overflow-y-auto py-12" style={{ maxWidth: 640 }}>

        {/* Logo — always visible */}
        <div className="flex items-center gap-3 mb-10">
          <div className="rounded-[14px] flex items-center justify-center flex-shrink-0" style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
            boxShadow: "0 0 20px rgba(0,200,117,0.35)",
          }}>
            <BLogo size={18} />
          </div>
          <span className="text-[20px] font-bold" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
            BuildMapper
          </span>
        </div>

        {/* ── CHAT ONBOARDING ── */}
        {phase === "chat" && (
          <div key="chat" className="animate-fade-up">
            {/* Hero copy */}
            <h1 className="font-bold leading-[1.1] mb-4" style={{
              fontSize: "clamp(38px, 3.8vw, 54px)",
              letterSpacing: "-0.035em", color: "#F4F4F5",
            }}>
              Scout is watching<br />
              <span style={{ color: "#00C875" }}>your market.</span>
            </h1>
            <p className="text-[17px] leading-relaxed mb-10" style={{ color: "#71717A", maxWidth: 420 }}>
              It scans permits, tenders, LinkedIn, and the web — then maps your fastest path to winning each opportunity.
            </p>

            {/* Scout avatar + greeting */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 20px rgba(0,200,117,0.3)" }}
              >
                <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                  <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.95" />
                  <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.7" />
                </svg>
              </div>
              <div>
                <p className="text-[16px] font-semibold" style={{ color: "#F4F4F5" }}>Hey, I&apos;m Scout</p>
                <p className="text-[13px]" style={{ color: "#52525B" }}>Tell me what you do and where — I&apos;ll set up your profile to get started.</p>
              </div>
            </div>

            {/* Textarea + send */}
            <div
              className="relative rounded-2xl transition-all duration-200 mb-4"
              style={{
                background: "#1C1C22",
                border: `1px solid ${chatInput.trim() ? "rgba(0,200,117,0.3)" : "rgba(255,255,255,0.09)"}`,
                boxShadow: chatInput.trim() ? "0 0 20px rgba(0,200,117,0.08)" : "none",
              }}
            >
              <textarea
                ref={chatTextareaRef}
                rows={1}
                value={chatInput}
                onChange={(e) => { setChatInput(e.target.value); autoResizeChat(e.target); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSubmit(chatInput); } }}
                placeholder="e.g. I do HVAC in Kelowna — mostly commercial and multi-family projects"
                className="w-full px-4 pt-4 pb-4 pr-14 text-[15px] bg-transparent resize-none outline-none leading-relaxed"
                style={{ color: "#F4F4F5", caretColor: "#00C875", minHeight: 80 }}
              />
              <button
                onClick={() => handleChatSubmit(chatInput)}
                disabled={!chatInput.trim() || chatLoading}
                className="pressable absolute right-3 bottom-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                style={
                  chatInput.trim() && !chatLoading
                    ? { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 16px rgba(0,200,117,0.35)" }
                    : { background: "rgba(255,255,255,0.06)" }
                }
              >
                {chatLoading
                  ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }} />
                  : <ArrowUp size={16} strokeWidth={2.5} style={{ color: chatInput.trim() ? "#fff" : "#52525B" }} />
                }
              </button>
            </div>

          </div>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <div key="loading" className="animate-fade-up">
            <div className="flex items-center gap-4 mb-10">
              <div className="relative flex items-center justify-center flex-shrink-0">
                {[56, 40].map((size, i) => (
                  <div key={size} className="absolute rounded-full" style={{
                    width: size, height: size,
                    border: "1px solid rgba(0,200,117,0.2)",
                    animation: `ringPulse 2.8s ease-in-out ${i * 0.5}s infinite`,
                  }} />
                ))}
                <div className="rounded-full flex items-center justify-center relative z-10" style={{
                  width: 28, height: 28,
                  background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                  boxShadow: "0 0 16px rgba(0,200,117,0.4)",
                  animation: "orbPulse 2.4s ease-in-out infinite",
                }}>
                  <BLogo size={12} />
                </div>
              </div>
              <div>
                <p className="text-[22px] font-bold" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
                  Scout is searching
                </p>
                <p className="text-[14px]" style={{ color: "#52525B" }}>
                  {trades.slice(0, 2).join(", ")} · {locations.slice(0, 2).join(", ")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {SCAN_MESSAGES.map((msg, i) => (
                scanMessages.includes(i) && (
                  <div key={i} className="flex items-center gap-3 animate-status-enter">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: msg.color }} />
                    <p className="text-[15px]" style={{ color: i === SCAN_MESSAGES.length - 1 ? "#F4F4F5" : "#A1A1AA", fontWeight: i === SCAN_MESSAGES.length - 1 ? 600 : 400 }}>
                      {msg.text}
                    </p>
                  </div>
                )
              ))}
              {scanMessages.length < SCAN_MESSAGES.length && (
                <div className="flex items-center gap-3 animate-fade-in">
                  <div className="flex gap-1 ml-0.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#52525B", animation: `typing 1.4s ease ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PAYOFF ── */}
        {phase === "payoff" && (
          <div key="payoff" className="animate-fade-up">
            {/* Result headline */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-bold leading-none" style={{
                fontSize: 72, letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, #F4F4F5 60%, #A1A1AA 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                {leadCount}
              </span>
              <div>
                <p className="text-[22px] font-bold" style={{ color: "#F4F4F5" }}>opportunities found</p>
                <p className="text-[14px]" style={{ color: "#52525B" }}>
                  {hotCount} hot · {leadCount - hotCount} more in {locations[0] || "your area"}
                </p>
              </div>
            </div>
            <p className="text-[15px] mb-8" style={{ color: "#71717A" }}>
              Your results are ready — open Scout on your phone to see them.
            </p>

            {/* Sign in to access results */}
            <div className="rounded-2xl p-6 mb-4" style={{
              background: "#1C1C22",
              border: "1px solid rgba(0,200,117,0.15)",
              boxShadow: "0 0 40px rgba(0,200,117,0.06)",
            }}>
              <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: "#3F3F46" }}>
                Sign in to see your opportunities
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => signIn("google", { callbackUrl: "/scout" })}
                  className="pressable w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[15px] font-semibold"
                  style={{ background: "#fff", color: "#111" }}
                >
                  <GoogleIcon /> Continue with Google
                </button>
                <button
                  onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/scout" })}
                  className="pressable w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[15px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F4F4F5" }}
                >
                  <MicrosoftIcon /> Continue with Microsoft
                </button>
                <button
                  onClick={() => signIn("linkedin", { callbackUrl: "/scout" })}
                  className="pressable w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[15px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#F4F4F5" }}
                >
                  <LinkedInIcon /> Continue with LinkedIn
                </button>
              </div>
            </div>

            <button
              onClick={() => window.location.href = "/opportunities"}
              className="text-[13px] transition-colors duration-150 text-center w-full"
              style={{ color: "#52525B" }}
            >
              I'll do this later →
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { setPhase("chat"); setTrades([]); setLocations([]); }}
                className="text-[13px] transition-colors duration-150"
                style={{ color: "#52525B" }}
              >
                ← Start over
              </button>
              {process.env.NODE_ENV !== "production" && (
                <button
                  onClick={() => signIn("credentials", { callbackUrl: "/scout" })}
                  className="text-[12px] px-3 py-1.5 rounded-lg"
                  style={{ color: "#3F3F46", border: "1px dashed rgba(255,255,255,0.1)" }}
                >
                  Skip login (test mode)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right column — phone ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: [
            "linear-gradient(rgba(96,165,250,0.06) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(96,165,250,0.06) 1px, transparent 1px)",
            "linear-gradient(rgba(96,165,250,0.025) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(96,165,250,0.025) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "80px 80px, 80px 80px, 20px 20px, 20px 20px",
        }} />
        <div className="absolute rounded-full pointer-events-none" style={{
          width: 340, height: 340,
          background: "radial-gradient(circle, rgba(0,200,117,0.07) 0%, transparent 70%)",
        }} />
        <div style={{ animation: "float 7s ease-in-out infinite" }}>
          <PhoneFrame phase={phase} trades={trades} locations={locations} slideOverride={phoneSlide} />
        </div>
      </div>
    </div>
  );
}
