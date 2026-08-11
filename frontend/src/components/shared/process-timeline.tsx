export interface ProcessTimelineStep {
  title: string;
  detail: string;
}

/**
 * Numbered step flow for a linear process (e.g. the prescription review
 * workflow). Purely presentational storytelling — not tied to backend data.
 * Renders as a horizontal, connected step row on wide screens and falls
 * back to a vertical timeline on narrow ones.
 */
export function ProcessTimeline({ steps, className }: { steps: ProcessTimelineStep[]; className?: string }) {
  return (
    <div className={className}>
      {/* Horizontal flow — lg and up */}
      <div className="relative hidden lg:flex lg:items-start">
        <div className="absolute top-3.5 right-6 left-6 h-px bg-border" aria-hidden />
        {steps.map((step, i) => (
          <div key={step.title} className="relative z-10 flex flex-1 flex-col items-center px-2 text-center">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
          </div>
        ))}
      </div>

      {/* Vertical fallback — below lg */}
      <ol className="flex flex-col lg:hidden">
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
    </div>
  );
}
