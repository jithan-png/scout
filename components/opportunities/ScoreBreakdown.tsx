"use client";

import type { ScoreBreakdown } from "@/lib/types";

const DIMENSIONS: Array<{
  key: keyof Omit<ScoreBreakdown, "total" | "priority">;
  label: string;
  max: number;
}> = [
  { key: "request_fit",  label: "Request fit",   max: 30 },
  { key: "relationship", label: "Relationship",   max: 25 },
  { key: "timing",       label: "Timing",         max: 20 },
  { key: "commercial",   label: "Commercial",     max: 15 },
  { key: "confidence",   label: "Data quality",   max: 10 },
];

function barColor(value: number, max: number): string {
  const pct = value / max;
  if (pct > 0.75) return "#00C875";
  if (pct > 0.40) return "#F59E0B";
  return "#52525B";
}

interface Props {
  breakdown: ScoreBreakdown;
  /** If true, only show the top 3 highest-scoring dimensions */
  collapsed?: boolean;
}

export default function ScoreBreakdown({ breakdown, collapsed = false }: Props) {
  const dims = collapsed
    ? [...DIMENSIONS]
        .sort((a, b) => (breakdown[b.key] / b.max) - (breakdown[a.key] / a.max))
        .slice(0, 3)
    : DIMENSIONS;

  return (
    <div className="flex flex-col gap-2.5">
      {dims.map(({ key, label, max }) => {
        const value = breakdown[key] as number;
        const pct = Math.min((value / max) * 100, 100);
        const color = barColor(value, max);

        return (
          <div key={key} className="flex items-center gap-3">
            {/* Label */}
            <span
              className="text-[11px] flex-shrink-0"
              style={{ color: "#71717A", width: 78 }}
            >
              {label}
            </span>

            {/* Bar track */}
            <div
              className="flex-1 rounded-full overflow-hidden"
              style={{ height: 4, background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: color,
                  boxShadow: pct > 0 ? `0 0 6px ${color}60` : "none",
                }}
              />
            </div>

            {/* Fraction */}
            <span
              className="text-[11px] font-semibold flex-shrink-0"
              style={{ color, width: 30, textAlign: "right" }}
            >
              {value}/{max}
            </span>
          </div>
        );
      })}
    </div>
  );
}
