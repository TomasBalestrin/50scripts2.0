"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasAccess } from "@/lib/plans/gate";
import { PLAN_LABELS } from "@/lib/constants";
import type { Plan } from "@/types/database";

interface LockedFeatureProps {
  children: React.ReactNode;
  requiredPlan: Plan;
  userPlan: Plan;
}

export function LockedFeature({
  children,
  requiredPlan,
  userPlan,
}: LockedFeatureProps) {
  if (hasAccess(userPlan, requiredPlan)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[6px] opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020617]/60 backdrop-blur-sm rounded-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#131B35] border border-[#1D4ED8]/20">
          <Lock className="h-5 w-5 text-[#1D4ED8]" />
        </div>
        <p className="text-sm text-[#94A3B8] text-center px-4">
          Recurso exclusivo do plano{" "}
          <span className="font-semibold text-white">
            {PLAN_LABELS[requiredPlan]}
          </span>
        </p>
        <Button
          size="sm"
          className="bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white text-xs"
          onClick={() => {
            // Navigate to upgrade page
            window.location.href = `/upgrade?plan=${requiredPlan}`;
          }}
        >
          Upgrade para {PLAN_LABELS[requiredPlan]}
        </Button>
      </div>
    </div>
  );
}
