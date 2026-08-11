import { cn } from "@/lib/utils";

export interface QuickFilterOption {
  value: string;
  label: string;
  count?: number;
  tone?: "neutral" | "danger" | "warning" | "success" | "info";
}

const TONE_ACTIVE: Record<string, string> = {
  neutral: "bg-foreground text-background border-foreground",
  danger: "bg-status-danger text-white border-status-danger",
  warning: "bg-status-warning text-white border-status-warning",
  success: "bg-status-success text-white border-status-success",
  info: "bg-status-info text-white border-status-info",
};

/**
 * Always-visible (non-popover) single-select filter chips for fast triage —
 * sits above a table/list so the most common views are one click away
 * instead of buried in a filter popover.
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
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="tablist" aria-label="Quick filters">
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
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? TONE_ACTIVE[opt.tone ?? "neutral"]
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {opt.label}
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  active ? "bg-background/25" : "bg-muted"
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
