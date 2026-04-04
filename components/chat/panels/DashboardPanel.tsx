"use client";

import { useEffect, useState } from "react";
import type { ScoutPanelData } from "@/lib/types";

type DashboardData = ScoutPanelData["data"];

// ── Score bars (SVG) ─────────────────────────────────────────────────────────

function ScoreBarsView({ bars }: { bars: NonNullable<DashboardData["bars"]> }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const maxTotal = bars.reduce((sum, b) => sum + b.max, 0);

  return (
    <div className="flex flex-col gap-3 p-4">
      {bars.map((bar, i) => {
        const pct = bar.max > 0 ? bar.value / bar.max : 0;
        const color = pct > 0.75 ? "#00C875" : pct > 0.4 ? "#F59E0B" : "#52525B";
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px]" style={{ color: "#A1A1AA" }}>{bar.label}</span>
              <span className="text-[12px] font-semibold" style={{ color }}>
                {bar.value}<span className="text-[10px] font-normal" style={{ color: "#52525B" }}>/{bar.max}</span>
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: animated ? `${pct * 100}%` : "0%",
                  background: color,
                  transition: `width 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Total */}
      {bars.length > 1 && (
        <div
          className="flex items-center justify-between mt-1 pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[12px] font-semibold" style={{ color: "#E4E4E7" }}>Total</span>
          <span className="text-[16px] font-bold" style={{ color: "#00C875" }}>
            {bars.reduce((s, b) => s + b.value, 0)}
            <span className="text-[12px] font-normal" style={{ color: "#52525B" }}>/{maxTotal}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Permit summary (stat tiles) ──────────────────────────────────────────────

function PermitSummaryView({ stats }: { stats: NonNullable<DashboardData["stats"]> }) {
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex flex-col items-center py-4 px-2 rounded-2xl"
          style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span
            className="text-[22px] font-bold leading-none"
            style={{ color: stat.color ?? "#00C875", letterSpacing: "-0.02em" }}
          >
            {stat.value}
          </span>
          <span className="text-[10px] mt-1.5 text-center leading-tight" style={{ color: "#52525B" }}>
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline funnel ──────────────────────────────────────────────────────────

function PipelineFunnelView({ stages }: { stages: NonNullable<DashboardData["stages"]> }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const max = Math.max(...stages.map((s) => s.count), 1);
  const COLORS = ["#00C875", "#34D399", "#6EE7B7", "#A7F3D0"];

  return (
    <div className="flex flex-col gap-2 p-4">
      {stages.map((stage, i) => {
        const pct = stage.count / max;
        const color = COLORS[i] ?? "#52525B";
        const barW = animated ? `${Math.max(pct * 100, 12)}%` : "0%";
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] w-20 flex-shrink-0 text-right" style={{ color: "#52525B" }}>
              {stage.label}
            </span>
            <div className="flex-1 h-8 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className="h-full rounded-xl flex items-center px-3"
                style={{
                  width: barW,
                  background: color,
                  transition: `width 500ms cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                  opacity: animated ? 1 : 0,
                }}
              >
                <span className="text-[12px] font-bold text-white whitespace-nowrap">
                  {stage.count}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Company brief ────────────────────────────────────────────────────────────

function CompanyBriefView({ company }: { company: NonNullable<DashboardData["company"]> }) {
  return (
    <div className="flex flex-col p-4 gap-4">
      <div>
        <p className="text-[18px] font-bold" style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}>
          {company.name}
        </p>
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px]"
            style={{ color: "#52525B" }}
          >
            {company.website.replace(/^https?:\/\//, "")}
          </a>
        )}
      </div>
      {company.description && (
        <p className="text-[13px] leading-relaxed" style={{ color: "#A1A1AA" }}>
          {company.description}
        </p>
      )}
      {company.contacts && company.contacts.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>Contacts</p>
          <div className="flex flex-col gap-2">
            {company.contacts.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "#1C1C22", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                  style={{ background: "rgba(0,200,117,0.12)", color: "#00C875" }}
                >
                  {(c.name?.[0] ?? "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: "#E4E4E7" }}>{c.name}</p>
                  {c.role && <p className="text-[11px] truncate" style={{ color: "#52525B" }}>{c.role}</p>}
                </div>
                <div className="flex gap-1.5">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="pressable w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.72-.72a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                  )}
                  {c.email && (
                    <a href={`mailto:${c.email}`} className="pressable w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function DashboardPanel({ data }: { data: DashboardData }) {
  const { view_type, bars, stats, stages, company } = data;

  if (view_type === "score_bars" && bars?.length) {
    return <ScoreBarsView bars={bars} />;
  }
  if (view_type === "permit_summary" && stats?.length) {
    return <PermitSummaryView stats={stats} />;
  }
  if (view_type === "pipeline_funnel" && stages?.length) {
    return <PipelineFunnelView stages={stages} />;
  }
  if (view_type === "company_brief" && company) {
    return <CompanyBriefView company={company} />;
  }

  // Fallback: generic stat tiles if data has stats
  if (stats?.length) {
    return <PermitSummaryView stats={stats} />;
  }

  return (
    <div className="p-6 text-center">
      <p className="text-[13px]" style={{ color: "#52525B" }}>No dashboard data available.</p>
    </div>
  );
}
