import { formatDateTime, formatEnumLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AuditEvent } from "@/lib/types";
import { Bot, Shield, Stethoscope, User } from "lucide-react";

const ACTOR_ICON: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  pharmacist: Shield,
  agent: Bot,
  system: User,
  admin: User,
};

export function WorkflowTimeline({ events, className }: { events: AuditEvent[]; className?: string }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>;
  }
  return (
    <ol className={cn("relative space-y-0", className)}>
      {events.map((event, i) => {
        const Icon = ACTOR_ICON[event.actorType] ?? User;
        const isLast = i === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && <span className="absolute top-7 left-[13px] h-[calc(100%-1.25rem)] w-px bg-border" aria-hidden />}
            <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
              <Icon className="size-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-medium text-foreground">{event.summary}</p>
                <time className="shrink-0 text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</time>
              </div>
              <p className="text-xs text-muted-foreground">
                {event.actorName} · {formatEnumLabel(event.actorType)}
              </p>
              {event.detail && <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
