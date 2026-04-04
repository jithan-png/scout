"use client";

import { useRef, useEffect, useState } from "react";
import { X, ArrowUp, Zap, FileText, TrendingUp, Search } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FloatingChatProps {
  /** Context string passed to Scout — e.g. lead name, company, value */
  context?: string;
  /** When set, auto-opens the chat and sends this query immediately */
  triggerQuery?: string | null;
}

// ── Scout logo ────────────────────────────────────────────────────────────────

function BLogo({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.95" />
      <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.7" />
    </svg>
  );
}

// ── Quick action chips ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Draft an intro email",      icon: FileText,   query: "Draft an intro email for this lead" },
  { label: "Is this worth pursuing?",   icon: TrendingUp, query: "Is this lead worth pursuing? Give me a direct answer." },
  { label: "Show me similar leads",       icon: Search,     query: "Find me similar leads to this one in my area" },
  { label: "What's my best angle?",     icon: Zap,        query: "What's the best angle for approaching this company?" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function FloatingChat({ context = "", triggerQuery }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentTriggerRef = useRef<string | null>(null);

  const hasText = input.trim().length > 0;

  // Auto-open and send when triggerQuery changes
  useEffect(() => {
    if (triggerQuery && triggerQuery !== sentTriggerRef.current) {
      sentTriggerRef.current = triggerQuery;
      setMessages([]);
      setInput("");
      setIsOpen(true);
      // Short delay to let the sheet animate in before sending
      setTimeout(() => handleSend(triggerQuery), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerQuery]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setMessages([]);
    setInput("");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setInput("");
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isTyping) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setIsTyping(true);

    // Add empty assistant bubble immediately so it streams in
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context,
          history: messages.slice(-6),
          userProfile: {},
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Try again." };
          return updated;
        });
        setIsTyping(false);
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
        // Strip panel/block/action markers — FloatingChat only shows text
        const display = accumulated
          .replace(/__PANEL__\w+__\{[\s\S]*?\}__?/g, "")
          .replace(/__BLOCK__\{[\s\S]*?\}/g, "")
          .replace(/__ACTION:\w+__/g, "")
          .trim();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: display };
          return updated;
        });
      }

      // Final clean pass after stream closes
      const finalDisplay = accumulated
        .replace(/__PANEL__\w+__\{[\s\S]*?\}__?/g, "")
        .replace(/__BLOCK__\{[\s\S]*?\}/g, "")
        .replace(/__ACTION:\w+__/g, "")
        .trim();
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: finalDisplay || "Scout couldn't respond. Try again." };
        return updated;
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Scout is offline right now." };
        return updated;
      });
    }

    setIsTyping(false);
  };

  return (
    <>
      {/* ── FAB — Scout logo, not generic chat icon ── */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="pressable fixed z-50 flex items-center justify-center rounded-full"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
            right: 18,
            width: 50,
            height: 50,
            background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
            boxShadow: "0 0 24px rgba(0,200,117,0.45), 0 4px 16px rgba(0,0,0,0.4)",
            animation: "glowBreathe 3s ease-in-out infinite",
          }}
        >
          <BLogo size={20} />
          {/* Amber action spark */}
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)",
              border: "1.5px solid #09090B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="5" height="5" viewBox="0 0 10 10" fill="none">
              <path d="M6 1L3 5.5h3L4 9l3-4.5H4L6 1z" fill="#09090B" strokeWidth="0" />
            </svg>
          </span>
        </button>
      )}

      {/* ── Chat sheet ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col transition-transform duration-300"
        style={{
          height: "82dvh",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          background: "#111114",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                boxShadow: "0 0 14px rgba(0,200,117,0.3)",
              }}
            >
              <BLogo size={14} />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-tight" style={{ color: "#F4F4F5" }}>
                Scout
              </p>
              <p className="text-[11px] leading-tight" style={{ color: "#52525B" }}>
                {context
                  ? `Context: ${context}`
                  : "Knows your leads · Drafts outreach · Spots warm paths"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="pressable w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <X size={15} strokeWidth={2} style={{ color: "#71717A" }} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center px-4 py-8">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                  boxShadow: "0 0 20px rgba(0,200,117,0.3)",
                }}
              >
                <BLogo size={20} />
              </div>
              <p className="text-[14px] font-semibold mb-1.5" style={{ color: "#F4F4F5" }}>
                What do you need?
              </p>
              <p className="text-[12px] leading-relaxed mb-6" style={{ color: "#52525B" }}>
                Scout can analyze this lead, find warm paths to the company, draft outreach, or search for similar projects.
              </p>
              {/* Action chips */}
              <div className="flex flex-col gap-2 w-full text-left">
                {QUICK_ACTIONS.map(({ label, icon: Icon, query }) => (
                  <button
                    key={label}
                    onClick={() => handleSend(query)}
                    className="pressable flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-150"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <Icon size={13} style={{ color: "#00C875", flexShrink: 0 }} strokeWidth={2} />
                    <span style={{ color: "#A1A1AA" }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                  style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)" }}
                >
                  <BLogo size={11} />
                </div>
              )}
              <div
                className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed"
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
              </div>
            </div>
          ))}

          {isTyping && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)" }}
              >
                <BLogo size={11} />
              </div>
              <div
                className="px-3.5 py-2.5 rounded-2xl"
                style={{
                  background: "#1C1C22",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderBottomLeftRadius: 6,
                }}
              >
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "#52525B",
                        animation: `typing 1.4s ease ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="px-4 flex-shrink-0"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: 12,
          }}
        >
          <div
            className="relative rounded-2xl"
            style={{
              background: "#1C1C22",
              border: `1px solid ${hasText ? "rgba(0,200,117,0.3)" : "rgba(255,255,255,0.09)"}`,
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
                  handleSend();
                }
              }}
              placeholder="Ask Scout anything…"
              className="w-full px-4 pt-3 pb-3 pr-12 text-[14px] bg-transparent resize-none outline-none leading-relaxed"
              style={{ color: "#F4F4F5", caretColor: "#00C875", minHeight: 48 }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!hasText || isTyping}
              className="pressable absolute right-2.5 bottom-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
              style={
                hasText && !isTyping
                  ? {
                      background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                      boxShadow: "0 0 12px rgba(0,200,117,0.35)",
                    }
                  : { background: "rgba(255,255,255,0.06)" }
              }
            >
              <ArrowUp size={14} strokeWidth={2.5} style={{ color: hasText ? "#fff" : "#52525B" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={handleClose}
        />
      )}
    </>
  );
}
