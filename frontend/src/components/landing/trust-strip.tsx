import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrustStripItem {
  icon: LucideIcon;
  label: string;
}

export function TrustStrip({ items, className }: { items: TrustStripItem[]; className?: string }) {
  return (
    <div className={cn("border-y bg-surface-alt", className)}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-8 lg:py-6">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-2.5 lg:justify-center lg:px-4",
              i > 0 && "lg:border-l lg:border-border"
            )}
          >
            <item.icon className="size-4 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
