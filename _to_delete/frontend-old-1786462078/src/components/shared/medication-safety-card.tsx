import { Badge } from "@/components/ui/badge";
import { SeverityChip } from "@/components/shared/severity-chip";
import { RecommendationBlock } from "@/components/shared/recommendation-block";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { severityStripeClassRelative } from "@/lib/severity";
import { cn } from "@/lib/utils";
import type { SafetyIssue } from "@/lib/types";
import { Bot } from "lucide-react";

export function MedicationSafetyCard({
  issue,
  className,
  footer,
}: {
  issue: SafetyIssue;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 pl-5",
        severityStripeClassRelative(issue.severity),
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityChip severity={issue.severity} />
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {formatEnumLabel(issue.category)}
          </Badge>
        </div>
        <Badge variant="secondary" className="font-normal">
          {formatEnumLabel(issue.reviewStatus)}
        </Badge>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-foreground">{issue.shortTitle}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground/80">{issue.medicationLabel}</p>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{issue.clinicalExplanation}</p>

      <div className="mt-3">
        <RecommendationBlock action={issue.recommendedAction} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Bot className="size-3.5" />
          Detected by {issue.detectingAgent}
        </span>
        <span>{formatDateTime(issue.detectedAt)}</span>
      </div>

      {footer && <div className="mt-3 border-t pt-3">{footer}</div>}
    </div>
  );
}
