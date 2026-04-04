"use client";

import { useEffect, useRef, useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import type { ScoutOpportunity, ScoutPanelData } from "@/lib/types";
import PermitTablePanel from "./panels/PermitTablePanel";
import DashboardPanel from "./panels/DashboardPanel";
import OpportunityDetailContent from "@/components/opportunities/OpportunityDetailContent";

interface ScoutPanelProps {
  data: ScoutPanelData | null;
  onClose: () => void;
  onScoutMessage?: (msg: string) => void;
}

const PANEL_TITLES: Record<string, string> = {
  permit: "Permits",
  dashboard: "Dashboard",
};

export default function ScoutPanel({ data, onClose, onScoutMessage }: ScoutPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [detailOpp, setDetailOpp] = useState<ScoutOpportunity | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isOpen = !!data;
  const inDetail = !!detailOpp;

  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  // Reset detail view when panel closes
  useEffect(() => {
    if (!isOpen) setDetailOpp(null);
  }, [isOpen]);

  if (!mounted) return null;

  const title = inDetail
    ? (detailOpp?.project?.name ?? "Detail")
    : (data ? (PANEL_TITLES[data.type] ?? "Panel") : "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(3px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 flex flex-col w-full max-w-[430px]"
        style={{
          height: "85dvh",
          background: "#141418",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "24px 24px 0 0",
          transform: `translateX(-50%) translateY(${isOpen ? "0" : "100%"})`,
          transition: "transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2">
            {inDetail && (
              <button
                onClick={() => setDetailOpp(null)}
                className="pressable w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <ArrowLeft size={14} strokeWidth={2} style={{ color: "#A1A1AA" }} />
              </button>
            )}
            <p
              className="text-[15px] font-semibold truncate max-w-[220px]"
              style={{ color: "#F4F4F5", letterSpacing: "-0.01em" }}
            >
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="pressable w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#52525B" }} />
          </button>
        </div>

        {/* Sliding viewport — keeps both views in DOM for scroll preservation */}
        <div className="flex-1 relative overflow-hidden">
          <div
            className="absolute inset-0 flex"
            style={{
              transform: inDetail ? "translateX(-100%)" : "translateX(0)",
              transition: "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
              width: "200%",
            }}
          >
            {/* List view */}
            <div
              ref={listRef}
              className="overflow-y-auto"
              style={{
                width: "50%",
                paddingBottom: "env(safe-area-inset-bottom, 16px)",
              }}
            >
              {data?.type === "permit" && (
                <PermitTablePanel
                  query={data.data.query}
                  permits={data.data.permits}
                  onScoutMessage={onScoutMessage}
                  onOpenDetail={(opp) => setDetailOpp(opp)}
                />
              )}
              {data?.type === "dashboard" && (
                <DashboardPanel data={data.data} />
              )}
            </div>

            {/* Detail view */}
            <div
              className="overflow-y-auto"
              style={{
                width: "50%",
                paddingBottom: "env(safe-area-inset-bottom, 16px)",
              }}
            >
              {detailOpp && (
                <OpportunityDetailContent
                  opp={detailOpp}
                  onBack={() => setDetailOpp(null)}
                  compact
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
