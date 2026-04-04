"use client";

import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import OpportunityDetailContent from "@/components/opportunities/OpportunityDetailContent";

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { opportunities } = useAppStore();

  const opp = opportunities.find((o) => o.id === params.id);

  if (!opp) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center" style={{ background: "#09090B" }}>
        <p style={{ color: "#52525B" }}>Opportunity not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-[14px] font-semibold pressable"
          style={{ color: "#00C875" }}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: "#09090B" }}>
      <div className="safe-top" />
      <OpportunityDetailContent
        opp={opp}
        onBack={() => router.back()}
        signInCallbackUrl={`/opportunities/${params.id}`}
      />
    </div>
  );
}
