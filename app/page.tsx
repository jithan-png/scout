"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutList, Bell, Sparkles, ArrowUp } from "lucide-react";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/ui/BottomNav";
import DesktopLanding from "@/components/ui/DesktopLanding";

// ── New user landing ──────────────────────────────────────────────────────────

function NewUserHome() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 px-6 pt-10 animate-fade-up">
      {/* Hero */}
      <h1
        className="font-bold leading-[1.1] mb-3"
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
        className="text-[15px] leading-relaxed mb-8"
        style={{ color: "#71717A" }}
      >
        It scans permits, tenders, LinkedIn, and the web — then maps your fastest path to winning each opportunity.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 mb-10">
        {["Permits", "Tenders", "LinkedIn", "Web", "Contacts"].map((f) => (
          <span
            key={f}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#71717A",
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => router.push("/setup")}
        className="pressable w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[16px] font-semibold mb-4"
        style={{
          background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
          color: "#fff",
          boxShadow: "0 0 28px rgba(0,200,117,0.28)",
        }}
      >
        Get started
        <ArrowRight size={17} strokeWidth={2.5} />
      </button>

      {/* Secondary CTA */}
      <button
        onClick={() => router.push("/scout")}
        className="pressable text-center text-[14px] font-medium py-2"
        style={{ color: "#52525B" }}
      >
        or ask Scout anything →
      </button>
    </div>
  );
}

// ── Returning user dashboard ──────────────────────────────────────────────────

function ReturnUserDashboard() {
  const router = useRouter();
  const { opportunities, alerts, unreadCount, startAgent } = useAppStore();
  const [askInput, setAskInput] = useState("");

  const hotCount = opportunities.filter((o) => o.priority === "hot").length;
  const warmCount = opportunities.filter((o) => o.priority === "warm").length;
  const recentAlert = alerts.find((a) => !a.read) ?? alerts[0];

  const handleAsk = (text?: string) => {
    const q = (text ?? askInput).trim();
    if (!q) {
      router.push("/scout");
      return;
    }
    router.push(`/scout?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex flex-col flex-1 px-5 pt-8 gap-5 animate-fade-up">

      {/* Hot lead hero widget */}
      <button
        onClick={() => router.push("/opportunities")}
        className="pressable rounded-2xl px-5 py-5 text-left"
        style={{
          background: "#1C1C22",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 1px 1px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <p className="text-[12px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>
          On site this week
        </p>
        <div className="flex items-end gap-3">
          <span
            className="font-bold leading-none"
            style={{
              fontSize: 52,
              letterSpacing: "-0.04em",
              background: "linear-gradient(135deg, #F4F4F5 60%, #A1A1AA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {hotCount}
          </span>
          <div className="mb-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <svg width="18" height="14" viewBox="0 0 22 17" fill="none">
                <path d="M1 14 C1 7 4.5 2 11 2 C17.5 2 21 7 21 14 Z" fill="#F59E0B" fillOpacity="0.9"/>
                <rect x="0" y="13" width="22" height="3" rx="1.5" fill="#F59E0B"/>
                <line x1="1" y1="11" x2="21" y2="11" stroke="#D97706" strokeWidth="1" strokeOpacity="0.6"/>
              </svg>
              <p className="text-[17px] font-semibold leading-tight" style={{ color: "#F4F4F5" }}>
                hot opps
              </p>
            </div>
            <p className="text-[13px]" style={{ color: "#52525B" }}>
              {opportunities.length} total · {warmCount} warm
            </p>
          </div>
        </div>
      </button>

      {/* Quick tiles — 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Opportunities",
            sub: `${opportunities.length} found`,
            icon: LayoutList,
            href: "/opportunities",
            accent: "#00C875",
          },
          {
            label: "Activity",
            sub: unreadCount > 0 ? `${unreadCount} new` : "All clear",
            icon: Bell,
            href: "/activity",
            accent: unreadCount > 0 ? "#EF4444" : "#52525B",
          },
          {
            label: "Scout",
            sub: "Ask anything",
            icon: Sparkles,
            href: "/scout",
            accent: "#00C875",
          },
          {
            label: "Run scan",
            sub: "Find opportunities",
            icon: ArrowRight,
            href: "/working",
            accent: "#F59E0B",
            action: true,
          },
        ].map(({ label, sub, icon: Icon, href, accent, action }) => (
          <button
            key={label}
            onClick={() => {
              if (action) startAgent();
              router.push(href);
            }}
            className="pressable flex flex-col items-start px-4 py-4 rounded-2xl"
            style={{
              background: "#1C1C22",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 1px 1px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${accent}15` }}
            >
              <Icon size={16} style={{ color: accent }} strokeWidth={2} />
            </div>
            <p className="text-[14px] font-semibold leading-tight" style={{ color: "#F4F4F5" }}>
              {label}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "#52525B" }}>
              {sub}
            </p>
          </button>
        ))}
      </div>

      {/* Ask Scout strip */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>
          Ask Scout
        </p>
        <div
          className="relative rounded-2xl"
          style={{
            background: "#1C1C22",
            border: `1px solid ${askInput.trim() ? "rgba(0,200,117,0.3)" : "rgba(255,255,255,0.09)"}`,
          }}
        >
          <input
            type="text"
            value={askInput}
            onChange={(e) => setAskInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAsk();
            }}
            placeholder="Who should I call this week?"
            className="w-full px-4 py-3.5 pr-12 text-[14px] bg-transparent outline-none"
            style={{ color: "#F4F4F5", caretColor: "#00C875" }}
          />
          <button
            onClick={() => handleAsk()}
            className="pressable absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={
              askInput.trim()
                ? { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)" }
                : { background: "rgba(255,255,255,0.06)" }
            }
          >
            <ArrowUp size={13} strokeWidth={2.5} style={{ color: askInput.trim() ? "#fff" : "#52525B" }} />
          </button>
        </div>
      </div>

      {/* Recent alert */}
      {recentAlert && (
        <button
          onClick={() => router.push("/activity")}
          className="pressable flex items-start gap-3 px-4 py-3.5 rounded-2xl text-left"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: recentAlert.read ? "#3F3F46" : "#EF4444" }}
          />
          <div>
            <p className="text-[13px] font-semibold leading-tight" style={{ color: "#E4E4E7" }}>
              {recentAlert.title}
            </p>
            <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: "#52525B" }}>
              {recentAlert.body}
            </p>
          </div>
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { setup } = useAppStore();

  return (
    <div className="flex flex-col min-h-dvh bg-base relative">
      <DesktopLanding />

      {/* Ambient glows */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "45%",
          background:
            "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(0,200,117,0.1) 0%, transparent 68%)",
          animation: "glowBreathe 5s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "30%",
          background:
            "radial-gradient(ellipse 35% 25% at 78% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Blueprint crosshatch grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "linear-gradient(rgba(96,165,250,0.08) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(96,165,250,0.08) 1px, transparent 1px)",
            "linear-gradient(rgba(96,165,250,0.04) 1px, transparent 1px)",
            "linear-gradient(90deg, rgba(96,165,250,0.04) 1px, transparent 1px)",
          ].join(", "),
          backgroundSize: "80px 80px, 80px 80px, 20px 20px, 20px 20px",
        }}
      />

      {/* Scaffolding silhouette */}
      <div
        className="absolute top-0 right-0 pointer-events-none overflow-hidden"
        style={{ width: 180, height: 280, opacity: 0.12 }}
      >
        <svg width="180" height="280" viewBox="0 0 180 280" fill="none">
          <line x1="24" y1="0" x2="24" y2="280" stroke="white" strokeWidth="2.5"/>
          <line x1="156" y1="0" x2="156" y2="280" stroke="white" strokeWidth="2.5"/>
          <line x1="90" y1="40" x2="90" y2="280" stroke="white" strokeWidth="2"/>
          <line x1="0" y1="40" x2="180" y2="40" stroke="white" strokeWidth="2"/>
          <line x1="0" y1="120" x2="180" y2="120" stroke="white" strokeWidth="2"/>
          <line x1="0" y1="200" x2="180" y2="200" stroke="white" strokeWidth="2"/>
          <line x1="0" y1="270" x2="180" y2="270" stroke="white" strokeWidth="2"/>
          <line x1="24" y1="40" x2="90" y2="120" stroke="white" strokeWidth="1.5"/>
          <line x1="90" y1="40" x2="24" y2="120" stroke="white" strokeWidth="1.5"/>
          <line x1="90" y1="120" x2="156" y2="200" stroke="white" strokeWidth="1.5"/>
          <line x1="156" y1="120" x2="90" y2="200" stroke="white" strokeWidth="1.5"/>
          <line x1="24" y1="200" x2="90" y2="270" stroke="white" strokeWidth="1.5"/>
          <rect x="0" y="116" width="180" height="8" fill="white" fillOpacity="0.55"/>
          <rect x="0" y="196" width="180" height="8" fill="white" fillOpacity="0.55"/>
          <rect x="0" y="112" width="180" height="3" fill="white" fillOpacity="0.8"/>
          <rect x="0" y="192" width="180" height="3" fill="white" fillOpacity="0.8"/>
        </svg>
      </div>

      <div className="safe-top" />

      {/* Logo bar */}
      <header className="relative z-10 px-6 pt-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
              boxShadow: "0 0 16px rgba(0,200,117,0.35)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.9" />
              <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.65" />
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
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C875" }} />
            Live
          </div>
        )}
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <Suspense fallback={null}>
          {setup.completed ? <ReturnUserDashboard /> : <NewUserHome />}
        </Suspense>
      </div>

      <div className="pb-nav" />
      <BottomNav />
    </div>
  );
}
