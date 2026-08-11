"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { useNearMissTrendsChart } from "@/lib/hooks/use-charts";
import { ChartCard } from "@/components/shared/chart-card";
import { CATEGORICAL_PALETTE } from "@/lib/chart-colors";

export function NearMissTrendsChart() {
  const { data, isLoading } = useNearMissTrendsChart();
  const chartData = (data ?? []).map((d) => ({ ...d, label: format(new Date(d.week), "MMM d") }));

  return (
    <ChartCard
      title="Near miss trends"
      description="Recorded near misses by week"
      isLoading={isLoading}
      isEmpty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Line type="monotone" dataKey="count" name="Near misses" stroke={CATEGORICAL_PALETTE[4]} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
