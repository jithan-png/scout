"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowUp, RotateCcw, Zap, History, Mic, Copy, Check, ArrowRight, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/ui/BottomNav";
import type { ChatMessage, ChatBlock } from "@/lib/store";
import type { ScoutPanelData } from "@/lib/types";
import ScoutPanel from "@/components/chat/ScoutPanel";
import HistoryDrawer from "@/components/chat/HistoryDrawer";

// ── Block parser (handles __BLOCK__ and __PANEL__ markers) ────────────────────

const BLOCK_MARKER = "__BLOCK__";
const PANEL_MARKER = "__PANEL__";

function parseResponse(raw: string): {
  content: string;
  blocks: ChatBlock[];
  panelData: ScoutPanelData | null;
} {
  let text = raw;
  let panelData: ScoutPanelData | null = null;
  let blocks: ChatBlock[] = [];

  // Parse __PANEL__ marker — robust extraction regardless of underscore count
  const panelIdx = text.indexOf("__PANEL__");
  if (panelIdx !== -1) {
    const after = text.slice(panelIdx + 9); // skip "__PANEL__"
    // type is everything up to the next _ or {
    const typeMatch = after.match(/^(\w+)_+/);
    if (typeMatch) {
      const jsonStart = panelIdx + 9 + typeMatch[0].length;
      // JSON runs to the last } in the string (greedy)
      const jsonStr = text.slice(jsonStart).replace(/_*\s*$/, "").trimEnd();
      const lastBrace = jsonStr.lastIndexOf("}");
      const candidate = lastBrace !== -1 ? jsonStr.slice(0, lastBrace + 1) : jsonStr;
      try {
        const type = typeMatch[1] as "permit" | "dashboard";
        const data = JSON.parse(candidate);
        panelData = { type, data };
        text = text.slice(0, panelIdx).trim();
      } catch { /* ignore malformed panel — still strip the marker text */ }
      if (!panelData) text = text.slice(0, panelIdx).trim(); // strip even if parse fails
    }
  }

  // Parse __BLOCK__ marker
  const blockIdx = text.indexOf(BLOCK_MARKER);
  if (blockIdx !== -1) {
    const content = text.slice(0, blockIdx).trim();
    try {
      const block = JSON.parse(text.slice(blockIdx + BLOCK_MARKER.length).trim()) as ChatBlock;
      blocks = [block];
    } catch { /* ignore */ }
    text = content;
  }

  return { content: text.trim(), blocks, panelData };
}

// ── Personalized suggestion chips ─────────────────────────────────────────────

function getBriefingChips(trades: string[], cities: string[]): string[] {
  const city = cities[0] || "my area";
  const city2 = cities[1];
  const trade = trades[0] || "my trade";
  return [
    `Show hot permits in ${city}`,
    city2 ? `New activity in ${city2}` : `Find tenders closing this week`,
    `Draft intro for my best lead`,
    `Who should I follow up with today?`,
    `Find ${trade} opportunities near ${city}`,
  ].slice(0, 4);
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
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>Draft</p>
      <p className="text-[12px] font-semibold mb-2" style={{ color: "#A1A1AA" }}>Subject: {subject}</p>
      <p className="text-[13px] leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: "#E4E4E7" }}>{body}</p>
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

function AccountBriefBlock({ companyName, overview, recentActivity, yourAngle }: {
  companyName: string; overview: string; recentActivity: string; yourAngle: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 mt-2 animate-fade-up"
      style={{ background: "#141418", border: "1px solid rgba(0,200,117,0.18)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#3F3F46" }}>Account Brief</p>
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
    <button onClick={() => router.push(`/opportunities/${opp.id}`)} className="pressable w-full text-left mt-2 animate-fade-up">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: priorityColor }}>{opp.priority}</span>
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

// ── Inner page ────────────────────────────────────────────────────────────────

function ScoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const {
    setup,
    chatMessages,
    addChatMessage,
    clearChat,
    startAgent,
    startNewSession,
    loadSession,
    sessions,
    toggleWhatISell,
    toggleWhereIOperate,
    toggleProjectType,
    lastBriefingDate,
    setLastBriefingDate,
    pendingScoutMessage,
    setPendingScoutMessage,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);
  const [activePanelData, setActivePanelData] = useState<ScoutPanelData | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // Tracks which chips the user has individually dismissed (key = `${msgIdx}-${chipText}`)
  const [dismissedChips, setDismissedChips] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Streaming buffer
  const charQueueRef = useRef<string[]>([]);
  const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasText = input.trim().length > 0;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, streamingContent]);

  // Fire pending Scout messages set from outside (e.g. permit panel research chips)
  useEffect(() => {
    if (pendingScoutMessage && !isStreaming) {
      setActivePanelData(null);
      setPendingScoutMessage(null);
      handleSend(pendingScoutMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingScoutMessage]);

  // Drain function — pulls chars from queue at a steady rate
  const startDrain = useCallback(() => {
    if (drainIntervalRef.current) return;
    drainIntervalRef.current = setInterval(() => {
      const batch = charQueueRef.current.splice(0, 3).join("");
      if (batch) {
        setStreamingContent((prev) => (prev ?? "") + batch);
      } else if (!isStreaming) {
        // queue empty and stream done — stop draining
        clearInterval(drainIntervalRef.current!);
        drainIntervalRef.current = null;
      }
    }, 20);
  }, [isStreaming]);

  const stopDrain = useCallback(() => {
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
    charQueueRef.current = [];
  }, []);

  // Push chars to queue and ensure drain is running
  const enqueueChunk = useCallback((chunk: string) => {
    charQueueRef.current.push(...chunk.split(""));
    startDrain();
  }, [startDrain]);

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
    charQueueRef.current = [];

    try {
      const res = await fetch("/api/chat/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Give me my daily briefing.",
          history: [],
          userProfile: {
            trades: setup.whatISell,
            cities: setup.whereIOperate,
            projectTypes: setup.projectTypes,
          },
          userId: session?.user?.email,
          isDailyBriefing: true,
        }),
      });

      if (!res.ok || !res.body) {
        stopDrain();
        setStreamingContent(null);
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let displayedLen = 0; // local counter — avoids stale state closure bug

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        // Truncate at the first marker — partial JSON won't match a regex so we
        // must cut here to prevent the raw marker text from leaking into the drain.
        let display = accumulated.replace(/__ACTION:run_scout__/g, "");
        const markerIdx = Math.min(
          display.indexOf("__PANEL") === -1 ? Infinity : display.indexOf("__PANEL"),
          display.indexOf("__BLOCK") === -1 ? Infinity : display.indexOf("__BLOCK"),
        );
        if (markerIdx !== Infinity) display = display.slice(0, markerIdx);
        display = display.trimEnd();
        if (display.length > displayedLen) {
          enqueueChunk(display.slice(displayedLen));
          displayedLen = display.length;
        }
      }

      // Wait for drain to finish, then commit
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (charQueueRef.current.length === 0) {
            clearInterval(check);
            resolve();
          }
        }, 30);
      });
      stopDrain();

      const { content: cleanText, blocks, panelData } = parseResponse(accumulated.trim());
      const chips = getBriefingChips(setup.whatISell, setup.whereIOperate);
      setStreamingContent(null);
      addChatMessage({
        role: "assistant",
        content: cleanText,
        blocks: blocks.length ? blocks : undefined,
        chips,
        panelData: panelData ?? undefined,
      });
      setLastBriefingDate(today);
    } catch {
      stopDrain();
      setStreamingContent(null);
    } finally {
      setIsStreaming(false);
    }
  };

  // Handle ?q= pre-fill from home page
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

    addChatMessage({ role: "user", content: trimmed });
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsStreaming(true);
    setStreamingContent("");
    charQueueRef.current = [];

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
          userId: session?.user?.email,
        }),
      });

      if (!res.ok || !res.body) {
        stopDrain();
        setStreamingContent(null);
        addChatMessage({ role: "assistant", content: "Scout ran into an issue. Try again." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let displayedLen = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        // Truncate at first marker — partial JSON can't be regex-stripped mid-stream
        let display = accumulated.replace(/__ACTION:run_scout__/g, "");
        const markerIdx = Math.min(
          display.indexOf("__PANEL") === -1 ? Infinity : display.indexOf("__PANEL"),
          display.indexOf("__BLOCK") === -1 ? Infinity : display.indexOf("__BLOCK"),
        );
        if (markerIdx !== Infinity) display = display.slice(0, markerIdx);
        display = display.trimEnd();
        // Only enqueue new characters
        if (display.length > displayedLen) {
          enqueueChunk(display.slice(displayedLen));
          displayedLen = display.length;
        }
      }

      // Wait for drain queue to flush
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (charQueueRef.current.length === 0) {
            clearInterval(check);
            resolve();
          }
        }, 30);
      });
      stopDrain();

      const stripped = accumulated.replace(/__ACTION:run_scout__/g, "").trim();
      const { content: cleanText, blocks, panelData } = parseResponse(stripped);
      setStreamingContent(null);
      addChatMessage({
        role: "assistant",
        content: cleanText,
        blocks: blocks.length ? blocks : undefined,
        panelData: panelData ?? undefined,
      });

      // Auto-open panel if data arrived
      if (panelData) setActivePanelData(panelData);

      if (accumulated.includes("__ACTION:run_scout__")) {
        setTimeout(() => {
          startAgent();
          router.push("/working");
        }, 600);
      }
    } catch {
      stopDrain();
      setStreamingContent(null);
      addChatMessage({ role: "assistant", content: "Scout is offline right now." });
    } finally {
      setIsStreaming(false);
    }
  };

  // Voice input
  const handleVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (e: { results: { transcript: string }[][] }) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
      if (inputRef.current) autoResize(inputRef.current);
    };
    recognition.start();
  };

  // Export thread
  const handleExport = () => {
    const text = chatMessages
      .map((m) => `**${m.role === "user" ? "You" : "Scout"}:** ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Only show streaming bubble once there is visible (non-whitespace) content
  const hasVisibleStreamingContent = streamingContent !== null && streamingContent.trim().length > 0;

  const displayMessages: (ChatMessage & { streaming?: boolean })[] = [
    ...chatMessages,
    ...(hasVisibleStreamingContent
      ? [{ role: "assistant" as const, content: streamingContent!, streaming: true }]
      : []),
  ];

  const hasVoice = typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  return (
    <div className="flex flex-col min-h-dvh bg-base">
      <div className="safe-top" />

      {/* ── History drawer ───────────────────────────────────────────── */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessions}
        onLoadSession={(id) => {
          loadSession(id);
          setHistoryOpen(false);
        }}
        onNewSession={() => {
          startNewSession();
          setHistoryOpen(false);
        }}
      />

      {/* ── Scout panel (permit / dashboard) ───────────────────────── */}
      <ScoutPanel
        data={activePanelData}
        onClose={() => setActivePanelData(null)}
        onScoutMessage={(msg) => {
          setActivePanelData(null);
          setPendingScoutMessage(msg);
        }}
      />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-3">
          {/* History button */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="pressable w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <History size={14} strokeWidth={1.8} style={{ color: "#52525B" }} />
          </button>

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
            <p className="text-[16px] font-bold leading-tight" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
              Scout
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C875", animation: "glowBreathe 3s ease-in-out infinite" }} />
              <p className="text-[11px]" style={{ color: "#52525B" }}>Watching your market · Knows your network</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export button */}
          {chatMessages.length > 0 && !isStreaming && (
            <button
              onClick={handleExport}
              className="pressable w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
              title="Copy thread"
            >
              {copied ? <Check size={12} strokeWidth={2.5} style={{ color: "#00C875" }} /> : <Copy size={12} strokeWidth={2} style={{ color: "#52525B" }} />}
            </button>
          )}
          {/* Clear button */}
          {chatMessages.length > 0 && !isStreaming && (
            <button
              onClick={clearChat}
              className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <RotateCcw size={11} strokeWidth={2} style={{ color: "#52525B" }} />
              <span className="text-[11px] font-medium" style={{ color: "#52525B" }}>Clear</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Messages ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">

        {/* Empty state */}
        {displayMessages.length === 0 && (
          <div className="flex flex-col items-center px-2 py-6 animate-fade-up">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 32px rgba(0,200,117,0.3)" }}
            >
              <BLogo size={28} />
            </div>

            {!setup.completed ? (
              <>
                <p className="text-[18px] font-bold mb-2 text-center" style={{ color: "#F4F4F5" }}>Hey, I&apos;m Scout</p>
                <p className="text-[14px] text-center leading-relaxed mb-7" style={{ color: "#52525B", maxWidth: 280 }}>
                  Tell me what you sell and where you work — I&apos;ll scan permits, tenders, and your network for the right openings.
                </p>
              </>
            ) : (
              <>
                <p className="text-[18px] font-bold mb-2 text-center" style={{ color: "#F4F4F5" }}>What do you need?</p>
                <p className="text-[13px] text-center mb-7" style={{ color: "#52525B" }}>
                  Ask me about new leads, warm paths to companies, or who you know at a project. I can draft outreach too.
                </p>
              </>
            )}

            {/* Power query suggestions */}
            <div className="flex flex-col gap-2 w-full">
              {getBriefingChips(setup.whatISell, setup.whereIOperate).map((s, i) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={isStreaming || onboarding}
                  className="pressable flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-150 animate-fade-up"
                  style={{ animationDelay: `${i * 50}ms`, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
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
          <div key={i} className="flex flex-col animate-fade-up">
            <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                  style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 10px rgba(0,200,117,0.25)" }}
                >
                  <BLogo size={12} />
                </div>
              )}
              <div
                className="max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", color: "#fff", borderBottomRightRadius: 6 }
                    : { background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)", color: "#E4E4E7", borderBottomLeftRadius: 6, whiteSpace: "pre-wrap" }
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
            </div>

            {/* Blocks below assistant message */}
            {msg.role === "assistant" && msg.blocks && msg.blocks.length > 0 && (
              <div className="ml-9 max-w-[85%]">
                <BlockRenderer blocks={msg.blocks} />
              </div>
            )}

            {/* Briefing chips — horizontal scroll with per-chip dismiss */}
            {msg.role === "assistant" && msg.chips && msg.chips.length > 0 && (() => {
              const visibleChips = msg.chips.filter(
                (chip) => !dismissedChips.has(`${i}-${chip}`)
              );
              if (!visibleChips.length) return null;
              return (
                <div className="ml-9 mt-2">
                  <p className="text-[10px] mb-1.5" style={{ color: "#3F3F46" }}>Continue with:</p>
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none" }}
                  >
                    {visibleChips.map((chip) => (
                      <div
                        key={chip}
                        className="flex-shrink-0 flex items-center rounded-xl overflow-hidden"
                        style={{ background: "rgba(0,200,117,0.05)", border: "1px solid rgba(0,200,117,0.15)" }}
                      >
                        <button
                          onClick={() => handleSend(chip)}
                          disabled={isStreaming}
                          className="pressable flex items-center gap-2 pl-3 pr-2 py-2"
                        >
                          <Zap size={10} style={{ color: "#00C875", flexShrink: 0 }} />
                          <span className="text-[12px] whitespace-nowrap" style={{ color: "#A1A1AA" }}>{chip}</span>
                        </button>
                        <button
                          onClick={() => setDismissedChips((prev) => new Set([...prev, `${i}-${chip}`]))}
                          className="pressable pr-2 py-2 flex items-center"
                        >
                          <X size={10} strokeWidth={2} style={{ color: "#3F3F46" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Panel trigger chip */}
            {msg.role === "assistant" && msg.panelData && (
              <div className="ml-9 mt-2">
                <button
                  onClick={() => setActivePanelData(
                    activePanelData === msg.panelData ? null : msg.panelData!
                  )}
                  className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium"
                  style={{
                    background: activePanelData === msg.panelData ? "rgba(0,200,117,0.15)" : "rgba(0,200,117,0.07)",
                    border: "1px solid rgba(0,200,117,0.2)",
                    color: "#34D399",
                  }}
                >
                  {activePanelData === msg.panelData ? (
                    <><X size={11} strokeWidth={2} /> Close panel</>
                  ) : (
                    <><ArrowRight size={11} strokeWidth={2} /> {msg.panelData.type === "permit" ? "View Permits" : "View Dashboard"}</>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator — show until there's visible content */}
        {isStreaming && !hasVisibleStreamingContent && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
              style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)" }}>
              <BLogo size={12} />
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)", borderBottomLeftRadius: 6 }}>
              <div className="flex gap-1 items-center h-5">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "#52525B", animation: `typing 1.4s ease ${j * 0.2}s infinite` }} />
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
            placeholder={setup.completed ? "Ask Scout anything…" : "Tell me what you do and where you work…"}
            className="w-full px-4 pt-3.5 pb-3.5 pr-24 text-[15px] bg-transparent resize-none outline-none leading-relaxed"
            style={{ color: "#F4F4F5", caretColor: "#00C875", minHeight: 52 }}
          />
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
            {/* Voice button */}
            {hasVoice && !hasText && (
              <button
                onClick={handleVoice}
                className="pressable w-9 h-9 rounded-full flex items-center justify-center"
                style={{
                  background: isListening ? "rgba(0,200,117,0.15)" : "rgba(255,255,255,0.06)",
                  border: isListening ? "1px solid rgba(0,200,117,0.4)" : "none",
                }}
              >
                <Mic size={14} strokeWidth={2} style={{ color: isListening ? "#00C875" : "#52525B" }} />
              </button>
            )}
            {/* Send button */}
            <button
              onClick={() => handleSend(input)}
              disabled={!hasText || isStreaming || onboarding}
              className="pressable w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={
                hasText && !isStreaming && !onboarding
                  ? { background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 14px rgba(0,200,117,0.35)" }
                  : { background: "rgba(255,255,255,0.06)" }
              }
            >
              {isStreaming || onboarding ? (
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }} />
              ) : (
                <ArrowUp size={15} strokeWidth={2.5} style={{ color: hasText ? "#fff" : "#52525B" }} />
              )}
            </button>
          </div>
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
