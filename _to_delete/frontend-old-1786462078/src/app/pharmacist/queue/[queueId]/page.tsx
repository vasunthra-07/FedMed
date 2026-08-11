"use client";

import { use } from "react";
import Link from "next/link";
import { FileSearch2, History, ShieldAlert, PackageSearch } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SeverityChip } from "@/components/shared/severity-chip";
import { WorkflowActionPanel } from "@/components/shared/workflow-action-panel";
import { WorkflowTimeline } from "@/components/shared/workflow-timeline";
import { SafetyAnalysisReport } from "@/components/prescriptions/safety-analysis-report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueueItem } from "@/lib/hooks/use-pharmacy";
import { usePrescription, usePharmacistAction } from "@/lib/hooks/use-prescriptions";
import { useSafetyAnalysis } from "@/lib/hooks/use-safety";
import { useAuditTrail } from "@/lib/hooks/use-audit";
import { getPharmacistActions } from "@/lib/workflow/pharmacist-actions";
import { formatDate } from "@/lib/format";
import type { PharmacistActionKey } from "@/lib/api/prescriptions";

export default function PharmacyReviewPage({ params }: { params: Promise<{ queueId: string }> }) {
  const { queueId } = use(params);
  const { data: queueItem, isLoading: queueLoading } = useQueueItem(queueId);
  const { data: rx, isLoading: rxLoading } = usePrescription(queueItem?.prescriptionId);
  const { data: analysis, isLoading: analysisLoading } = useSafetyAnalysis(queueItem?.prescriptionId);
  const { data: auditEvents, isLoading: auditLoading } = useAuditTrail(queueItem?.prescriptionId);
  const pharmacistAction = usePharmacistAction();

  if (queueLoading || rxLoading) return <LoadingState label="Loading queue item…" />;
  if (!queueItem || !rx) return <EmptyState title="Queue item not found" />;

  const actions = getPharmacistActions(rx.workflowStatus);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Pharmacy review · ${rx.displayId}`}
        description={`${rx.patient.name} (${rx.patient.mrn}) · prescribed by ${rx.prescriber.name} on ${formatDate(rx.createdAt)}`}
        actions={<StatusBadge status={rx.workflowStatus} />}
      />

      {queueItem.holdStatus === "on_hold" && queueItem.holdReason && (
        <div className="flex items-start gap-2 rounded-lg border border-status-danger/25 bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">On hold</p>
            <p className="text-status-danger/90">{queueItem.holdReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <Tabs defaultValue="safety">
            <TabsList>
              <TabsTrigger value="safety">Safety review</TabsTrigger>
              <TabsTrigger value="medications">Medications ({rx.medicationItems.length})</TabsTrigger>
              <TabsTrigger value="history">Audit history</TabsTrigger>
            </TabsList>

            <TabsContent value="safety">
              {analysisLoading ? (
                <LoadingState />
              ) : !analysis ? (
                <EmptyState title="Safety analysis unavailable" />
              ) : (
                <SafetyAnalysisReport result={analysis} />
              )}
            </TabsContent>

            <TabsContent value="medications">
              <div className="flex flex-col gap-3">
                {rx.knownAllergies.length > 0 && (
                  <Card>
                    <CardContent className="flex flex-wrap items-center gap-2 pt-5 pb-5">
                      <span className="text-xs font-medium text-muted-foreground">Known allergies:</span>
                      {rx.knownAllergies.map((a) => (
                        <Badge key={a} variant="outline">
                          {a}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {rx.medicationItems.map((med, i) => (
                  <Card key={med.id}>
                    <CardHeader>
                      <CardTitle>
                        {i + 1}. {med.medicationName} {med.strength}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 pb-5 sm:grid-cols-4">
                      <MedField label="Dosage" value={med.dosage} />
                      <MedField label="Route" value={med.route} />
                      <MedField label="Frequency" value={med.frequency} />
                      <MedField label="Duration" value={med.duration} />
                      <MedField label="Indication" value={med.indication} className="col-span-2" />
                      <MedField label="Start date" value={formatDate(med.startDate)} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">
                    <History className="size-4" /> Workflow timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-5">
                  {auditLoading ? <LoadingState /> : <WorkflowTimeline events={auditEvents ?? []} />}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex flex-col gap-3 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">Highest severity</span>
            <SeverityChip severity={rx.highestSeverity} size="sm" />
          </div>
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
          <Link
            href={`/prescriptions/${rx.id}/trace`}
            className="flex items-center gap-1.5 rounded-lg border bg-card px-4 py-3 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <FileSearch2 className="size-3.5" /> View agent trace
          </Link>
          <Link
            href={`/pharmacist/interventions?prescriptionId=${rx.id}`}
            className="flex items-center gap-1.5 rounded-lg border bg-card px-4 py-3 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <PackageSearch className="size-3.5" /> Record intervention for this Rx
          </Link>
        </div>
      </div>
    </div>
  );
}

function MedField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}
