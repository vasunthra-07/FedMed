import { InterfacePreviewMockup } from "@/components/shared/interface-preview-mockup";

const CALLOUTS = [
  { label: "Severity-first triage", position: "top-4 -right-4 lg:-right-10" },
  { label: "Human sign-off required", position: "bottom-16 -left-4 lg:-left-12" },
  { label: "Replayable audit trail", position: "bottom-4 -right-2 lg:-right-8" },
] as const;

/**
 * Hero product preview with floating annotation callouts. The callouts
 * collapse to a simple row under the frame on small screens, where there
 * isn't room to float them without overlapping.
 */
export function AnnotatedPreview() {
  return (
    <div className="w-full">
      <div className="relative mx-auto max-w-md lg:max-w-none">
        <InterfacePreviewMockup className="w-full" />
        {CALLOUTS.map((c) => (
          <span
            key={c.label}
            className={`absolute hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm lg:inline-flex ${c.position}`}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {c.label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 lg:hidden">
        {CALLOUTS.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-foreground"
          >
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
