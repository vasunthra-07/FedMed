import { ClipboardCheck } from "lucide-react";
import { formatEnumLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Displays a backend-provided recommended action only — never a
 * speculative/counterfactual statement. Always frames final approval as
 * belonging to the human reviewer (doctor or pharmacist), per MedX policy.
 */
export function RecommendationBlock({
  action,
  approverRole = "doctor or pharmacist",
  className,
}: {
  action: string;
  approverRole?: "doctor" | "pharmacist" | "doctor or pharmacist";
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2", className)}>
      <div className="flex items-start gap-2">
        <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm">
            <span className="text-muted-foreground">Backend recommendation: </span>
            <span className="font-medium text-foreground">{formatEnumLabel(action)}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Final approval remains with the {approverRole}. This is a suggestion, not an automated decision.
          </p>
        </div>
      </div>
    </div>
  );
}
