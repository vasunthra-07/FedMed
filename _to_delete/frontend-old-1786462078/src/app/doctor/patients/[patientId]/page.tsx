"use client";

import { use } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarClock, FileClock, ShieldAlert, Stethoscope } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { MedicationSafetyCard } from "@/components/shared/medication-safety-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePatient, usePatientPrescriptions, usePatientSafetyIssues } from "@/lib/hooks/use-patients";
import { formatDate, formatDateTime } from "@/lib/format";

export default function PatientDetailsPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = use(params);
  const { data: patient, isLoading } = usePatient(patientId);
  const { data: prescriptions, isLoading: rxLoading } = usePatientPrescriptions(patientId);
  const { data: issues, isLoading: issuesLoading } = usePatientSafetyIssues(patientId);

  if (isLoading) return <LoadingState label="Loading patient…" />;
  if (!patient) return <EmptyState title="Patient not found" description="This patient record could not be located." />;

  const openIssues = (issues ?? []).filter((i) => i.reviewStatus === "open" || i.reviewStatus === "acknowledged");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={patient.name}
        description={`${patient.mrn} · ${patient.age} yrs · ${patient.gender}`}
        actions={
          <Button asChild size="sm">
            <Link href={`/doctor/prescriptions/new?patientId=${patient.id}`}>New prescription</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Patient summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pb-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Patient ID</p>
              <p className="mt-0.5 font-mono text-sm">{patient.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of birth</p>
              <p className="mt-0.5 text-sm">{formatDate(patient.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigned doctor</p>
              <p className="mt-0.5 text-sm">{patient.assignedDoctor.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active prescriptions</p>
              <p className="mt-0.5 text-sm">{patient.activePrescriptionCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active alerts</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-sm">{patient.activeMedicationAlertCount}</span>
                <SeverityChip severity={patient.highestAlertSeverity} size="sm" />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last reviewed</p>
              <p className="mt-0.5 text-sm">{formatDateTime(patient.lastReviewedAt)}</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-muted-foreground">Known allergies</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {patient.knownAllergies.map((a) => (
                  <Badge key={a} variant="outline">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pb-5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Stethoscope className="size-4" />
              <span>{patient.assignedDoctor.specialty}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldAlert className="size-4" />
              <span>{openIssues.length} open safety issue{openIssues.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="size-4" />
              <span>Latest status: <StatusBadge status={patient.latestPrescriptionStatus} className="ml-1" /></span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="prescriptions">
        <TabsList>
          <TabsTrigger value="prescriptions">Prescriptions ({prescriptions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="alerts">Safety alerts ({issues?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions">
          {rxLoading ? (
            <LoadingState />
          ) : !prescriptions?.length ? (
            <EmptyState title="No prescriptions yet" description="Prescriptions created for this patient will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {prescriptions.map((rx) => (
                <Link
                  key={rx.id}
                  href={`/prescriptions/${rx.id}/review`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {rx.displayId} · {rx.medicationCount} medication{rx.medicationCount !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prescribed by {rx.prescriber.name} · {formatDate(rx.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityChip severity={rx.highestSeverity} size="sm" />
                    <StatusBadge status={rx.workflowStatus} />
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts">
          {issuesLoading ? (
            <LoadingState />
          ) : !issues?.length ? (
            <EmptyState icon={AlertTriangle} title="No safety alerts" description="No medication safety issues have been detected for this patient." />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {issues.map((issue) => (
                <MedicationSafetyCard
                  key={issue.id}
                  issue={issue}
                  footer={
                    <Link
                      href={`/prescriptions/${issue.prescriptionId}/safety-analysis`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <FileClock className="size-3.5" /> View full safety analysis
                    </Link>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
