import type { IsoDateTime, SeverityLevel } from "./common";

/** Known categories the backend detects. Render whatever string arrives. */
export type SafetyIssueCategory =
  | "drug_interaction"
  | "allergy_conflict"
  | "contraindication"
  | "duplicate_therapy"
  | "dose_concern"
  | "renal_hepatic_concern"
  | "missing_information"
  | "monitoring_requirement"
  | string;

export type SafetyIssueReviewStatus =
  | "open"
  | "acknowledged"
  | "action_taken"
  | "dismissed"
  | "resolved"
  | string;

/**
 * Backend-provided recommendation action. This list intentionally excludes
 * anything resembling a counterfactual claim ("switch to X and risk drops
 * by Y%") — MedX only ever displays the discrete action the backend chose.
 */
export type RecommendedAction =
  | "review_medication"
  | "adjust_dosage"
  | "increase_monitoring"
  | "request_additional_information"
  | "refer_to_pharmacist"
  | "hold_prescription"
  | "no_change_required"
  | string;

export type AgentDecision =
  | "auto_cleared"
  | "flagged_for_review"
  | "escalated"
  | "blocked"
  | string;

export interface SafetyIssue {
  id: string;
  prescriptionId: string;
  category: SafetyIssueCategory;
  shortTitle: string;
  medicationLabel: string;
  severity: SeverityLevel;
  clinicalExplanation: string;
  recommendedAction: RecommendedAction;
  detectingAgent: string;
  reviewStatus: SafetyIssueReviewStatus;
  detectedAt: IsoDateTime;
}

export interface SafetyAnalysisResult {
  prescriptionId: string;
  prescriptionDisplayId: string;
  patientName: string;
  patientId: string;
  prescriberName: string;
  workflowStatus: string;
  overallSafetyStatus: "clear" | "issues_detected" | "critical_issues_detected" | string;
  issueCount: number;
  highestSeverity: SeverityLevel | null;
  agentDecision: AgentDecision;
  humanReviewRequired: boolean;
  analysisTimestamp: IsoDateTime;
  agentTraceId: string;
  issues: SafetyIssue[];
}

export interface AgentTraceStep {
  id: string;
  agentName: string;
  action: string;
  input: string;
  output: string;
  confidence?: number | null;
  timestamp: IsoDateTime;
  durationMs?: number;
}

export interface AgentTrace {
  id: string;
  prescriptionId: string;
  startedAt: IsoDateTime;
  completedAt: IsoDateTime | null;
  finalDecision: AgentDecision;
  steps: AgentTraceStep[];
}
