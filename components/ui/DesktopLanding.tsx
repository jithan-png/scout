"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp, Check, Copy, MessageCircle, Smartphone } from "lucide-react";

const APP_URL = "buildmapper.app";

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
  { text: "Done — your leads are ready", color: "#00C875" },
];

const CHAT_SUGGESTIONS = [
  "I do HVAC and mechanical work in Kelowna",
  "Electrical contractor, mostly the Okanagan",
  "We do framing and structure in Vancouver",
  "Plumbing across BC Interior",
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
    <div className="flex flex-col h-full" style={{ background: "#09090B", padding: "36px 14px 14px" }}>
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{ height: "40%", background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,200,117,0.08) 0%, transparent 70%)" }}
      />
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-1 relative" style={{ color: "#52525B" }}>
        Step 1 of 2
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
    </div>
  );
}

function PhoneWorking() {
  return (
    <div className="flex flex-col h-full items-center justify-center gap-4 relative" style={{ background: "#09090B" }}>
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
    <div className="flex flex-col h-full relative" style={{ background: "#09090B", padding: "22px 14px 14px" }}>
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
            <p className="text-[11px] font-semibold" style={{ color: "#F4F4F5" }}>leads found</p>
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
          <Smartphone size={14} color="white" strokeWidth={2.5} />
        </div>
        <p className="text-[9px] font-semibold text-center" style={{ color: "#F4F4F5" }}>Open on mobile</p>
        <p className="text-[8px] text-center mt-0.5" style={{ color: "#52525B" }}>to see your leads</p>
      </div>
    </div>
  );
}

// ── Phone frame ───────────────────────────────────────────────────────────────

function PhoneFrame({ phase, trades, locations }: {
  phase: Phase;
  trades: string[];
  locations: string[];
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
        <div style={{ position: "absolute", inset: 0 }}>
          {phase === "chat"     && <PhoneSetup1 selected={trades} />}
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
  const [phase, setPhase] = useState<Phase>("chat");
  const [trades, setTrades] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [scanMessages, setScanMessages] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const [smsPhone, setSmsPhone] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Loading sequence
  useEffect(() => {
    if (phase !== "loading") return;
    setScanMessages([]);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    SCAN_MESSAGES.forEach((_, i) => {
      timeouts.push(setTimeout(() => setScanMessages((prev) => [...prev, i]), i * 900 + 400));
    });
    // Advance to payoff after all messages
    timeouts.push(setTimeout(() => setPhase("payoff"), SCAN_MESSAGES.length * 900 + 1200));
    return () => timeouts.forEach(clearTimeout);
  }, [phase]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(APP_URL); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSMS = async () => {
    if (!smsPhone.trim() || smsSending) return;
    setSmsSending(true);
    try {
      await fetch("/api/notify/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: smsPhone.trim() }),
      });
    } catch (_) {}
    setSmsSent(true);
    setSmsSending(false);
  };

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
        if (data.trades?.length) setTrades(data.trades);
        if (data.cities?.length) setLocations(data.cities);
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
                <p className="text-[13px]" style={{ color: "#52525B" }}>Tell me what you do and where you work — I&apos;ll set things up.</p>
              </div>
            </div>

            {/* Suggestion pills */}
            <div className="flex flex-col gap-2 mb-5">
              {CHAT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleChatSubmit(s)}
                  disabled={chatLoading}
                  className="pressable text-left px-4 py-3 rounded-2xl text-[13px] transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#71717A",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Textarea + send */}
            <div
              className="relative rounded-2xl transition-all duration-200"
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
                placeholder="e.g. I do HVAC in Kelowna and the Okanagan"
                className="w-full px-4 pt-4 pb-4 pr-14 text-[15px] bg-transparent resize-none outline-none leading-relaxed"
                style={{ color: "#F4F4F5", caretColor: "#00C875", minHeight: 56 }}
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
            <p className="text-[11px] text-center mt-3" style={{ color: "#3F3F46" }}>
              You can edit everything on the next screen
            </p>
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
                <p className="text-[22px] font-bold" style={{ color: "#F4F4F5" }}>leads found</p>
                <p className="text-[14px]" style={{ color: "#52525B" }}>
                  {hotCount} hot · {leadCount - hotCount} more in {locations[0] || "your area"}
                </p>
              </div>
            </div>
            <p className="text-[15px] mb-8" style={{ color: "#71717A" }}>
              Your results are ready — open Scout on your phone to see them.
            </p>

            {/* Mobile handoff card */}
            <div className="rounded-2xl p-6 mb-4" style={{
              background: "#1C1C22",
              border: "1px solid rgba(0,200,117,0.15)",
              boxShadow: "0 0 40px rgba(0,200,117,0.06)",
            }}>
              {/* URL row */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl" style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Smartphone size={14} style={{ color: "#52525B", flexShrink: 0 }} />
                  <span className="text-[14px] font-mono" style={{ color: "#71717A" }}>{APP_URL}</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200"
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

              {/* SMS CTA */}
              {smsSent ? (
                <div
                  className="w-full py-4 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2"
                  style={{ background: "rgba(0,200,117,0.1)", color: "#34D399", border: "1px solid rgba(0,200,117,0.2)" }}
                >
                  <Check size={16} />
                  Link sent to your phone
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={smsPhone}
                    onChange={(e) => setSmsPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSMS()}
                    placeholder="Your phone number"
                    className="flex-1 px-4 py-3 rounded-xl text-[14px]"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      color: "#F4F4F5",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSMS}
                    disabled={!smsPhone.trim() || smsSending}
                    className="pressable flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold transition-all duration-200 flex-shrink-0"
                    style={
                      smsPhone.trim()
                        ? { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", boxShadow: "0 0 20px rgba(0,200,117,0.25)" }
                        : { background: "rgba(255,255,255,0.05)", color: "#52525B" }
                    }
                  >
                    <MessageCircle size={15} />
                    {smsSending ? "Sending…" : "Text me"}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => { setPhase("chat"); setTrades([]); setLocations([]); }}
              className="text-[13px] transition-colors duration-150"
              style={{ color: "#52525B" }}
            >
              ← Start over
            </button>
          </div>
        )}
      </div>

      {/* ── Right column — phone ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative">
        <div className="absolute inset-0 pointer-events-none" style={{
          opacity: 0.025,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="absolute rounded-full pointer-events-none" style={{
          width: 340, height: 340,
          background: "radial-gradient(circle, rgba(0,200,117,0.07) 0%, transparent 70%)",
        }} />
        <div style={{ animation: "float 7s ease-in-out infinite" }}>
          <PhoneFrame phase={phase} trades={trades} locations={locations} />
        </div>
      </div>
    </div>
  );
}
