import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small pill used to signal prototype/trust framing — "Prototype",
 * "No production data", "Role-based demo", etc. Purely presentational.
 */
export function TrustBadge({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {Icon && <Icon className="size-3.5 text-primary" />}
      {children}
    </span>
  );
}
