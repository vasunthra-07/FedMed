import { AGENT_TRACES, PRESCRIPTIONS, SAFETY_ISSUES } from "@/lib/mock/dataset";
import { simulateLatency, ApiError } from "./client";
import type { AgentTrace, SafetyAnalysisResult } from "@/lib/types";

export async function fetchSafetyAnalysis(prescriptionId: string): Promise<SafetyAnalysisResult> {
  const rx = PRESCRIPTIONS.find((p) => p.id === prescriptionId);
  if (!rx) throw new ApiError("Prescription not found", "not_found");
  const issues = SAFETY_ISSUES.filter((i) => i.prescriptionId === prescriptionId);
  const trace = AGENT_TRACES.find((t) => t.prescriptionId === prescriptionId);

  const overallSafetyStatus =
    issues.some((i) => i.severity === "critical")
      ? "critical_issues_detected"
      : issues.length > 0
      ? "issues_detected"
      : "clear";

  const result: SafetyAnalysisResult = {
    prescriptionId: rx.id,
    prescriptionDisplayId: rx.displayId,
    patientName: rx.patient.name,
    patientId: rx.patient.id,
    prescriberName: rx.prescriber.name,
    workflowStatus: rx.workflowStatus,
    overallSafetyStatus,
    issueCount: issues.length,
    highestSeverity: rx.highestSeverity,
    agentDecision: trace?.finalDecision ?? "auto_cleared",
    humanReviewRequired: issues.length > 0,
    analysisTimestamp: trace?.completedAt ?? rx.updatedAt,
    agentTraceId: trace?.id ?? "",
    issues,
  };
  return simulateLatency(result);
}

export async function fetchAgentTrace(prescriptionId: string): Promise<AgentTrace> {
  const trace = AGENT_TRACES.find((t) => t.prescriptionId === prescriptionId);
  if (!trace) throw new ApiError("Agent trace not found", "not_found");
  return simulateLatency(trace);
}
