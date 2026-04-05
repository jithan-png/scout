"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  MessageCircle,
  Mail,
  Smartphone,
  Database,
  FileSpreadsheet,
  Check,
  ChevronRight,
  MapPin,
  Tag,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import BottomNav from "@/components/ui/BottomNav";
import type { DataConnection } from "@/lib/types";

// ── Connection config ─────────────────────────────────────────────────────────

const CONNECTION_ICONS = {
  whatsapp: MessageCircle,
  gmail: Mail,
  contacts: Smartphone,
  crm: Database,
  excel: FileSpreadsheet,
};

const CONNECTION_ACCENT: Record<DataConnection["type"], string> = {
  whatsapp: "#25D366",
  gmail: "#EA4335",
  contacts: "#3B82F6",
  crm: "#8B5CF6",
  excel: "#10B981",
};

const CONNECTION_DESC: Record<DataConnection["type"], string> = {
  whatsapp: "Get proactive lead alerts and follow-up nudges",
  gmail: "Find warm paths through your email history",
  contacts: "Discover who you already know at target companies",
  crm: "Keep your pipeline in sync across tools",
  excel: "Import your contacts to unlock hidden warm paths",
};

const CONNECTION_DETAIL: Record<DataConnection["type"], { what: string; how: string; cta: string }> = {
  whatsapp: {
    what: "Scout will send you proactive lead alerts and follow-up nudges via WhatsApp — no app to check.",
    how: "Enter your phone number in the setup wizard and Scout will send you a verification message.",
    cta: "Set up in wizard",
  },
  gmail: {
    what: "Scout reads your email history to understand who you know and how warm each relationship is — so it can surface the best path into every opportunity.",
    how: "A secure OAuth connection. Scout only reads, never sends. Your data stays private.",
    cta: "Connect Gmail",
  },
  contacts: {
    what: "Scout cross-references your phone contacts with permit applicants and project companies to find hidden warm paths you didn't know you had.",
    how: "Your contacts are matched locally. Nothing is uploaded or stored externally.",
    cta: "Set up in wizard",
  },
  crm: {
    what: "Connect your HubSpot CRM so Scout knows which companies you've already sold to — those deals boost your relationship score and surface the hottest re-engagement opportunities.",
    how: "A read-only OAuth connection. Scout reads your contacts and deals, never modifies your CRM data.",
    cta: "Connect HubSpot",
  },
  excel: {
    what: "Import your contacts from LinkedIn, HubSpot, Outlook, or any spreadsheet to unlock warm paths — Scout will cross-reference them against every permit and tender it finds.",
    how: "LinkedIn: Settings → Data Privacy → Get a copy of your data → Connections.csv. Any CSV with Name, Company, and Email columns works.",
    cta: "Import CSV",
  },
};

// ── Connect modal ─────────────────────────────────────────────────────────────

function ConnectModal({
  conn,
  onClose,
  onSetup,
  onConnected,
}: {
  conn: DataConnection;
  onClose: () => void;
  onSetup: () => void;
  onConnected?: (dataPoints: string) => void;
}) {
  const Icon = CONNECTION_ICONS[conn.type];
  const accent = CONNECTION_ACCENT[conn.type];
  const detail = CONNECTION_DETAIL[conn.type];
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto animate-slide-up"
        style={{ maxWidth: 430 }}
      >
        <div
          className="rounded-t-3xl px-5 pt-5 pb-10"
          style={{
            background: "#1C1C22",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          }}
        >
          {/* Drag handle */}
          <div
            className="w-10 h-1 rounded-full mx-auto mb-5"
            style={{ background: "rgba(255,255,255,0.12)" }}
          />

          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
            >
              <Icon size={20} style={{ color: accent }} strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <p className="text-[17px] font-bold" style={{ color: "#F4F4F5" }}>
                {conn.name}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "#52525B" }}>
                {CONNECTION_DESC[conn.type]}
              </p>
            </div>
            <button
              onClick={onClose}
              className="pressable w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <X size={15} style={{ color: "#71717A" }} strokeWidth={2} />
            </button>
          </div>

          {/* What it does */}
          <div
            className="rounded-2xl p-4 mb-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[13px] leading-relaxed" style={{ color: "#A1A1AA" }}>
              {detail.what}
            </p>
          </div>

          {/* How */}
          <div className="flex items-start gap-2.5 px-1 mb-6">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: accent }}
            />
            <p className="text-[12px] leading-relaxed" style={{ color: "#52525B" }}>
              {detail.how}
            </p>
          </div>

          {/* Sync result */}
          {syncResult && (
            <div
              className="rounded-xl px-3 py-2 mb-3 text-[12px]"
              style={{ background: "rgba(0,200,117,0.08)", color: "#34D399", border: "1px solid rgba(0,200,117,0.15)" }}
            >
              {syncResult}
            </div>
          )}

          {/* Hidden file input for CSV import */}
          {conn.type === "excel" && (
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSyncing(true);
                setSyncResult(null);
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("source", "csv");
                  const res = await fetch("/api/contacts/import/csv", { method: "POST", body: formData });
                  const data = await res.json();
                  if (res.ok) {
                    const msg = data.message ?? `Imported ${data.synced ?? 0} contacts.`;
                    setSyncResult(msg);
                    onConnected?.(`${data.synced ?? 0} contacts · ${data.companies ?? 0} companies`);
                  } else {
                    setSyncResult(data.error ?? "Import failed — check the CSV format.");
                  }
                } catch {
                  setSyncResult("Network error — try again.");
                } finally {
                  setSyncing(false);
                  // Reset input so same file can be re-selected
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />
          )}

          {/* CTA */}
          <button
            onClick={async () => {
              if (conn.type === "crm") {
                // HubSpot OAuth — full-page redirect
                window.location.href = "/api/integrations/hubspot/connect";
                return;
              }
              if (conn.type === "gmail") {
                setSyncing(true);
                setSyncResult(null);
                try {
                  const res = await fetch("/api/contacts/sync/gmail", { method: "POST" });
                  const data = await res.json();
                  if (res.ok) {
                    const msg = data.message ?? `Synced ${data.synced ?? 0} contacts.`;
                    setSyncResult(msg);
                    onConnected?.(`${data.synced ?? 0} contacts · ${data.companies ?? 0} companies`);
                  } else if (data.error === "no_scope" || data.error === "no_token") {
                    setSyncResult("Please sign out and sign back in to grant contacts access.");
                  } else {
                    setSyncResult(data.message ?? "Sync failed — try again.");
                  }
                } catch {
                  setSyncResult("Network error — try again.");
                } finally {
                  setSyncing(false);
                }
              } else if (conn.type === "excel") {
                fileInputRef.current?.click();
              } else {
                onSetup();
              }
            }}
            disabled={syncing}
            className="pressable w-full py-4 rounded-2xl text-[15px] font-semibold"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`,
              color: "#fff",
              boxShadow: `0 0 20px ${accent}33`,
              opacity: syncing ? 0.7 : 1,
            }}
          >
            {syncing ? "Syncing..." : detail.cta}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Connection row ────────────────────────────────────────────────────────────

function ConnectionRow({
  conn,
  onConnect,
}: {
  conn: DataConnection;
  onConnect: () => void;
}) {
  const Icon = CONNECTION_ICONS[conn.type];
  const accent = CONNECTION_ACCENT[conn.type];
  const isConnected = conn.status === "connected";

  return (
    <div
      className="flex items-center gap-3 px-4 py-4 rounded-2xl"
      style={{
        background: "#1C1C22",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `${accent}18`,
          border: `1px solid ${accent}25`,
        }}
      >
        <Icon size={16} style={{ color: accent }} strokeWidth={1.75} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold" style={{ color: "#F4F4F5" }}>
          {conn.name}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>
          {isConnected && conn.dataPoints ? conn.dataPoints : CONNECTION_DESC[conn.type]}
        </p>
      </div>

      {isConnected ? (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{
            background: "rgba(0,200,117,0.10)",
            border: "1px solid rgba(0,200,117,0.2)",
          }}
        >
          <Check size={9} style={{ color: "#00C875" }} strokeWidth={3} />
          <span className="text-[10px] font-bold" style={{ color: "#34D399" }}>
            Connected
          </span>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="pressable flex items-center gap-0.5 text-[13px] font-semibold flex-shrink-0"
          style={{ color: "#00C875" }}
        >
          Connect
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// ── Scout status badge ────────────────────────────────────────────────────────

function ScoutStatusBadge({ connected }: { connected: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-5"
      style={{
        background: "#1C1C22",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow:
          "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Scout header stripe */}
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,200,117,0.12) 0%, rgba(0,200,117,0.04) 100%)",
          borderBottom: "1px solid rgba(0,200,117,0.12)",
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: "#00C875",
            boxShadow: "0 0 6px rgba(0,200,117,0.6)",
          }}
        />
        <span
          className="text-[13px] font-semibold"
          style={{ color: "#34D399" }}
        >
          Scout is active · watching your market
        </span>
        <span
          className="ml-auto text-[11px]"
          style={{ color: "#52525B" }}
        >
          {connected} sources
        </span>
      </div>

      {/* Body */}
      <ScoutConfigBody />
    </div>
  );
}

function ScoutConfigBody() {
  const router = useRouter();
  const { user, setup } = useAppStore();
  const trades = user?.whatISell ?? setup.whatISell;
  const cities = user?.whereIOperate ?? setup.whereIOperate;
  const types = user?.projectTypes ?? setup.projectTypes;

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Trades */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Tag size={11} style={{ color: "#3F3F46" }} />
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#3F3F46" }}
          >
            What you sell
          </p>
        </div>
        {trades.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {trades.map((t) => (
              <span
                key={t}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "#A1A1AA",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "#3F3F46" }}>
            Not configured
          </p>
        )}
      </div>

      {/* Cities */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={11} style={{ color: "#3F3F46" }} />
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#3F3F46" }}
          >
            Where you work
          </p>
        </div>
        {cities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {cities.map((c) => (
              <span
                key={c}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                style={{
                  background: "rgba(0,200,117,0.08)",
                  color: "#34D399",
                  border: "1px solid rgba(0,200,117,0.18)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "#3F3F46" }}>
            Not configured
          </p>
        )}
      </div>

      {/* Types */}
      {types.length > 0 && (
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "#3F3F46" }}
          >
            Project types
          </p>
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <span
                key={t}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "#A1A1AA",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => router.push("/setup")}
        className="pressable text-[13px] font-semibold text-left"
        style={{ color: "#00C875" }}
      >
        Update my profile →
      </button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connections, updateConnection, resetStore, whatsappPhone, setWhatsappPhone } = useAppStore();
  const connectedCount = connections.filter((c) => c.status === "connected").length;
  const [activeConn, setActiveConn] = useState<DataConnection | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [hubspotStatus, setHubspotStatus] = useState<string | null>(null);

  // Handle return from HubSpot OAuth
  useEffect(() => {
    const hs = searchParams.get("hubspot");
    if (hs === "ok") {
      setHubspotStatus("syncing");
      // Auto-trigger contact sync
      fetch("/api/contacts/sync/hubspot", { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          const msg = data.message ?? `Synced ${data.synced ?? 0} contacts.`;
          setHubspotStatus("done");
          const crmConn = connections.find((c) => c.type === "crm");
          if (crmConn) {
            updateConnection(
              crmConn.id,
              "connected",
              `${data.synced ?? 0} contacts · ${data.deals ?? 0} deals`
            );
          }
          setTimeout(() => setHubspotStatus(null), 5000);
          // Remove query param without re-render loop
          router.replace("/profile");
        })
        .catch(() => {
          setHubspotStatus("error");
          setTimeout(() => setHubspotStatus(null), 5000);
          router.replace("/profile");
        });
    } else if (hs === "error") {
      setHubspotStatus("error");
      setTimeout(() => setHubspotStatus(null), 5000);
      router.replace("/profile");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = () => {
    if (confirm("Sign out and clear all your data?")) {
      resetStore();
      signOut({ callbackUrl: "/" });
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-base">
      <div className="safe-top" />

      <header className="px-5 pt-5 pb-5">
        <h1
          className="text-[24px] font-bold"
          style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
        >
          Profile
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#52525B" }}>
          Your intelligence profile
        </p>
      </header>

      <main className="px-5 pb-6">
        {/* HubSpot OAuth result banner */}
        {hubspotStatus && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-[13px] font-medium"
            style={
              hubspotStatus === "error"
                ? { background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.15)" }
                : hubspotStatus === "done"
                ? { background: "rgba(0,200,117,0.08)", color: "#34D399", border: "1px solid rgba(0,200,117,0.15)" }
                : { background: "rgba(139,92,246,0.08)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.15)" }
            }
          >
            {hubspotStatus === "syncing" && "Syncing HubSpot contacts and deals…"}
            {hubspotStatus === "done" && "HubSpot connected — contacts and deals imported."}
            {hubspotStatus === "error" && "HubSpot connection failed. Please try again."}
          </div>
        )}

        {/* Scout config */}
        <ScoutStatusBadge connected={connectedCount} />

        {/* Data sources */}
        <div className="mb-5">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#3F3F46" }}
          >
            Intelligence sources
          </p>
          <div className="flex flex-col gap-2">
            {connections.map((conn) => (
              <ConnectionRow
                key={conn.id}
                conn={conn}
                onConnect={() => setActiveConn(conn)}
              />
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="mb-5">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#3F3F46" }}
          >
            Notifications
          </p>
          <div
            className="rounded-2xl p-4"
            style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.2)" }}
              >
                <MessageCircle size={16} style={{ color: "#25D366" }} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold" style={{ color: "#F4F4F5" }}>WhatsApp alerts</p>
                <p className="text-[11px] mt-0.5" style={{ color: "#52525B" }}>
                  Get proactive lead alerts via WhatsApp
                </p>
              </div>
              {whatsappPhone && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: "rgba(0,200,117,0.10)", border: "1px solid rgba(0,200,117,0.2)" }}
                >
                  <Check size={9} style={{ color: "#00C875" }} strokeWidth={3} />
                  <span className="text-[10px] font-bold" style={{ color: "#34D399" }}>Active</span>
                </div>
              )}
            </div>
            {whatsappPhone ? (
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium" style={{ color: "#71717A" }}>{whatsappPhone}</p>
                <button
                  onClick={() => {
                    setWhatsappPhone(null);
                    fetch("/api/profile/preferences", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ notification_phone: null }),
                    }).catch(() => {});
                  }}
                  className="pressable text-[12px] font-semibold"
                  style={{ color: "#52525B" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="flex-1 px-3 py-2.5 rounded-xl text-[13px] bg-transparent outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: "#F4F4F5",
                  }}
                />
                <button
                  onClick={() => {
                    const phone = phoneInput.trim();
                    if (phone) {
                      setWhatsappPhone(phone);
                      setPhoneInput("");
                      // Persist to Supabase so the cron can send notifications
                      fetch("/api/profile/preferences", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ notification_phone: phone }),
                      }).catch(() => {});
                    }
                  }}
                  disabled={!phoneInput.trim()}
                  className="pressable px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={
                    phoneInput.trim()
                      ? { background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.25)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#3F3F46", border: "1px solid rgba(255,255,255,0.07)" }
                  }
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* App links */}
        <div className="flex flex-col gap-1">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "#3F3F46" }}
          >
            App
          </p>
          {["Privacy Policy", "Terms of Service", "Send feedback"].map((item) => (
            <button
              key={item}
              className="pressable flex items-center justify-between px-4 py-3.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span className="text-[14px]" style={{ color: "#71717A" }}>{item}</span>
              <ChevronRight size={14} style={{ color: "#3F3F46" }} strokeWidth={1.5} />
            </button>
          ))}
          <button
            onClick={handleSignOut}
            className="pressable flex items-center px-4 py-3.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span className="text-[14px]" style={{ color: "#EF4444" }}>Sign out</span>
          </button>
        </div>

        <p
          className="text-center text-[11px] mt-6"
          style={{ color: "#3F3F46" }}
        >
          BuildMapper · v1.0.0
        </p>
      </main>

      <div className="pb-nav" />
      <BottomNav />

      {/* Connection modal */}
      {activeConn && (
        <ConnectModal
          conn={activeConn}
          onClose={() => setActiveConn(null)}
          onSetup={() => {
            setActiveConn(null);
            router.push("/setup");
          }}
          onConnected={(dataPoints) => {
            updateConnection(activeConn.id, "connected", dataPoints);
          }}
        />
      )}
    </div>
  );
}
