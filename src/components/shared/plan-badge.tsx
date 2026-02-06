import { cn } from "@/lib/utils";
import type { Plan } from "@/types/database";
import { PLAN_LABELS } from "@/lib/constants";

interface PlanBadgeProps {
  plan: Plan;
  className?: string;
}

const planStyles: Record<Plan, string> = {
  starter: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  pro: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  premium: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  copilot: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        planStyles[plan],
        className
      )}
    >
      {PLAN_LABELS[plan]}
    </span>
  );
}
