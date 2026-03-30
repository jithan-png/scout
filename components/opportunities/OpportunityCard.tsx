"use client";

import { MapPin, Clock } from "lucide-react";
import type { Opportunity } from "@/lib/types";

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85 ? "#00C875" : score >= 65 ? "#F59E0B" : "#71717A";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg
        width="44"
        height="44"
        style={{ position: "absolute", transform: "rotate(-90deg)" }}
      >
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="2.5"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="relative text-[13px] font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY = {
  hot: {
    label: "HOT",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.2)",
    dot: "#EF4444",
  },
  warm: {
    label: "WARM",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.2)",
    dot: "#F59E0B",
  },
  watch: {
    label: "WATCH",
    color: "#71717A",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.08)",
    dot: "#52525B",
  },
};

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface OpportunityCardProps {
  opportunity: Opportunity;
  isSaved?: boolean;
  onClick: () => void;
  index?: number;
}

export default function OpportunityCard({
  opportunity,
  isSaved,
  onClick,
  index = 0,
}: OpportunityCardProps) {
  const { project, company, relationship, matchReasons, score, priority, timing, suggestedAction } =
    opportunity;
  const p = PRIORITY[priority];

  return (
    <button
      onClick={onClick}
      className="w-full text-left pressable"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className="rounded-2xl p-4 transition-all duration-200"
        style={{
          background: "#1C1C22",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow:
            "0 1px 1px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* ── Top row ─── */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{
              background: p.bg,
              border: `1px solid ${p.border}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: p.dot }}
            />
            <span
              className="text-[10px] font-bold tracking-wider"
              style={{ color: p.color }}
            >
              {p.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSaved && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#52525B",
                }}
              >
                Saved
              </span>
            )}
            <ScoreRing score={score} />
          </div>
        </div>

        {/* ── Project name + company ─── */}
        <h3
          className="text-[17px] font-bold leading-tight mb-0.5"
          style={{ color: "#F4F4F5", letterSpacing: "-0.02em" }}
        >
          {project.name}
        </h3>
        <p className="text-[13px] mb-3" style={{ color: "#52525B" }}>
          {company.name}
        </p>

        {/* ── Meta row ─── */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <MapPin size={10} style={{ color: "#3F3F46" }} />
          <span className="text-[12px]" style={{ color: "#71717A" }}>
            {project.city}
          </span>
          <span style={{ color: "#3F3F46" }}>·</span>
          <span
            className="text-[12px] font-semibold"
            style={{ color: "#71717A" }}
          >
            {formatValue(project.value)}
          </span>
          <span style={{ color: "#3F3F46" }}>·</span>
          <Clock size={10} style={{ color: "#3F3F46" }} />
          <span className="text-[12px]" style={{ color: "#71717A" }}>
            {timing}
          </span>
        </div>

        {/* ── Warm path ─── */}
        {relationship.hasWarmPath && (
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-3"
            style={{
              background: "rgba(245,158,11,0.07)",
              border: "1px solid rgba(245,158,11,0.18)",
            }}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.15)" }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p
              className="text-[12px] font-semibold"
              style={{ color: "#FCD34D" }}
            >
              {relationship.summary}
            </p>
          </div>
        )}

        {/* ── Match reasons ─── */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {matchReasons.slice(0, 3).map((r) => (
            <span
              key={r.label}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#71717A",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {r.label}
            </span>
          ))}
        </div>

        {/* ── Suggested action ─── */}
        <div
          className="pt-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p
            className="text-[12px] font-semibold"
            style={{ color: "#34D399" }}
          >
            {suggestedAction}
          </p>
        </div>
      </div>
    </button>
  );
}
