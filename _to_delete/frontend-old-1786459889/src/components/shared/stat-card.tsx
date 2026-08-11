import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: "neutral" | "danger" | "warning" | "success" | "info";
  hint?: string;
  className?: string;
}) {
  const toneStyles: Record<string, string> = {
    neutral: "text-foreground",
    danger: "text-status-danger",
    warning: "text-status-warning",
    success: "text-status-success",
    info: "text-status-info",
  };
  return (
    <Card className={cn("gap-2 py-4", className)}>
      <div className="flex items-center justify-between px-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </div>
      <div className="px-5">
        <p className={cn("text-2xl font-semibold tracking-tight", toneStyles[tone])}>{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}
