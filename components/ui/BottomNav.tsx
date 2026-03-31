"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, LayoutList, Bell, User } from "lucide-react";
import { useAppStore } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/",              icon: Home,       label: "Home",    exact: true  },
  { href: "/scout",         icon: Sparkles,   label: "Scout",   exact: false },
  { href: "/opportunities", icon: LayoutList, label: "Opps",    exact: false },
  { href: "/activity",      icon: Bell,       label: "Activity",exact: false },
  { href: "/profile",       icon: User,       label: "Profile", exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  const unreadCount = useAppStore((s) => s.unreadCount);

  return (
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
        {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
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
                  style={{ color: isActive ? "#00C875" : "#52525B" }}
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
                style={{ color: isActive ? "#00C875" : "#52525B" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
