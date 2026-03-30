"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAppStore, type SetupStep } from "@/lib/store";

// ── Option data — trimmed to top 8 each ──────────────────────────────────────

const WHAT_I_SELL_OPTIONS = [
  "Mechanical / HVAC",
  "Electrical",
  "Plumbing",
  "Framing / Structure",
  "Roofing",
  "General Contracting",
  "Materials & Supply",
  "Other",
];

const WHERE_OPTIONS = [
  "Kelowna",
  "West Kelowna",
  "Penticton",
  "Vernon",
  "Kamloops",
  "Vancouver",
  "Victoria",
  "Anywhere in BC",
];

// Only 2 steps in the onboarding flow
const STEPS: SetupStep[] = ["what_you_sell", "where_you_operate"];

const STEP_INDEX: Record<SetupStep, number> = {
  what_you_sell: 0,
  where_you_operate: 1,
  // Remaining steps kept for type compatibility but not used in wizard
  project_types: 2,
  whatsapp: 3,
  contacts: 4,
  email: 5,
};

// ── Selection chip ────────────────────────────────────────────────────────────

function SelectionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable chip transition-all duration-150"
      style={
        selected
          ? {
              background: "rgba(0,200,117,0.12)",
              border: "1px solid rgba(0,200,117,0.3)",
              color: "#34D399",
              fontWeight: 600,
            }
          : {
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: "#A1A1AA",
            }
      }
    >
      {selected && (
        <span
          className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#00C875" }}
        >
          <Check size={8} color="white" strokeWidth={3} />
        </span>
      )}
      {label}
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const {
    setup,
    setSetupStep,
    completeSetup,
    toggleWhatISell,
    toggleWhereIOperate,
    startAgent,
    setActiveIntent,
  } = useAppStore();

  const currentIndex = STEP_INDEX[setup.currentStep] < STEPS.length
    ? STEP_INDEX[setup.currentStep]
    : 0;

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setSetupStep(STEPS[currentIndex + 1]);
    } else {
      // Step 2 complete — launch Scout
      completeSetup();
      setActiveIntent(
        `${setup.whatISell.join(", ")} in ${setup.whereIOperate.join(", ")}`
      );
      startAgent();
      router.push("/working");
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setSetupStep(STEPS[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  const canProceed =
    setup.currentStep === "what_you_sell"
      ? setup.whatISell.length > 0
      : setup.whereIOperate.length > 0;

  const isFinalStep = currentIndex === STEPS.length - 1;

  return (
    <div className="flex flex-col min-h-dvh bg-base">
      {/* Ambient glow */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{
          height: "40%",
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(0,200,117,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="safe-top" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="relative z-10 px-5 pt-4 flex items-center">
        <button
          onClick={goBack}
          className="pressable w-9 h-9 rounded-full flex items-center justify-center mr-4"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <ArrowLeft size={17} strokeWidth={2} style={{ color: "#A1A1AA" }} />
        </button>

        {/* Progress track — 2 steps only */}
        <div className="flex-1 flex items-center gap-1.5 mr-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                height: 3,
                flex: i === currentIndex ? "1.8" : "1",
                background:
                  i < currentIndex
                    ? "rgba(0,200,117,0.5)"
                    : i === currentIndex
                    ? "#00C875"
                    : "rgba(255,255,255,0.07)",
              }}
            />
          ))}
        </div>

        <span
          className="text-[12px] font-semibold flex-shrink-0"
          style={{ color: "#52525B" }}
        >
          {currentIndex === 0 ? "Step 1 of 2 · 20 seconds" : "Step 2 of 2"}
        </span>
      </header>

      {/* ── Step content ────────────────────────────────────────────── */}
      <main
        key={setup.currentStep}
        className="relative z-10 px-5 pt-8 pb-6 flex flex-col flex-1 animate-fade-up"
      >
        {/* ── What I Sell ── */}
        {setup.currentStep === "what_you_sell" && (
          <>
            <h2
              className="text-[28px] font-bold leading-tight mb-1"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              What do you sell?
            </h2>
            <p className="text-[14px] mb-7" style={{ color: "#52525B" }}>
              Scout matches live permits to your trade.
            </p>
            <div className="flex flex-wrap gap-2">
              {WHAT_I_SELL_OPTIONS.map((opt) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={setup.whatISell.includes(opt)}
                  onClick={() => toggleWhatISell(opt)}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Where I Operate ── */}
        {setup.currentStep === "where_you_operate" && (
          <>
            <h2
              className="text-[28px] font-bold leading-tight mb-1"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              Which cities?
            </h2>
            <p className="text-[14px] mb-7" style={{ color: "#52525B" }}>
              Scout scans permit registries in your area.
            </p>
            <div className="flex flex-wrap gap-2">
              {WHERE_OPTIONS.map((opt) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={setup.whereIOperate.includes(opt)}
                  onClick={() => toggleWhereIOperate(opt)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── CTA button ──────────────────────────────────────────────── */}
      <div className="relative z-10 px-5 pb-10">
        <button
          onClick={goNext}
          disabled={!canProceed}
          className="pressable w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all duration-300"
          style={
            canProceed
              ? {
                  background:
                    "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                  color: "#fff",
                  boxShadow: "0 0 24px rgba(0,200,117,0.28)",
                }
              : {
                  background: "rgba(255,255,255,0.04)",
                  color: "#3F3F46",
                  border: "1px solid rgba(255,255,255,0.06)",
                }
          }
        >
          {isFinalStep ? "Find my leads" : "Next"}
          {canProceed && <ArrowRight size={16} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}
