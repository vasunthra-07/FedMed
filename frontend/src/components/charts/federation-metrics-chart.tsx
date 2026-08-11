"use client";

import { CartesianGrid, Legend, Line, ResponsiveContainer, ComposedChart, Bar, Tooltip, XAxis, YAxis } from "recharts";
import { useFederationMetricsChart } from "@/lib/hooks/use-charts";
import { ChartCard } from "@/components/shared/chart-card";
import { CATEGORICAL_PALETTE, STATUS_BUCKET_COLORS } from "@/lib/chart-colors";

export function FederationMetricsChart() {
  const { data, isLoading } = useFederationMetricsChart();
  const chartData = (data ?? []).map((d) => ({ ...d, label: `Round ${d.round}` }));

  return (
    <ChartCard
      title="Federation metrics"
      description="Average node trust value and update acceptance by training round"
      isLoading={isLoading}
      isEmpty={chartData.length === 0}
      height={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tick={{ fontSize: 11 }} width={34} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="left" dataKey="acceptedUpdates" name="Accepted updates" fill={STATUS_BUCKET_COLORS.success} radius={[3, 3, 0, 0]} />
          <Bar yAxisId="left" dataKey="rejectedUpdates" name="Rejected updates" fill={STATUS_BUCKET_COLORS.danger} radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="avgTrustValue" name="Avg. trust value" stroke={CATEGORICAL_PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
