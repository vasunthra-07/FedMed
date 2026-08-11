"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { useAlertsOverTimeChart } from "@/lib/hooks/use-charts";
import { ChartCard } from "@/components/shared/chart-card";
import { SEVERITY_COLORS } from "@/lib/chart-colors";

export function AlertsOverTimeChart() {
  const { data, isLoading } = useAlertsOverTimeChart();
  const chartData = (data ?? []).map((d) => ({ ...d, label: format(new Date(d.date), "MMM d") }));
  const isEmpty = chartData.every((d) => d.critical + d.high + d.moderate + d.low === 0);

  return (
    <ChartCard
      title="Medication safety alerts over time"
      description="Backend-detected issues by severity, last 14 days"
      isLoading={isLoading}
      isEmpty={isEmpty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={1} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }}
            labelClassName="font-medium"
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" iconSize={8} />
          <Bar dataKey="critical" stackId="sev" name="Critical" fill={SEVERITY_COLORS.critical} radius={[0, 0, 0, 0]} />
          <Bar dataKey="high" stackId="sev" name="High" fill={SEVERITY_COLORS.high} />
          <Bar dataKey="moderate" stackId="sev" name="Moderate" fill={SEVERITY_COLORS.moderate} />
          <Bar dataKey="low" stackId="sev" name="Low" fill={SEVERITY_COLORS.low} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
