"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, ClipboardList, PauseCircle, Stethoscope } from "lucide-react";

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
import { useAllAlerts } from "@/lib/hooks/use-alerts";
import { groupBySeverity, severityRank, severityStripeClassRelative } from "@/lib/severity";
import { formatRelativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AlertRow } from "@/lib/api/alerts";

const NEEDS_ATTENTION_STATUSES = new Set([
  "pending_doctor_review",
  "doctor_review_in_progress",
  "modification_requested",
]);

const AGING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4h — a triage cutoff, not a clinical judgment
const ATTENTION_LIMIT = 8;

export default function DoctorDashboardPage() {
  const { data: prescriptions, isLoading } = usePrescriptions();
  const { data: alerts, isLoading: alertsLoading } = useAllAlerts();

  const allAlerts = alerts ?? [];
  const activeAlertCount = allAlerts.filter((a) => a.reviewStatus === "open" || a.reviewStatus === "acknowledged").length;

  // One-line issue summary per prescription — the highest-severity backend
  // alert already detected for it, never a locally invented description.
  const topIssueByRx = new Map<string, AlertRow>();
  for (const a of [...allAlerts].sort((x, y) => severityRank(x.severity) - severityRank(y.severity))) {
    if (!topIssueByRx.has(a.prescriptionId)) topIssueByRx.set(a.prescriptionId, a);
  }

  const lastUpdatedIso = (prescriptions ?? []).reduce<string | null>((latest, rx) => {
    if (!latest) return rx.updatedAt;
    return new Date(rx.updatedAt).getTime() > new Date(latest).getTime() ? rx.updatedAt : latest;
  }, null);

  const needsAttentionAll = (prescriptions ?? [])
    .filter((rx) => NEEDS_ATTENTION_STATUSES.has(rx.workflowStatus))
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  const needsAttention = needsAttentionAll.slice(0, ATTENTION_LIMIT);
  const attentionGroups = groupBySeverity(needsAttention, (rx) => rx.highestSeverity);

  const criticalCount = (prescriptions ?? []).filter((rx) => rx.highestSeverity === "critical").length;
  const onHoldCount = (prescriptions ?? []).filter((rx) => rx.workflowStatus === "on_hold").length;
  const pendingReviewCount = (prescriptions ?? []).filter((rx) => NEEDS_ATTENTION_STATUSES.has(rx.workflowStatus)).length;
  const approvedCount = (prescriptions ?? []).filter((rx) =>
    ["pending_pharmacist_review", "pharmacist_review_in_progress", "approved_for_dispensing", "dispensed"].includes(rx.workflowStatus)
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <PageHeader
          title="Doctor dashboard"
          description="What needs your attention right now, ranked by severity."
          actions={
            <Button asChild size="sm">
              <Link href="/doctor/prescriptions/new">New prescription</Link>
            </Button>
          }
        />
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-info opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-status-info" />
          </span>
          <span>{lastUpdatedIso ? `Updated ${formatRelativeTime(lastUpdatedIso)}` : "Live view"}</span>
          <span className="text-border">·</span>
          <span>
            {alertsLoading ? "Loading backend alerts…" : `${activeAlertCount} active backend alert${activeAlertCount !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pending your review"
          value={pendingReviewCount}
          icon={ClipboardList}
          tone="warning"
          hint="Awaiting your decision"
        />
        <StatCard
          label="Critical alerts active"
          value={criticalCount}
          icon={AlertTriangle}
          tone="danger"
          hint="Highest backend-detected severity"
        />
        <StatCard
          label="On hold (blocked)"
          value={onHoldCount}
          icon={PauseCircle}
          tone="danger"
          hint="Blocked pending action"
        />
        <StatCard
          label="Approved / in pharmacy"
          value={approvedCount}
          icon={Stethoscope}
          tone="success"
          hint="Moving through pharmacy review"
        />
      </div>

      {/* Triage board — severity-grouped, not a flat list */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Needs your attention</p>
            <p className="text-xs text-muted-foreground">Grouped by severity, oldest first within each group</p>
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
          <div className="flex flex-col gap-4 p-4">
            {attentionGroups.map((group) => (
              <div key={group.key}>
                <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label} · {group.items.length}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((rx) => {
                    const topIssue = topIssueByRx.get(rx.id);
                    const isAging = Date.now() - new Date(rx.updatedAt).getTime() > AGING_THRESHOLD_MS;
                    return (
                      <Link
                        key={rx.id}
                        href={`/prescriptions/${rx.id}/review`}
                        className={cn(
                          "group flex flex-wrap items-center justify-between gap-3 rounded-lg border border-transparent bg-background px-4 py-3 pl-5 transition-colors hover:border-border hover:bg-accent/40",
                          severityStripeClassRelative(rx.highestSeverity)
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              {rx.displayId} · {rx.patient.name}
                            </p>
                            <SeverityChip severity={rx.highestSeverity} size="sm" />
                            <StatusBadge status={rx.workflowStatus} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {topIssue
                              ? topIssue.shortTitle
                              : `${rx.medicationCount} medication${rx.medicationCount !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-xs",
                              isAging ? "font-medium text-status-warning" : "text-muted-foreground"
                            )}
                          >
                            {isAging && <Clock3 className="size-3" />}
                            {formatRelativeTime(rx.updatedAt)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                            Review <ArrowRight className="size-3.5" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {needsAttentionAll.length > ATTENTION_LIMIT && (
              <Link
                href="/doctor/alerts"
                className="px-1 text-center text-xs font-medium text-primary hover:underline"
              >
                {needsAttentionAll.length - ATTENTION_LIMIT} more waiting — view all alerts
              </Link>
            )}
          </div>
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
