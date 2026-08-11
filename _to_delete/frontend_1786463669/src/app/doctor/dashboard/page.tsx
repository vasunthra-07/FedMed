"use client";

import Link from "next/link";
import { AlertTriangle, ClipboardList, PauseCircle, Stethoscope } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { AlertsOverTimeChart } from "@/components/charts/alerts-over-time-chart";
import { WorkflowStatusChart } from "@/components/charts/workflow-status-chart";
import { AgentDecisionsChart } from "@/components/charts/agent-decisions-chart";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

const NEEDS_ATTENTION_STATUSES = new Set([
  "pending_doctor_review",
  "doctor_review_in_progress",
  "modification_requested",
]);

export default function DoctorDashboardPage() {
  const { data: prescriptions, isLoading } = usePrescriptions();

  const needsAttention = (prescriptions ?? [])
    .filter((rx) => NEEDS_ATTENTION_STATUSES.has(rx.workflowStatus))
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
      const sa = order[a.highestSeverity ?? ""] ?? 4;
      const sb = order[b.highestSeverity ?? ""] ?? 4;
      return sa - sb;
    });

  const criticalCount = (prescriptions ?? []).filter((rx) => rx.highestSeverity === "critical").length;
  const onHoldCount = (prescriptions ?? []).filter((rx) => rx.workflowStatus === "on_hold").length;
  const pendingReviewCount = (prescriptions ?? []).filter((rx) => NEEDS_ATTENTION_STATUSES.has(rx.workflowStatus)).length;
  const approvedCount = (prescriptions ?? []).filter((rx) =>
    ["pending_pharmacist_review", "pharmacist_review_in_progress", "approved_for_dispensing", "dispensed"].includes(rx.workflowStatus)
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doctor dashboard"
        description="What needs your attention right now, ranked by severity."
        actions={
          <Button asChild size="sm">
            <Link href="/doctor/prescriptions/new">New prescription</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending your review" value={pendingReviewCount} icon={ClipboardList} tone="warning" />
        <StatCard label="Critical alerts active" value={criticalCount} icon={AlertTriangle} tone="danger" />
        <StatCard label="On hold (blocked)" value={onHoldCount} icon={PauseCircle} tone="danger" />
        <StatCard label="Approved / in pharmacy" value={approvedCount} icon={Stethoscope} tone="success" />
      </div>

      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <p className="text-sm font-semibold">Needs your attention</p>
            <p className="text-xs text-muted-foreground">Sorted by highest detected severity</p>
          </div>
          <Link href="/doctor/alerts" className="text-xs font-medium text-primary hover:underline">
            View all alerts
          </Link>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : needsAttention.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nothing pending review"
            description="New prescriptions that finish safety analysis will show up here."
          />
        ) : (
          <ul className="divide-y">
            {needsAttention.slice(0, 8).map((rx) => (
              <li key={rx.id}>
                <Link
                  href={`/prescriptions/${rx.id}/review`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {rx.displayId} · {rx.patient.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rx.medicationCount} medication{rx.medicationCount !== 1 ? "s" : ""} · updated {formatRelativeTime(rx.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityChip severity={rx.highestSeverity} size="sm" />
                    <StatusBadge status={rx.workflowStatus} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AlertsOverTimeChart />
        <WorkflowStatusChart />
      </div>
      <AgentDecisionsChart />
    </div>
  );
}
