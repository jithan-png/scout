"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useAppStore } from "@/lib/store";

const SUGGESTIONS = [
  "I do HVAC and mechanical work in Kelowna",
  "Electrical contractor, mostly the Okanagan",
  "We do framing and structure in Vancouver",
  "Plumbing across BC Interior",
];

export default function OnboardingPage() {
  const router = useRouter();
  const { toggleWhatISell, toggleWhereIOperate, setup } = useAppStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Animate greeting in
  useEffect(() => {
    const t = setTimeout(() => setShowGreeting(true), 200);
    return () => clearTimeout(t);
  }, []);

  // Clear any previous setup selections so pre-fill starts fresh
  useEffect(() => {
    setup.whatISell.forEach((t) => toggleWhatISell(t));
    setup.whereIOperate.forEach((c) => toggleWhereIOperate(c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/chat/parse-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        (data.trades ?? []).forEach((t: string) => toggleWhatISell(t));
        (data.cities ?? []).forEach((c: string) => toggleWhereIOperate(c));
      }
    } catch (_) {
      // fallback — go to setup empty
    }

    setLoading(false);
    router.push("/setup?prefilled=true");
  };

  const hasText = input.trim().length > 0;

  return (
    <div className="flex flex-col min-h-dvh bg-base relative">
      {/* Ambient glow */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "50%",
          background:
            "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(0,200,117,0.10) 0%, transparent 68%)",
        }}
      />

      <div className="safe-top" />

      {/* Scout avatar + greeting */}
      <div className="relative z-10 px-6 pt-10 flex flex-col items-center text-center">
        {/* Logo mark */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
            boxShadow: "0 0 32px rgba(0,200,117,0.35)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 14 14" fill="none">
            <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.95" />
            <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.7" />
          </svg>
        </div>

        <div
          className="transition-all duration-500"
          style={{
            opacity: showGreeting ? 1 : 0,
            transform: showGreeting ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <h1
            className="text-[26px] font-bold leading-tight mb-2"
            style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
          >
            Hey, I&apos;m Scout
          </h1>
          <p
            className="text-[15px] leading-relaxed max-w-[300px]"
            style={{ color: "#71717A" }}
          >
            Tell me what you do and where you work — I&apos;ll set things up for you.
          </p>
        </div>
      </div>

      {/* Input area */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-10">

        {/* Suggestion pills */}
        {!hasText && (
          <div className="flex flex-col gap-2 mb-5">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s}
                onClick={() => handleSubmit(s)}
                className="pressable text-left px-4 py-3 rounded-2xl text-[13px] animate-fade-up"
                style={{
                  animationDelay: `${300 + i * 60}ms`,
                  animationFillMode: "both",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "#71717A",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Textarea + send */}
        <div
          className="relative rounded-2xl transition-all duration-200"
          style={{
            background: "#1C1C22",
            border: `1px solid ${hasText ? "rgba(0,200,117,0.3)" : "rgba(255,255,255,0.09)"}`,
            boxShadow: hasText ? "0 0 20px rgba(0,200,117,0.08)" : "none",
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(input);
              }
            }}
            placeholder="e.g. I do HVAC in Kelowna and the Okanagan"
            className="w-full px-4 pt-4 pb-4 pr-14 text-[15px] bg-transparent resize-none outline-none leading-relaxed"
            style={{
              color: "#F4F4F5",
              caretColor: "#00C875",
              minHeight: 56,
            }}
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={!hasText || loading}
            className="pressable absolute right-3 bottom-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={
              hasText && !loading
                ? {
                    background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                    boxShadow: "0 0 16px rgba(0,200,117,0.35)",
                  }
                : {
                    background: "rgba(255,255,255,0.06)",
                  }
            }
          >
            {loading ? (
              <div
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }}
              />
            ) : (
              <ArrowUp size={16} strokeWidth={2.5} style={{ color: hasText ? "#fff" : "#52525B" }} />
            )}
          </button>
        </div>

        <p className="text-[11px] text-center mt-3" style={{ color: "#3F3F46" }}>
          You can edit everything on the next screen
        </p>
      </div>
    </div>
  );
}
