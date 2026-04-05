"use client";

import { signIn } from "next-auth/react";
import { X } from "lucide-react";

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

interface SignInSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  callbackUrl?: string;
}

export default function SignInSheet({
  open,
  onClose,
  title = "Sign in to continue",
  description = "Scout remembers your market, tracks your pipeline, and briefs you daily on new opportunities.",
  callbackUrl = "/scout",
}: SignInSheetProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-[430px] z-50 animate-fade-up"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="rounded-t-3xl p-6"
          style={{ background: "#141418", border: "1px solid rgba(255,255,255,0.09)", borderBottom: "none" }}
        >
          {/* Close */}
          <div className="flex items-center justify-between mb-5">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)", boxShadow: "0 0 16px rgba(0,200,117,0.3)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 2h5a2.5 2.5 0 0 1 0 5H3V2Z" fill="white" fillOpacity="0.9" />
                <path d="M3 7h5.5a2.5 2.5 0 0 1 0 5H3V7Z" fill="white" fillOpacity="0.65" />
              </svg>
            </div>
            <button
              onClick={onClose}
              className="pressable w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <X size={15} strokeWidth={2} style={{ color: "#71717A" }} />
            </button>
          </div>

          <p className="text-[20px] font-bold mb-2 leading-tight" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
            {title}
          </p>
          <p className="text-[14px] leading-relaxed mb-6" style={{ color: "#71717A" }}>
            {description}
          </p>

          <button
            onClick={() => {
            window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl || "/scout")}`;
          }}
            className="pressable w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[15px] font-semibold mb-3"
            style={{ background: "#fff", color: "#111" }}
          >
            <GoogleIcon /> Continue with Google
          </button>

          <p className="text-center text-[11px]" style={{ color: "#3F3F46" }}>
            No spam · No credit card · Cancel any time
          </p>

          {process.env.NODE_ENV !== "production" && (
            <button
              onClick={() => signIn("credentials", { callbackUrl })}
              className="w-full text-center text-[11px] py-2 mt-3 rounded-xl"
              style={{ color: "#3F3F46", border: "1px dashed rgba(255,255,255,0.08)" }}
            >
              Skip login (test mode)
            </button>
          )}
        </div>
      </div>
    </>
  );
}
