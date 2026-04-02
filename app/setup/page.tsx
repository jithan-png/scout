"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import { ArrowLeft, ArrowRight, Check, X, Plus, Sparkles } from "lucide-react";
import { useAppStore, type SetupStep } from "@/lib/store";

// ── Trade options ─────────────────────────────────────────────────────────────

const TRADE_OPTIONS = [
  "Mechanical / HVAC",
  "Electrical",
  "Plumbing",
  "Framing / Structure",
  "Roofing",
  "Concrete / Foundation",
  "Drywall / Insulation",
  "Windows & Doors",
  "Painting & Finishing",
  "Fire Protection",
  "General Contracting",
  "Materials & Supply",
  "Other",
];

// ── Project type options ──────────────────────────────────────────────────────

const PROJECT_TYPE_OPTIONS = [
  "Single Family",
  "Multi-Family",
  "Commercial",
  "Industrial",
  "Institutional",
  "Mixed Use",
  "Renovations / Retrofit",
  "Any / All",
];

// ── Location suggestions (quick-start only — not exhaustive) ─────────────────

const LOCATION_SUGGESTIONS = [
  "Kelowna", "Vancouver", "Calgary", "Edmonton",
  "Victoria", "Kamloops", "Surrey", "Burnaby",
];

// ── Wizard steps ──────────────────────────────────────────────────────────────

const STEPS: SetupStep[] = ["what_you_sell", "where_you_operate", "project_types"];

const STEP_INDEX: Record<SetupStep, number> = {
  what_you_sell:    0,
  where_you_operate: 1,
  project_types:    2,
  whatsapp:         3,
  contacts:         4,
  email:            5,
};

// ── Selection chip ────────────────────────────────────────────────────────────

function SelectionChip({
  label,
  selected,
  onClick,
  index = 0,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  index?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="pressable chip transition-all duration-150 animate-fade-up"
      style={{
        animationDelay: `${index * 30}ms`,
        ...(selected
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
            }),
      }}
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

// ── Location tag ──────────────────────────────────────────────────────────────

function LocationTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium animate-scale-in"
      style={{
        background: "rgba(0,200,117,0.12)",
        border: "1px solid rgba(0,200,117,0.25)",
        color: "#34D399",
      }}
    >
      {label}
      <button
        onClick={onRemove}
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: 14, height: 14, color: "#34D399", opacity: 0.7 }}
      >
        <X size={10} strokeWidth={2.5} />
      </button>
    </span>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

function SetupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPrefilled = searchParams.get("prefilled") === "true";
  const {
    setup,
    setSetupStep,
    completeSetup,
    toggleWhatISell,
    toggleWhereIOperate,
    toggleProjectType,
    startAgent,
    setActiveIntent,
  } = useAppStore();

  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherTrade, setOtherTrade] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [locationError, setLocationError] = useState("");
  const locationInputRef = useRef<HTMLInputElement>(null);

  const currentIndex =
    STEP_INDEX[setup.currentStep] < STEPS.length
      ? STEP_INDEX[setup.currentStep]
      : 0;

  // When "Other" is selected, show the text input
  useEffect(() => {
    if (setup.whatISell.includes("Other")) {
      setShowOtherInput(true);
    } else {
      setShowOtherInput(false);
      setOtherTrade("");
    }
  }, [setup.whatISell]);

  const addLocation = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    // Already added
    if (setup.whereIOperate.map((l) => l.toLowerCase()).includes(trimmed.toLowerCase())) {
      setLocationError("Already added");
      setTimeout(() => setLocationError(""), 1800);
      setLocationInput("");
      return;
    }
    toggleWhereIOperate(trimmed);
    setLocationInput("");
    setLocationError("");
  };

  const handleLocationKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLocation(locationInput);
    }
    if (e.key === "Backspace" && !locationInput && setup.whereIOperate.length > 0) {
      // Remove last tag on backspace
      toggleWhereIOperate(setup.whereIOperate[setup.whereIOperate.length - 1]);
    }
  };

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      setSetupStep(STEPS[currentIndex + 1]);
    } else {
      const wasAlreadyCompleted = setup.completed;
      completeSetup();
      setActiveIntent(
        `${setup.whatISell.join(", ")} in ${setup.whereIOperate.join(", ")}${setup.projectTypes.length > 0 ? ` — ${setup.projectTypes.join(", ")}` : ""}`
      );
      if (wasAlreadyCompleted) {
        // Editing existing config — just save and return to profile
        router.push("/profile");
      } else {
        // First time setup — run Scout
        startAgent();
        router.push("/working");
      }
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setSetupStep(STEPS[currentIndex - 1]);
    } else {
      router.back();
    }
  };

  // Step 1 valid: at least one trade, and if "Other" selected, they've typed something
  const step1Valid =
    setup.whatISell.length > 0 &&
    (!setup.whatISell.includes("Other") || otherTrade.trim().length > 0);

  // Step 2 valid: at least one location added
  const step2Valid = setup.whereIOperate.length > 0;

  // Step 3 valid: at least one project type selected
  const step3Valid = setup.projectTypes.length > 0;

  const canProceed =
    setup.currentStep === "what_you_sell"
      ? step1Valid
      : setup.currentStep === "where_you_operate"
      ? step2Valid
      : step3Valid;

  const isFinalStep = currentIndex === STEPS.length - 1;

  // Suggestions not already added
  const unusedSuggestions = LOCATION_SUGGESTIONS.filter(
    (s) =>
      !setup.whereIOperate
        .map((l) => l.toLowerCase())
        .includes(s.toLowerCase())
  );

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

        {/* Progress track */}
        <div className="flex-1 flex items-center mr-4">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center" style={{ flex: i === currentIndex ? "1.8" : "1" }}>
              {i > 0 && (
                <div style={{ width: 1, height: 8, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
              )}
              <div
                className="transition-all duration-500"
                style={{
                  flex: 1,
                  height: 3,
                  background:
                    i < currentIndex
                      ? "rgba(0,200,117,0.5)"
                      : i === currentIndex
                      ? "#00C875"
                      : "rgba(255,255,255,0.07)",
                }}
              />
            </div>
          ))}
        </div>

        <span
          className="text-[12px] font-semibold flex-shrink-0"
          style={{ color: "#52525B" }}
        >
          {currentIndex === 0 ? "Step 1 of 3 · 20 sec" : currentIndex === 1 ? "Step 2 of 3" : "Step 3 of 3"}
        </span>
      </header>

      {/* ── Step content ────────────────────────────────────────────── */}
      <main
        key={setup.currentStep}
        className="relative z-10 px-5 pt-8 pb-6 flex flex-col flex-1 animate-fade-up"
      >

        {/* ── Pre-filled banner ── */}
        {isPrefilled && setup.currentStep === "what_you_sell" && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-5 animate-fade-up"
            style={{
              background: "rgba(0,200,117,0.08)",
              border: "1px solid rgba(0,200,117,0.2)",
            }}
          >
            <Sparkles size={13} style={{ color: "#00C875", flexShrink: 0 }} />
            <p className="text-[12px]" style={{ color: "#34D399" }}>
              Scout understood your profile — review and confirm
            </p>
          </div>
        )}

        {/* ── Step 1: What do you sell ── */}
        {setup.currentStep === "what_you_sell" && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>
              Scout is setting up your market scan
            </p>
            <h2
              className="text-[28px] font-bold leading-tight mb-1"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              What do you sell?
            </h2>
            <p className="text-[14px] mb-2" style={{ color: "#52525B" }}>
              Scout will scan 40+ permit portals for projects that need exactly what you provide.
            </p>

            {/* Selected count */}
            {setup.whatISell.length > 0 && (
              <p
                className="text-[12px] font-semibold mb-5 animate-fade-in"
                style={{ color: "#00C875" }}
              >
                {setup.whatISell.length} selected
              </p>
            )}
            {setup.whatISell.length === 0 && <div className="mb-5" />}

            <div className="flex flex-wrap gap-2">
              {TRADE_OPTIONS.map((opt, i) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={setup.whatISell.includes(opt)}
                  onClick={() => toggleWhatISell(opt)}
                  index={i}
                />
              ))}
            </div>

            {/* "Other" free-text input */}
            {showOtherInput && (
              <div className="mt-4 animate-fade-up">
                <p className="text-[12px] mb-2" style={{ color: "#71717A" }}>
                  What do you sell?
                </p>
                <input
                  autoFocus
                  type="text"
                  value={otherTrade}
                  onChange={(e) => setOtherTrade(e.target.value)}
                  placeholder="e.g. Spray foam, Elevators, Landscaping"
                  className="w-full px-4 py-3 rounded-xl text-[14px]"
                  style={{
                    background: "#1C1C22",
                    border: "1px solid rgba(0,200,117,0.3)",
                    color: "#F4F4F5",
                    outline: "none",
                    caretColor: "#00C875",
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* ── Step 3: Project types ── */}
        {setup.currentStep === "project_types" && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>
              Almost there — Scout is nearly ready
            </p>
            <h2
              className="text-[28px] font-bold leading-tight mb-1"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              What type of projects?
            </h2>
            <p className="text-[14px] mb-2" style={{ color: "#52525B" }}>
              Scout will filter out irrelevant results so every opportunity you see is worth chasing.
            </p>

            {setup.projectTypes.length > 0 && (
              <p
                className="text-[12px] font-semibold mb-5 animate-fade-in"
                style={{ color: "#00C875" }}
              >
                {setup.projectTypes.length} selected
              </p>
            )}
            {setup.projectTypes.length === 0 && <div className="mb-5" />}

            <div className="flex flex-wrap gap-2">
              {PROJECT_TYPE_OPTIONS.map((opt, i) => (
                <SelectionChip
                  key={opt}
                  label={opt}
                  selected={setup.projectTypes.includes(opt)}
                  onClick={() => toggleProjectType(opt)}
                  index={i}
                />
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Where do you work ── */}
        {setup.currentStep === "where_you_operate" && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#3F3F46" }}>
              Scout is setting up your market scan
            </p>
            <h2
              className="text-[28px] font-bold leading-tight mb-1"
              style={{ letterSpacing: "-0.03em", color: "#F4F4F5" }}
            >
              Where do you work?
            </h2>
            <p className="text-[14px] mb-5" style={{ color: "#52525B" }}>
              Scout watches these markets daily and alerts you when new permits match your profile — before competitors find out.
            </p>

            {/* Tag input box */}
            <div
              className="rounded-2xl p-3 mb-4 transition-all duration-200"
              style={{
                background: "#1C1C22",
                border: `1px solid ${
                  locationError
                    ? "rgba(239,68,68,0.4)"
                    : setup.whereIOperate.length > 0
                    ? "rgba(0,200,117,0.3)"
                    : "rgba(255,255,255,0.09)"
                }`,
              }}
              onClick={() => locationInputRef.current?.focus()}
            >
              {/* Added tags */}
              <div className="flex flex-wrap gap-2 mb-2">
                {setup.whereIOperate.map((loc) => (
                  <LocationTag
                    key={loc}
                    label={loc}
                    onRemove={() => toggleWhereIOperate(loc)}
                  />
                ))}
              </div>

              {/* Input row */}
              <div className="flex items-center gap-2">
                <input
                  ref={locationInputRef}
                  type="text"
                  value={locationInput}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setLocationError("");
                  }}
                  onKeyDown={handleLocationKey}
                  placeholder={
                    setup.whereIOperate.length === 0
                      ? "e.g. Calgary, Phoenix, Ontario..."
                      : "Add another..."
                  }
                  className="flex-1 text-[14px] bg-transparent outline-none"
                  style={{
                    color: "#F4F4F5",
                    caretColor: "#00C875",
                  }}
                />
                {locationInput.trim() && (
                  <button
                    onClick={() => addLocation(locationInput)}
                    className="pressable flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-150"
                    style={{
                      width: 28,
                      height: 28,
                      background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
                    }}
                  >
                    <Plus size={14} color="white" strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {locationError && (
                <p
                  className="text-[11px] mt-1.5 animate-fade-in"
                  style={{ color: "#EF4444" }}
                >
                  {locationError}
                </p>
              )}
            </div>

            {/* Helper hint */}
            <p className="text-[11px] mb-5" style={{ color: "#3F3F46" }}>
              Press Enter or tap + to add · Backspace to remove last
            </p>

            {/* Quick-start suggestions */}
            {unusedSuggestions.length > 0 && (
              <>
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "#3F3F46" }}
                >
                  Quick add
                </p>
                <div className="flex flex-wrap gap-2">
                  {unusedSuggestions.map((city, i) => (
                    <button
                      key={city}
                      onClick={() => addLocation(city)}
                      className="pressable flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium animate-fade-up"
                      style={{
                        animationDelay: `${i * 25}ms`,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: "#71717A",
                      }}
                    >
                      <Plus size={10} strokeWidth={2.5} />
                      {city}
                    </button>
                  ))}
                </div>
              </>
            )}
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
                  background: "linear-gradient(135deg, #00C875 0%, #00A860 100%)",
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
          {isFinalStep ? "Start scouting my market" : "Next"}
          {canProceed && <ArrowRight size={16} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupPageInner />
    </Suspense>
  );
}
