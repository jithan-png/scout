"use client";

import { useRef, useEffect, useState } from "react";
import { MessageCircle, X, ArrowUp } from "lucide-react";
import { useAppStore } from "@/lib/store";

interface FloatingChatProps {
  /** Optional context string passed to Scout (e.g. lead name + value) */
  context?: string;
}

export default function FloatingChat({ context = "" }: FloatingChatProps) {
  const { isChatOpen, openChat, closeChat, chatMessages, addChatMessage, clearChat } =
    useAppStore();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isChatOpen]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  };

  const handleOpen = () => {
    clearChat();
    openChat();
  };

  const handleClose = () => {
    closeChat();
    setInput("");
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    addChatMessage({ role: "user", content: trimmed });
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setIsTyping(true);

    try {
      const res = await fetch(`/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context,
          history: chatMessages.slice(-6),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        addChatMessage({ role: "assistant", content: data.reply });
      } else {
        addChatMessage({ role: "assistant", content: "Something went wrong. Try again." });
      }
    } catch {
      addChatMessage({ role: "assistant", content: "Scout is offline right now." });
    }

    setIsTyping(false);
  };

  const hasText = input.trim().length > 0;

  return (
    <>
      {/* ── Floating button (always visible when closed) ── */}
      {!isChatOpen && (
        <button
          onClick={handleOpen}
          className="pressable fixed z-50 flex items-center justify-center rounded-full"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
            right: 20,
            width: 52,
            height: 52,
            background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
            boxShadow: "0 0 24px rgba(0,200,117,0.45), 0 4px 16px rgba(0,0,0,0.4)",
            animation: "glowBreathe 3s ease-in-out infinite",
          }}
        >
          <MessageCircle size={22} color="white" strokeWidth={2} />
        </button>
      )}

      {/* ── Chat sheet (slide up when open) ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col transition-transform duration-300"
        style={{
          height: "82dvh",
          transform: isChatOpen ? "translateY(0)" : "translateY(100%)",
          background: "#111114",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)" }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.95" />
                <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.7" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "#F4F4F5" }}>
                Ask Scout
              </p>
              {context && (
                <p className="text-[11px] truncate max-w-[220px]" style={{ color: "#52525B" }}>
                  {context}
                </p>
              )}
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
          {chatMessages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
              <p className="text-[14px] font-semibold mb-1" style={{ color: "#F4F4F5" }}>
                What can I help you with?
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#52525B" }}>
                Draft an email, assess this lead, or ask about next steps.
              </p>
              {/* Quick prompt suggestions */}
              <div className="flex flex-col gap-2 mt-5 w-full">
                {[
                  "Draft me an intro email for this lead",
                  "Is this worth pursuing?",
                  "What's my best angle here?",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                    className="pressable text-left px-3.5 py-2.5 rounded-xl text-[13px]"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "#71717A",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
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
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
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
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{
                        background: "#52525B",
                        animationDelay: `${i * 150}ms`,
                        animationDuration: "900ms",
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
          className="px-4 pb-safe"
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
              onClick={handleSend}
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
      {isChatOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={handleClose}
        />
      )}
    </>
  );
}
