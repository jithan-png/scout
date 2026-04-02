"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, LayoutList, Bell, User } from "lucide-react";
import { useAppStore } from "@/lib/store";
import SignInSheet from "@/components/ui/SignInSheet";

const NAV_ITEMS = [
  { href: "/scout",         icon: Sparkles,   label: "Scout",   protected: true  },
  { href: "/opportunities", icon: LayoutList, label: "Opps",    protected: false },
  { href: "/activity",      icon: Bell,       label: "Activity",protected: true  },
  { href: "/profile",       icon: User,       label: "Profile", protected: true  },
];

const SHEET_COPY: Record<string, { title: string; description: string }> = {
  "/scout": {
    title: "Sign in to talk to Scout",
    description: "Scout chat remembers your market, tracks your pipeline, and briefs you daily on new permits and tenders.",
  },
  "/activity": {
    title: "Sign in to see your alerts",
    description: "Activity shows you new permit matches, deals that need follow-up, and warm paths as they open up.",
  },
  "/profile": {
    title: "Sign in to manage your profile",
    description: "Set your trades, location, and project types so Scout knows exactly what to find for you.",
  },
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const unreadCount = useAppStore((s) => s.unreadCount);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTarget, setSheetTarget] = useState("/scout");

  function handleNavClick(href: string, isProtected: boolean) {
    if (isProtected && !session) {
      setSheetTarget(href);
      setSheetOpen(true);
    } else {
      router.push(href);
    }
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Glass background */}
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(9, 9, 11, 0.88)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
          }}
        />

        <div className="relative flex items-center justify-around h-[56px]">
          {NAV_ITEMS.map(({ href, icon: Icon, label, protected: isProtected }) => {
            const isActive = pathname.startsWith(href);
            const isLocked = isProtected && !session;

            return (
              <button
                key={href}
                onClick={() => handleNavClick(href, isProtected)}
                className="flex flex-col items-center justify-center gap-[3px] w-[72px] h-full relative"
              >
                {/* Active indicator pill */}
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                    style={{ background: "#00C875" }}
                  />
                )}

                <div className="relative">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.75}
                    style={{ color: isActive ? "#00C875" : isLocked ? "#3F3F46" : "#52525B" }}
                  />
                  {/* Unread badge */}
                  {label === "Activity" && unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-2 min-w-[15px] h-[15px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-[3px]"
                      style={{ background: "#EF4444" }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>

                <span
                  className="text-[9px] font-semibold tracking-wide uppercase"
                  style={{ color: isActive ? "#00C875" : isLocked ? "#3F3F46" : "#52525B" }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <SignInSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={SHEET_COPY[sheetTarget]?.title}
        description={SHEET_COPY[sheetTarget]?.description}
        callbackUrl={sheetTarget}
      />
    </>
  );
}
