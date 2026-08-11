"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWorkflowStatusChart } from "@/lib/hooks/use-charts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatEnumLabel } from "@/lib/format";
import { colorForIndex } from "@/lib/chart-colors";

export function WorkflowStatusChart() {
  const { data, isLoading } = useWorkflowStatusChart();
  const chartData = (data ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .map((d) => ({ ...d, label: formatEnumLabel(d.status) }));

  return (
    <ChartCard
      title="Prescription workflow status"
      description="Current distribution across all prescriptions"
      isLoading={isLoading}
      isEmpty={chartData.length === 0}
      height={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={140} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="count" name="Prescriptions" radius={[0, 4, 4, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={colorForIndex(i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
