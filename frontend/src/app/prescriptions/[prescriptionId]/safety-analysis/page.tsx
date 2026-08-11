"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { SafetyAnalysisReport } from "@/components/prescriptions/safety-analysis-report";
import { useSafetyAnalysis } from "@/lib/hooks/use-safety";

export default function SafetyAnalysisPage({ params }: { params: Promise<{ prescriptionId: string }> }) {
  const { prescriptionId } = use(params);
  const { data: result, isLoading } = useSafetyAnalysis(prescriptionId);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Medication safety analysis"
        description="Backend-generated safety report — read-only."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/prescriptions/${prescriptionId}/review`}>
              <ArrowLeft className="size-4" /> Back to review
            </Link>
          </Button>
        }
      />
      {isLoading ? (
        <LoadingState />
      ) : !result ? (
        <EmptyState title="Analysis not found" />
      ) : (
        <SafetyAnalysisReport result={result} />
      )}
    </div>
  );
}
