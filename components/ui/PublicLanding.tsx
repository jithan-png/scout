"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowUp } from "lucide-react";
import { useAppStore } from "@/lib/store";
import DesktopLanding from "@/components/ui/DesktopLanding";
import SignInSheet from "@/components/ui/SignInSheet";

function BLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.9" />
      <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.65" />
    </svg>
  );
}

const FROM_LABELS: Record<string, { title: string; description: string }> = {
  "/scout": {
    title: "Sign in to talk to Scout",
    description: "Scout chat remembers your market, tracks your pipeline, and briefs you daily on new permits and tenders.",
  },
  "/activity": {
    title: "Sign in to see your alerts",
    description: "Activity shows you when new permits match your profile, when deals need follow-up, and when warm paths open up.",
  },
  "/profile": {
    title: "Sign in to manage your profile",
    description: "Set your trades, location, and project types so Scout knows exactly what to find for you.",
  },
};

export default function PublicLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleWhatISell, toggleWhereIOperate, toggleProjectType } = useAppStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetFrom, setSheetFrom] = useState("/scout");

  useEffect(() => {
    const from = searchParams.get("from");
    if (from) {
      setSheetFrom(from);
      setSheetOpen(true);
      // Clean the URL without triggering a navigation
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  const hasText = input.trim().length > 0;

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat/parse-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        (data.trades ?? []).forEach((t: string) => toggleWhatISell(t));
        (data.cities ?? []).forEach((c: string) => toggleWhereIOperate(c));
        (data.projectTypes ?? []).forEach((t: string) => toggleProjectType(t));
      }
    } catch (_) {}
    setLoading(false);
    router.push("/setup?prefilled=true");
  };

  return (
    <div className="flex flex-col min-h-dvh bg-base relative">
      {/* Desktop layout — hidden on mobile */}
      <DesktopLanding />

      {/* Ambient glows */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "45%",
          background: "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(0,200,117,0.1) 0%, transparent 68%)",
          animation: "glowBreathe 5s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "30%",
          background: "radial-gradient(ellipse 35% 25% at 78% 0%, rgba(251,191,36,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Blueprint grid */}
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
      <div className="absolute top-0 right-0 pointer-events-none overflow-hidden" style={{ width: 180, height: 280, opacity: 0.12 }}>
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

      {/* Logo */}
      <header className="relative z-10 px-6 pt-5 flex items-center justify-between flex-shrink-0 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 16px rgba(0,200,117,0.35)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.9" />
              <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.65" />
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
            BuildMapper
          </span>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/scout" })}
          className="text-[13px] transition-colors duration-150"
          style={{ color: "#52525B" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#F4F4F5")}
          onMouseLeave={e => (e.currentTarget.style.color = "#52525B")}
        >
          Sign in →
        </button>
      </header>

      {/* Mobile content — hidden on desktop */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-10 animate-fade-up lg:hidden">
        {/* Hero */}
        <h1
          className="font-bold leading-[1.1] mb-3"
          style={{ fontSize: "clamp(34px, 8vw, 42px)", letterSpacing: "-0.035em", color: "#F4F4F5" }}
        >
          Scout is watching
          <br />
          <span style={{ color: "#00C875" }}>your market.</span>
        </h1>
        <p className="text-[15px] leading-relaxed mb-3" style={{ color: "#71717A" }}>
          It scans permits, tenders, LinkedIn, and the web — then maps your fastest path to winning each opportunity.
        </p>
        <p className="text-[12px] mb-8" style={{ color: "#3F3F46" }}>
          40+ permit portals across BC, Alberta, and US cities · updated daily
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {["Permits", "Tenders", "LinkedIn", "Web", "Contacts"].map((f) => (
            <span
              key={f}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#71717A" }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Scout greeting */}
        <div
          className="flex items-center gap-3 mb-5 p-4 rounded-2xl"
          style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 20px rgba(0,200,117,0.3)" }}
          >
            <BLogo size={16} />
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: "#F4F4F5" }}>Hey, I&apos;m Scout</p>
            <p className="text-[12px]" style={{ color: "#52525B" }}>
              Tell me what you do and where — I&apos;ll find your opportunities.
            </p>
          </div>
        </div>

        {/* Chat input */}
        <div
          className="relative rounded-2xl mb-4 transition-all duration-200"
          style={{
            background: "#1C1C22",
            border: `1px solid ${hasText ? "rgba(0,200,117,0.3)" : "rgba(255,255,255,0.09)"}`,
            boxShadow: hasText ? "0 0 20px rgba(0,200,117,0.07)" : "none",
          }}
        >
          <textarea
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(e.target); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="e.g. I do HVAC in Kelowna — mostly commercial and multi-family projects"
            className="w-full px-4 pt-3.5 pb-3.5 pr-14 text-[15px] bg-transparent resize-none outline-none leading-relaxed"
            style={{ color: "#F4F4F5", caretColor: "#00C875", minHeight: 52 }}
          />
          <button
            onClick={handleSend}
            disabled={!hasText || loading}
            className="pressable absolute right-2.5 bottom-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={
              hasText && !loading
                ? { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 14px rgba(0,200,117,0.35)" }
                : { background: "rgba(255,255,255,0.06)" }
            }
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }} />
            ) : (
              <ArrowUp size={15} strokeWidth={2.5} style={{ color: hasText ? "#fff" : "#52525B" }} />
            )}
          </button>
        </div>

        <p className="text-center text-[11px] mb-8" style={{ color: "#3F3F46" }}>
          No account needed to see your first results.
        </p>

        {/* Test mode — dev only */}
        {process.env.NODE_ENV !== "production" && (
          <button
            onClick={() => signIn("credentials", { callbackUrl: "/scout" })}
            className="text-center text-[11px] py-2 rounded-xl"
            style={{ color: "#3F3F46", border: "1px dashed rgba(255,255,255,0.08)" }}
          >
            Skip login (test mode)
          </button>
        )}
      </div>

      {/* Sign-in sheet — shown when redirected from a protected page */}
      <SignInSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={FROM_LABELS[sheetFrom]?.title ?? "Sign in to continue"}
        description={FROM_LABELS[sheetFrom]?.description ?? "Create your account to access the full Scout experience."}
        callbackUrl={sheetFrom}
      />
    </div>
  );
}
