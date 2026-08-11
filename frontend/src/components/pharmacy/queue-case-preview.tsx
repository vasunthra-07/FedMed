"use client";

import Link from "next/link";
import { ArrowUpRight, FileSearch2, PackageSearch, ShieldAlert } from "lucide-react";

import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { WorkflowActionPanel } from "@/components/shared/workflow-action-panel";
import { MedicationSafetyCard } from "@/components/shared/medication-safety-card";
import { RecommendationBlock } from "@/components/shared/recommendation-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePrescription, usePharmacistAction } from "@/lib/hooks/use-prescriptions";
import { useSafetyAnalysis } from "@/lib/hooks/use-safety";
import { getPharmacistActions } from "@/lib/workflow/pharmacist-actions";
import { severityRank } from "@/lib/severity";
import { formatDate } from "@/lib/format";
import type { PharmacyQueueItem } from "@/lib/types";
import type { PharmacistActionKey } from "@/lib/api/prescriptions";

/**
 * Condensed case view for the queue split pane — enough to understand risk
 * and act without leaving the list. "Open full review" hands off to the
 * complete detail page (medications, full audit history) for deep dives.
 */
export function QueueCasePreview({ queueItem }: { queueItem: PharmacyQueueItem }) {
  const { data: rx, isLoading: rxLoading } = usePrescription(queueItem.prescriptionId);
  const { data: analysis, isLoading: analysisLoading } = useSafetyAnalysis(queueItem.prescriptionId);
  const pharmacistAction = usePharmacistAction();

  if (rxLoading) return <LoadingState label="Loading case…" className="h-full" />;
  if (!rx) return <EmptyState title="Case not found" className="h-full" />;

  const actions = getPharmacistActions(rx.workflowStatus);
  const sortedIssues = [...(analysis?.issues ?? [])].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  const topIssues = sortedIssues.slice(0, 3);
  const topRecommendation = sortedIssues[0];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 p-4">
        {/* Patient block */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{rx.displayId}</p>
            <h2 className="truncate text-base font-semibold text-foreground">{rx.patient.name}</h2>
            <p className="text-xs text-muted-foreground">
              {rx.patient.mrn} · prescribed by {rx.prescriber.name} on {formatDate(rx.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <SeverityChip severity={rx.highestSeverity} size="sm" />
            <StatusBadge status={rx.workflowStatus} />
          </div>
        </div>

        {/* Prescription metadata block */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3.5 py-2.5 text-xs">
          <span className="font-medium text-foreground">
            {rx.medicationCount} medication{rx.medicationCount !== 1 ? "s" : ""}
          </span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">
            {rx.knownAllergies.length > 0 ? `${rx.knownAllergies.length} known allergies` : "No known allergies noted"}
          </span>
          {rx.assignedReviewer && (
            <>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">Assigned to {rx.assignedReviewer.name}</span>
            </>
          )}
        </div>

        {queueItem.holdStatus === "on_hold" && queueItem.holdReason && (
          <div className="flex items-start gap-2 rounded-lg border border-status-danger/25 bg-status-danger-bg px-3 py-2.5 text-sm text-status-danger">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">On hold</p>
              <p className="text-status-danger/90">{queueItem.holdReason}</p>
            </div>
          </div>
        )}

        {/* Issue cards */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Top issues {analysis && `(${analysis.issues.length})`}
            </p>
            <Link
              href={`/prescriptions/${rx.id}/safety-analysis`}
              className="text-xs font-medium text-primary hover:underline"
            >
              View full analysis
            </Link>
          </div>
          {analysisLoading ? (
            <LoadingState />
          ) : !analysis || topIssues.length === 0 ? (
            <EmptyState title="No safety issues detected" />
          ) : (
            <div className="flex flex-col gap-3">
              {topIssues.map((issue) => (
                <MedicationSafetyCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>

        {/* Backend recommendation callout — the single top-priority suggestion, at a glance */}
        {topRecommendation && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Backend recommendation</p>
            <RecommendationBlock action={topRecommendation.recommendedAction} approverRole="pharmacist" />
          </div>
        )}

        {/* Workflow actions */}
        <WorkflowActionPanel
          title="Pharmacist actions"
          description="Actions available for the current workflow status."
          actions={actions}
          pending={pharmacistAction.isPending}
          onAction={(key, note) =>
            pharmacistAction.mutate({
              prescriptionId: rx.id,
              action: key as PharmacistActionKey,
              reason: note,
            })
          }
        />
      </div>

      {/* Secondary footer — audit / trace links */}
      <div className="mt-auto flex flex-wrap items-center gap-1 border-t bg-muted/30 px-4 py-2.5">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href={`/pharmacist/queue/${queueItem.queueId}`}>
            Open full review <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href={`/prescriptions/${rx.id}/trace`}>
            <FileSearch2 className="size-3.5" /> Agent trace
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href={`/pharmacist/interventions?prescriptionId=${rx.id}`}>
            <PackageSearch className="size-3.5" /> Record intervention
          </Link>
        </Button>
        {rx.assignedReviewer && (
          <Badge variant="outline" className="ml-auto hidden font-normal text-muted-foreground sm:inline-flex">
            Rx #{rx.displayId}
          </Badge>
        )}
      </div>
    </div>
  );
}
