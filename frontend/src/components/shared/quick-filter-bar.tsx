import { cn } from "@/lib/utils";

export interface QuickFilterOption {
  value: string;
  label: string;
  count?: number;
  tone?: "neutral" | "danger" | "warning" | "success" | "info";
}

const COUNT_TONE: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-status-danger-bg text-status-danger",
  warning: "bg-status-warning-bg text-status-warning",
  success: "bg-status-success-bg text-status-success",
  info: "bg-status-info-bg text-status-info",
};

/**
 * Always-visible (non-popover) single-select segmented control for fast
 * triage — sits above a table/list so the most common views are one click
 * away instead of buried in a filter popover. Calm neutral active state
 * (a raised pill on a muted track) with the count badge carrying the tone,
 * so the control itself never turns into a loud colored bar.
 */
export function QuickFilterBar({
  options,
  value,
  onChange,
  className,
}: {
  options: QuickFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Quick filters"
      className={cn("inline-flex flex-wrap items-center gap-0.5 rounded-lg border bg-muted/60 p-1", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  COUNT_TONE[opt.tone ?? "neutral"]
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
