"use client";

import * as React from "react";
import { Network, Radio, RefreshCw, Server } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingState } from "@/components/shared/loading-state";
import { DataTable } from "@/components/shared/data-table";
import { FacetedFilter } from "@/components/shared/faceted-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FederationMetricsChart } from "@/components/charts/federation-metrics-chart";
import { useFederationLog, useFederationNodes, useFederationOverview } from "@/lib/hooks/use-federation";
import { formatDateTime, formatEnumLabel, formatRelativeTime } from "@/lib/format";
import { federationLogColumns } from "./columns";
import type { ColumnFiltersState } from "@tanstack/react-table";

export default function FederationDashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useFederationOverview();
  const { data: nodes, isLoading: nodesLoading } = useFederationNodes();
  const { data: log, isLoading: logLoading } = useFederationLog();
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  function getFilterValue(id: string): string[] {
    return (columnFilters.find((f) => f.id === id)?.value as string[]) ?? [];
  }
  function setFilterValue(id: string, value: string[]) {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id);
      return value.length > 0 ? [...rest, { id, value }] : rest;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Federation dashboard"
        description="Cross-hospital federated training status. Trust values and statuses are shown exactly as reported by the backend."
      />

      {overviewLoading ? (
        <LoadingState />
      ) : overview ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Current round"
            value={`${overview.currentRound}${overview.totalRounds ? ` / ${overview.totalRounds}` : ""}`}
            icon={RefreshCw}
          />
          <StatCard label="Round status" value={formatEnumLabel(overview.roundStatus)} icon={Radio} tone="info" />
          <StatCard
            label="Connected nodes"
            value={`${overview.connectedNodeCount} / ${overview.totalNodeCount}`}
            icon={Server}
            tone={overview.connectedNodeCount === overview.totalNodeCount ? "success" : "warning"}
          />
          <StatCard label="Last aggregation" value={formatRelativeTime(overview.lastAggregationAt)} icon={Network} />
        </div>
      ) : null}

      <FederationMetricsChart />

      <div>
        <p className="mb-3 text-sm font-semibold">Connected hospital nodes</p>
        {nodesLoading ? (
          <LoadingState />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(nodes ?? []).map((node) => (
              <Card key={node.id}>
                <CardHeader>
                  <CardTitle className="text-sm">{node.hospitalName}</CardTitle>
                  <StatusBadge status={node.nodeStatus} />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-y-2 pb-5 text-sm">
                  <span className="text-xs text-muted-foreground">Trust value</span>
                  <span className="text-right font-mono">{node.trustValue}</span>
                  <span className="text-xs text-muted-foreground">Local training</span>
                  <span className="text-right">{formatEnumLabel(node.localTrainingStatus)}</span>
                  <span className="text-xs text-muted-foreground">Update status</span>
                  <span className="text-right">{formatEnumLabel(node.updateStatus)}</span>
                  <span className="text-xs text-muted-foreground">Current round</span>
                  <span className="text-right">{node.currentRound}</span>
                  <span className="text-xs text-muted-foreground">Last communication</span>
                  <span className="text-right" title={formatDateTime(node.lastCommunicationAt)}>
                    {formatRelativeTime(node.lastCommunicationAt)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold">Federation log</p>
        {logLoading ? (
          <LoadingState />
        ) : (
          <DataTable
            columns={federationLogColumns}
            data={log ?? []}
            searchPlaceholder="Search node, event…"
            searchColumnIds={["node", "event"]}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            initialSorting={[{ id: "timestamp", desc: true }]}
            pageSize={15}
            emptyTitle="No federation log entries"
            toolbar={
              <FacetedFilter
                title="Event"
                options={[
                  "local_training_completed",
                  "update_submitted",
                  "update_accepted",
                  "update_rejected",
                  "node_reconnected",
                  "aggregation_completed",
                ].map((v) => ({ label: v, value: v }))}
                selected={getFilterValue("event")}
                onChange={(v) => setFilterValue("event", v)}
              />
            }
          />
        )}
      </div>
    </div>
  );
}
