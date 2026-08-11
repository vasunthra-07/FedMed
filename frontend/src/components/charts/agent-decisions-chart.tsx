"use client";

import { useAgentDecisionsChart } from "@/lib/hooks/use-charts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatEnumLabel } from "@/lib/format";
import { statusBucket } from "@/lib/status";
import { STATUS_BUCKET_COLORS } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

const DOT: Record<string, string> = {
  danger: "bg-status-danger",
  warning: "bg-status-warning",
  success: "bg-status-success",
  info: "bg-status-info",
  neutral: "bg-status-neutral",
};
const TEXT: Record<string, string> = {
  danger: "text-status-danger",
  warning: "text-status-warning",
  success: "text-status-success",
  info: "text-status-info",
  neutral: "text-status-neutral",
};

/**
 * Insight-focused rather than decorative: a single proportion bar shows the
 * overall split at a glance, and the ranked list underneath gives exact
 * counts/percentages — reads as "what happened" rather than a generic bar
 * chart competing for attention with the two charts beside it.
 */
export function AgentDecisionsChart() {
  const { data, isLoading } = useAgentDecisionsChart();
  const rows = (data ?? []).slice().sort((a, b) => b.count - a.count);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <ChartCard
      title="Agent decisions"
      description="Final safety-agent decision across analyzed prescriptions"
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      height={200}
    >
      <div className="flex h-full flex-col justify-center gap-5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="Agent decision proportions">
          {rows.map((r) => {
            const bucket = statusBucket(r.decision);
            const pct = total > 0 ? (r.count / total) * 100 : 0;
            return (
              <div
                key={r.decision}
                style={{ width: `${pct}%`, backgroundColor: STATUS_BUCKET_COLORS[bucket] }}
                title={`${formatEnumLabel(r.decision)}: ${r.count}`}
              />
            );
          })}
        </div>

        <ul className="flex flex-col gap-2.5">
          {rows.map((r) => {
            const bucket = statusBucket(r.decision);
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.decision} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", DOT[bucket])} aria-hidden />
                  <span className="truncate text-foreground">{formatEnumLabel(r.decision)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  <span className={cn("font-semibold", TEXT[bucket])}>{r.count}</span> · {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </ChartCard>
  );
}
