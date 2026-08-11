import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  isLoading,
  isEmpty,
  children,
  className,
  height = 240,
}: {
  title: string;
  description?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  children: React.ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <Card className={cn("py-4", className)}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div style={{ height }}>
            <LoadingState />
          </div>
        ) : isEmpty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState icon={BarChart3} title="No data yet" description="Data will appear here once available." />
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
