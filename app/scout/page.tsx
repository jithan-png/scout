"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, RotateCcw, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/ui/BottomNav";
import type { ChatMessage, ChatBlock } from "@/lib/store";
import { Copy, Check, ArrowRight } from "lucide-react";

// ── Personalized power queries ────────────────────────────────────────────────

function getSuggestions(trades: string[], cities: string[], projectTypes: string[]): string[] {
  const city = cities[0] || "your area";
  const trade = trades[0] || "your trade";
  return [
    `Find ${projectTypes[0] || "commercial"} projects near ${city}`,
    `New permits in ${city} this week`,
    "Who should I follow up with?",
    "Draft intro for my best lead",
    `Who do I know at ${city} projects?`,
    `Active tenders for ${trade}`,
  ];
}

// ── Block parser ─────────────────────────────────────────────────────────────

const BLOCK_MARKER = "__BLOCK__";

function parseBlocks(raw: string): { content: string; blocks: ChatBlock[] } {
  const idx = raw.indexOf(BLOCK_MARKER);
  if (idx === -1) return { content: raw, blocks: [] };
  const content = raw.slice(0, idx).trim();
  try {
    const block = JSON.parse(raw.slice(idx + BLOCK_MARKER.length).trim()) as ChatBlock;
    return { content, blocks: [block] };
  } catch {
    return { content, blocks: [] };
  }
}

// ── Block renderers ───────────────────────────────────────────────────────────

function EmailDraftBlock({ subject, body }: { subject: string; body: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div
      className="rounded-2xl p-4 mt-2 animate-fade-up"
      style={{ background: "#141418", border: "1px solid rgba(0,200,117,0.18)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>
        Draft
      </p>
      <p className="text-[12px] font-semibold mb-2" style={{ color: "#A1A1AA" }}>
        Subject: {subject}
      </p>
      <p className="text-[13px] leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: "#E4E4E7" }}>
        {body}
      </p>
      <button
        onClick={copy}
        className="pressable flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
        style={{ background: "rgba(0,200,117,0.10)", border: "1px solid rgba(0,200,117,0.2)", color: "#34D399" }}
      >
        {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
        {copied ? "Copied!" : "Copy to clipboard"}
      </button>
    </div>
  );
}

function AccountBriefBlock({ companyName, overview, recentActivity, yourAngle }: { companyName: string; overview: string; recentActivity: string; yourAngle: string }) {
  return (
    <div
      className="rounded-2xl p-4 mt-2 animate-fade-up"
      style={{ background: "#141418", border: "1px solid rgba(0,200,117,0.18)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#3F3F46" }}>
        Account Brief
      </p>
      <p className="text-[14px] font-bold mb-3" style={{ color: "#F4F4F5" }}>{companyName}</p>
      <div className="flex flex-col gap-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525B" }}>Overview</p>
          <p className="text-[13px] leading-relaxed" style={{ color: "#A1A1AA" }}>{overview}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#52525B" }}>Recent Activity</p>
          <p className="text-[13px] leading-relaxed" style={{ color: "#A1A1AA" }}>{recentActivity}</p>
        </div>
        <div
          className="px-3 py-2.5 rounded-xl"
          style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.14)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#34D399" }}>Your Angle</p>
          <p className="text-[13px] leading-relaxed" style={{ color: "#6EE7B7" }}>{yourAngle}</p>
        </div>
      </div>
    </div>
  );
}

function OpportunityPreviewBlock({ opportunityId }: { opportunityId: string }) {
  const { opportunities } = useAppStore();
  const router = useRouter();
  const opp = opportunities.find((o) => o.id === opportunityId);
  if (!opp) return null;
  const priorityColor = opp.priority === "hot" ? "#EF4444" : opp.priority === "warm" ? "#F59E0B" : "#71717A";
  return (
    <button
      onClick={() => router.push(`/opportunities/${opp.id}`)}
      className="pressable w-full text-left mt-2 animate-fade-up"
    >
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: priorityColor }}>
              {opp.priority}
            </span>
            <span className="text-[11px]" style={{ color: "#3F3F46" }}>·</span>
            <span className="text-[11px]" style={{ color: "#52525B" }}>{opp.score} score</span>
          </div>
          <p className="text-[14px] font-semibold truncate" style={{ color: "#F4F4F5" }}>{opp.project.name}</p>
          <p className="text-[12px] truncate" style={{ color: "#52525B" }}>{opp.company.name}</p>
        </div>
        <ArrowRight size={14} style={{ color: "#3F3F46", flexShrink: 0 }} />
      </div>
    </button>
  );
}

function BlockRenderer({ blocks }: { blocks: ChatBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "email_draft") return <EmailDraftBlock key={i} subject={block.subject} body={block.body} />;
        if (block.type === "account_brief") return <AccountBriefBlock key={i} companyName={block.companyName} overview={block.overview} recentActivity={block.recentActivity} yourAngle={block.yourAngle} />;
        if (block.type === "opportunity_preview") return <OpportunityPreviewBlock key={i} opportunityId={block.opportunityId} />;
        if (block.type === "lead_list") return (
          <div key={i} className="flex flex-col gap-2 mt-2">
            {block.opportunityIds.map((id) => <OpportunityPreviewBlock key={id} opportunityId={id} />)}
          </div>
        );
        return null;
      })}
    </>
  );
}

// ── Scout logo ────────────────────────────────────────────────────────────────

function BLogo({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.95" />
      <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.7" />
    </svg>
  );
}

// ── Inner page (needs Suspense for useSearchParams) ───────────────────────────

function ScoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    setup,
    chatMessages,
    addChatMessage,
    clearChat,
    startAgent,
    toggleWhatISell,
    toggleWhereIOperate,
    toggleProjectType,
    lastBriefingDate,
    setLastBriefingDate,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasText = input.trim().length > 0;
  const suggestions = getSuggestions(setup.whatISell, setup.whereIOperate, setup.projectTypes);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingContent]);

  // Daily briefing: auto-stream on first open of each day
  useEffect(() => {
    const today = new Date().toDateString();
    if (setup.completed && chatMessages.length === 0 && lastBriefingDate !== today) {
      triggerDailyBriefing(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerDailyBriefing = async (today: string) => {
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Give me my daily briefing. Scan for new permits and tenders in my market, flag any pipeline deals I haven't touched in over a week, and tell me the 3 most important things I should do today.",
          history: [],
          userProfile: {
            trades: setup.whatISell,
            cities: setup.whereIOperate,
            projectTypes: setup.projectTypes,
          },
          isDailyBriefing: true,
        }),
      });

      if (!res.ok || !res.body) {
        setStreamingContent(null);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingContent(accumulated.trim());
      }

      const { content: cleanText, blocks } = parseBlocks(accumulated.trim());
      setStreamingContent(null);
      addChatMessage({ role: "assistant", content: cleanText, blocks: blocks.length ? blocks : undefined });
      setLastBriefingDate(today);
    } catch {
      setStreamingContent(null);
    } finally {
      setIsStreaming(false);
    }
  };

  // Handle ?q= pre-fill from home page "Ask Scout" strip
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && setup.completed) {
      const decoded = decodeURIComponent(q);
      handleSend(decoded);
      window.history.replaceState(null, "", "/scout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || onboarding) return;

    // No profile yet → parse message and route to setup
    if (!setup.completed) {
      setOnboarding(true);
      setInput("");
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
      setOnboarding(false);
      router.push("/setup?prefilled=true");
      return;
    }

    // Add user message
    addChatMessage({ role: "user", content: trimmed });
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: chatMessages.slice(-10),
          userProfile: {
            trades: setup.whatISell,
            cities: setup.whereIOperate,
            projectTypes: setup.projectTypes,
          },
        }),
      });

      if (!res.ok || !res.body) {
        setStreamingContent(null);
        addChatMessage({ role: "assistant", content: "Scout ran into an issue. Try again." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        // Stream to UI — strip action/block markers so they don't flash
        const displayText = accumulated.replace(/__ACTION:run_scout__/g, "");
        const blockIdx = displayText.indexOf(BLOCK_MARKER);
        setStreamingContent((blockIdx !== -1 ? displayText.slice(0, blockIdx) : displayText).trim());
      }

      // Commit final message — strip action marker first, then parse blocks
      const stripped = accumulated.replace(/__ACTION:run_scout__/g, "").trim();
      const { content: cleanText, blocks } = parseBlocks(stripped);
      setStreamingContent(null);
      addChatMessage({ role: "assistant", content: cleanText, blocks: blocks.length ? blocks : undefined });

      // Execute action if signalled
      if (accumulated.includes("__ACTION:run_scout__")) {
        setTimeout(() => {
          startAgent();
          router.push("/working");
        }, 600);
      }
    } catch {
      setStreamingContent(null);
      addChatMessage({ role: "assistant", content: "Scout is offline right now." });
    } finally {
      setIsStreaming(false);
    }
  };

  // Combined messages: persisted + current in-progress stream
  const displayMessages: (ChatMessage & { streaming?: boolean })[] = [
    ...chatMessages,
    ...(streamingContent !== null
      ? [{ role: "assistant" as const, content: streamingContent, streaming: true }]
      : []),
  ];

  return (
    <div className="flex flex-col min-h-dvh bg-base">
      <div className="safe-top" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
              boxShadow: "0 0 18px rgba(0,200,117,0.35)",
            }}
          >
            <BLogo size={16} />
          </div>
          <div>
            <p
              className="text-[16px] font-bold leading-tight"
              style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}
            >
              Scout
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#00C875", animation: "glowBreathe 3s ease-in-out infinite" }}
              />
              <p className="text-[11px]" style={{ color: "#52525B" }}>
                Watching your market · Knows your network
              </p>
            </div>
          </div>
        </div>

        {chatMessages.length > 0 && !isStreaming && (
          <button
            onClick={clearChat}
            className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <RotateCcw size={11} strokeWidth={2} style={{ color: "#52525B" }} />
            <span className="text-[11px] font-medium" style={{ color: "#52525B" }}>
              Clear
            </span>
          </button>
        )}
      </header>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">

        {/* Empty state */}
        {displayMessages.length === 0 && (
          <div className="flex flex-col items-center px-2 py-6 animate-fade-up">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                boxShadow: "0 0 32px rgba(0,200,117,0.3)",
              }}
            >
              <BLogo size={28} />
            </div>

            {!setup.completed ? (
              <>
                <p className="text-[18px] font-bold mb-2 text-center" style={{ color: "#F4F4F5" }}>
                  Hey, I&apos;m Scout
                </p>
                <p
                  className="text-[14px] text-center leading-relaxed mb-7"
                  style={{ color: "#52525B", maxWidth: 280 }}
                >
                  Tell me what you sell and where you work — I&apos;ll scan permits, tenders, and your network for the right openings.
                </p>
              </>
            ) : (
              <>
                <p className="text-[18px] font-bold mb-2 text-center" style={{ color: "#F4F4F5" }}>
                  What do you need?
                </p>
                <p className="text-[13px] text-center mb-7" style={{ color: "#52525B" }}>
                  Ask me about new leads, warm paths to companies, or who you know at a project. I can draft outreach too.
                </p>
              </>
            )}

            {/* Power query suggestions */}
            <div className="flex flex-col gap-2 w-full">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={isStreaming || onboarding}
                  className="pressable flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-150 animate-fade-up"
                  style={{
                    animationDelay: `${i * 50}ms`,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Zap size={12} style={{ color: "#00C875", flexShrink: 0 }} />
                  <span className="text-[13px]" style={{ color: "#A1A1AA" }}>{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        {displayMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                style={{
                  background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                  boxShadow: "0 0 10px rgba(0,200,117,0.25)",
                }}
              >
                <BLogo size={12} />
              </div>
            )}
            <div
              className="max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed"
              style={
                msg.role === "user"
                  ? {
                      background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                      color: "#fff",
                      borderBottomRightRadius: 6,
                    }
                  : {
                      background: "#1C1C22",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "#E4E4E7",
                      borderBottomLeftRadius: 6,
                      whiteSpace: "pre-wrap",
                    }
              }
            >
              {msg.content}
              {msg.streaming && (
                <span
                  className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse"
                  style={{ background: "#00C875", borderRadius: 1 }}
                />
              )}
            </div>
            {/* Render structured blocks below assistant message */}
            {msg.role === "assistant" && msg.blocks && msg.blocks.length > 0 && (
              <div className="ml-9 max-w-[85%]">
                <BlockRenderer blocks={msg.blocks} />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator — before first token arrives */}
        {isStreaming && streamingContent === "" && (
          <div className="flex justify-start">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
              style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)" }}
            >
              <BLogo size={12} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: "#1C1C22",
                border: "1px solid rgba(255,255,255,0.07)",
                borderBottomLeftRadius: 6,
              }}
            >
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map((j) => (
                  <div
                    key={j}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#52525B",
                      animation: `typing 1.4s ease ${j * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* ── Input ────────────────────────────────────────────────────── */}
      <div
        className="px-4 flex-shrink-0"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingTop: 12,
          background: "#09090B",
        }}
      >
        <div
          className="relative rounded-2xl transition-all duration-200"
          style={{
            background: "#1C1C22",
            border: `1px solid ${hasText ? "rgba(0,200,117,0.3)" : "rgba(255,255,255,0.09)"}`,
            boxShadow: hasText ? "0 0 20px rgba(0,200,117,0.07)" : "none",
          }}
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder={
              setup.completed
                ? "Ask Scout anything…"
                : "Tell me what you do and where you work…"
            }
            className="w-full px-4 pt-3.5 pb-3.5 pr-14 text-[15px] bg-transparent resize-none outline-none leading-relaxed"
            style={{ color: "#F4F4F5", caretColor: "#00C875", minHeight: 52 }}
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!hasText || isStreaming || onboarding}
            className="pressable absolute right-2.5 bottom-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={
              hasText && !isStreaming && !onboarding
                ? {
                    background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                    boxShadow: "0 0 14px rgba(0,200,117,0.35)",
                  }
                : { background: "rgba(255,255,255,0.06)" }
            }
          >
            {isStreaming || onboarding ? (
              <div
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }}
              />
            ) : (
              <ArrowUp
                size={15}
                strokeWidth={2.5}
                style={{ color: hasText ? "#fff" : "#52525B" }}
              />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: "#3F3F46" }}>
          Scout scans permits, tenders, and your network in real time
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

export default function ScoutPage() {
  return (
    <Suspense fallback={null}>
      <ScoutPageInner />
    </Suspense>
  );
}
