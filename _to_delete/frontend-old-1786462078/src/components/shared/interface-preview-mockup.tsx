import { AlertTriangle, ClipboardList, FileClock, Network, Stethoscope, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: Stethoscope, label: "Dashboard" },
  { icon: Users, label: "Patients" },
  { icon: ClipboardList, label: "Review queue" },
  { icon: AlertTriangle, label: "Safety alerts" },
  { icon: Network, label: "Federation" },
  { icon: FileClock, label: "Audit trail" },
];

const ROWS: { severity: "critical" | "high" | "moderate" | "low"; width: string }[] = [
  { severity: "critical", width: "w-4/5" },
  { severity: "high", width: "w-2/3" },
  { severity: "moderate", width: "w-3/4" },
  { severity: "low", width: "w-1/2" },
];

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-severity-critical",
  high: "bg-severity-high",
  moderate: "bg-severity-moderate",
  low: "bg-severity-low",
};

/**
 * A stylized, illustrative representation of the app UI — not a literal
 * screenshot. Built purely from placeholder bars/dots so it can't be
 * mistaken for real patient data, while still communicating the layout:
 * sidebar nav, quick-filter chips, and a severity-ranked case list.
 */
export function InterfacePreviewMockup({
  className,
  url = "medx.app/pharmacist/queue",
  activeLabel = "Review queue",
  hideSidebar = false,
}: {
  className?: string;
  url?: string;
  activeLabel?: string;
  hideSidebar?: boolean;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {/* Fake browser chrome */}
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
        <span className="size-2 rounded-full bg-severity-critical/50" />
        <span className="size-2 rounded-full bg-severity-moderate/50" />
        <span className="size-2 rounded-full bg-severity-low/50" />
        <span className="ml-2 truncate rounded-full bg-background px-2.5 py-0.5 text-[10px] text-muted-foreground">
          {url}
        </span>
      </div>

      <div className="flex">
        {/* Mini sidebar */}
        {!hideSidebar && (
          <div className="hidden w-28 shrink-0 flex-col gap-1 border-r bg-muted/20 p-2 sm:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.label === activeLabel;
              return (
                <div key={item.label} className={cn("flex items-center gap-1.5 rounded px-1.5 py-1", active ? "bg-secondary" : "")}>
                  <item.icon className={cn("size-3", active ? "text-secondary-foreground" : "text-muted-foreground")} />
                  <span className={cn("h-1.5 flex-1 rounded-full", active ? "bg-secondary-foreground/40" : "bg-muted-foreground/20")} />
                </div>
              );
            })}
          </div>
        )}

        {/* Mini content area */}
        <div className="flex-1 p-3">
          <div className="mb-2 h-2 w-24 rounded-full bg-foreground/15" />
          {/* Quick filter chips */}
          <div className="mb-3 flex gap-1.5">
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[9px] font-medium text-background">All</span>
            <span className="rounded-full border px-2 py-0.5 text-[9px] text-muted-foreground">Critical</span>
            <span className="rounded-full border px-2 py-0.5 text-[9px] text-muted-foreground">On hold</span>
          </div>
          {/* Mini case rows */}
          <div className="flex flex-col gap-1.5">
            {ROWS.map((row, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", SEVERITY_DOT[row.severity])} />
                <span className={cn("h-1.5 flex-1 rounded-full bg-muted-foreground/20", row.width)} />
                <span className="h-3 w-8 shrink-0 rounded-sm bg-muted-foreground/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
