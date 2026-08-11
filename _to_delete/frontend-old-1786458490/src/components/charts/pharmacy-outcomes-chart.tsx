"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { usePharmacyOutcomesChart } from "@/lib/hooks/use-charts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatEnumLabel } from "@/lib/format";
import { colorForIndex } from "@/lib/chart-colors";

export function PharmacyOutcomesChart() {
  const { data, isLoading } = usePharmacyOutcomesChart();
  const chartData = (data ?? []).map((d) => ({ ...d, label: formatEnumLabel(d.outcome) }));

  return (
    <ChartCard
      title="Pharmacy review outcomes"
      description="Current pharmacy queue by review status"
      isLoading={isLoading}
      isEmpty={chartData.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={colorForIndex(i)} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} layout="vertical" align="right" verticalAlign="middle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
