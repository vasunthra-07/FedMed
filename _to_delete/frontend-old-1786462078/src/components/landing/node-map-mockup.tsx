import { cn } from "@/lib/utils";

const CENTER = { x: 150, y: 110 };
const SATELLITES = [
  { x: 55, y: 45, state: "connected" as const },
  { x: 245, y: 45, state: "connected" as const },
  { x: 40, y: 175, state: "connected" as const },
  { x: 260, y: 175, state: "syncing" as const },
  { x: 150, y: 15, state: "connected" as const },
];

/**
 * Illustrative federation topology graphic — a hub node plus connected
 * hospital nodes, some mid-sync. Purely decorative; not a live map of any
 * real deployment.
 */
export function NodeMapMockup({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5", className)}>
      <svg viewBox="0 0 300 210" className="w-full" role="img" aria-label="Illustrative diagram of federation nodes connected to a central coordinator">
        {SATELLITES.map((n, i) => (
          <line
            key={i}
            x1={CENTER.x}
            y1={CENTER.y}
            x2={n.x}
            y2={n.y}
            stroke="var(--border)"
            strokeWidth={1.5}
            strokeDasharray={n.state === "syncing" ? "4 3" : undefined}
          />
        ))}

        {SATELLITES.map((n, i) => (
          <g key={i}>
            <circle
              cx={n.x}
              cy={n.y}
              r={9}
              className={n.state === "connected" ? "fill-status-success" : "fill-status-warning"}
              opacity={0.15}
            />
            <circle
              cx={n.x}
              cy={n.y}
              r={5}
              className={cn(n.state === "connected" ? "fill-status-success" : "fill-status-warning", n.state === "syncing" && "animate-pulse")}
            />
          </g>
        ))}

        {/* Hub */}
        <circle cx={CENTER.x} cy={CENTER.y} r={16} className="fill-primary-soft" />
        <circle cx={CENTER.x} cy={CENTER.y} r={9} className="fill-primary" />
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" /> Coordinator
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-status-success" /> Connected node
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-status-warning" /> Syncing
        </span>
      </div>
    </div>
  );
}
