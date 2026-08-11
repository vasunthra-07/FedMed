import Link from "next/link";
import { Bot, FileSearch2, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { MedicationSafetyCard } from "@/components/shared/medication-safety-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime, formatEnumLabel } from "@/lib/format";
import type { SafetyAnalysisResult } from "@/lib/types";

export function SafetyAnalysisReport({ result }: { result: SafetyAnalysisResult }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Medication safety analysis</CardTitle>
            <StatusBadge status={result.overallSafetyStatus} />
          </div>
          {result.agentTraceId && (
            <Link
              href={`/prescriptions/${result.prescriptionId}/trace`}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              <FileSearch2 className="size-3.5" />
              View agent trace
            </Link>
          )}
        </CardHeader>
        <CardContent className="pb-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Field label="Prescription">
              <span className="font-mono text-sm">{result.prescriptionDisplayId}</span>
            </Field>
            <Field label="Patient">
              <Link href={`/doctor/patients/${result.patientId}`} className="text-sm text-primary hover:underline">
                {result.patientName}
              </Link>
            </Field>
            <Field label="Prescriber">
              <span className="text-sm">{result.prescriberName}</span>
            </Field>
            <Field label="Workflow status">
              <StatusBadge status={result.workflowStatus} />
            </Field>
            <Field label="Issues detected">
              <span className="text-sm font-medium">{result.issueCount}</span>
            </Field>
            <Field label="Highest severity">
              <SeverityChip severity={result.highestSeverity} size="sm" />
            </Field>
            <Field label="Agent decision">
              <Badge variant="outline" className="gap-1 font-normal">
                <Bot className="size-3" />
                {formatEnumLabel(result.agentDecision)}
              </Badge>
            </Field>
            <Field label="Human review required">
              <Badge variant={result.humanReviewRequired ? "secondary" : "outline"} className="gap-1 font-normal">
                <Users className="size-3" />
                {result.humanReviewRequired ? "Yes" : "No"}
              </Badge>
            </Field>
            <Field label="Analysis timestamp" className="col-span-2 sm:col-span-2">
              <span className="text-sm text-muted-foreground">{formatDateTime(result.analysisTimestamp)}</span>
            </Field>
          </dl>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-sm font-semibold text-foreground">
          Detected issues {result.issues.length > 0 && `(${result.issues.length})`}
        </p>
        {result.issues.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No safety issues detected"
            description="The backend safety agents did not flag any issues for this prescription."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {result.issues.map((issue) => (
              <MedicationSafetyCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
