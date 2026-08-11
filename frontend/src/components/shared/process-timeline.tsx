import { cn } from "@/lib/utils";

export interface ProcessTimelineStep {
  title: string;
  detail: string;
}

/**
 * Vertical numbered timeline for a linear process (e.g. the prescription
 * review workflow). Purely presentational storytelling — not tied to any
 * backend data.
 */
export function ProcessTimeline({ steps, className }: { steps: ProcessTimelineStep[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && (
            <span className="absolute top-7 left-3.5 h-[calc(100%-1.75rem)] w-px bg-border" aria-hidden />
          )}
          <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card text-xs font-semibold text-primary">
            {i + 1}
          </span>
          <div className="pt-0.5">
            <p className="text-sm font-medium text-foreground">{step.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
