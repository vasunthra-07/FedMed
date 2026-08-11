import { makeRng } from "./random";
import {
  ALLERGY_POOL,
  DOCTOR_NAMES,
  DURATIONS,
  FREQUENCIES,
  HOSPITAL_NODES,
  INDICATIONS,
  MEDICATIONS,
  PATIENT_NAMES,
  PHARMACIST_NAMES,
  ROUTES,
} from "./pools";
import type {
  AgentDecision,
  AgentTrace,
  AuditEvent,
  AuditEventType,
  DoctorRef,
  FederationLogEntry,
  FederationNode,
  FederationOverview,
  Gender,
  Intervention,
  MedicationItem,
  NearMiss,
  Patient,
  PharmacistRef,
  PharmacyQueueItem,
  Prescription,
  PrescriptionWorkflowStatus,
  SafetyIssue,
  SeverityLevel,
} from "@/lib/types";

const rng = makeRng(1337);

const SEVERITY_ORDER: SeverityLevel[] = ["critical", "high", "moderate", "low"];
function highestOf(severities: SeverityLevel[]): SeverityLevel | null {
  for (const s of SEVERITY_ORDER) if (severities.includes(s)) return s;
  return severities[0] ?? null;
}

const DOCTORS: DoctorRef[] = DOCTOR_NAMES;
const PHARMACISTS: PharmacistRef[] = PHARMACIST_NAMES;

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

const patientSeed = PATIENT_NAMES.map((name, i) => {
  const gender: Gender = i % 3 === 0 ? "female" : i % 3 === 1 ? "male" : "other";
  return {
    id: `PT-${1000 + i}`,
    mrn: `MRN-${340000 + i * 7}`,
    name,
    age: rng.int(19, 88),
    gender,
    dateOfBirth: new Date(Date.now() - rng.int(19, 88) * 365 * 86400000).toISOString(),
    assignedDoctor: rng.pick(DOCTORS),
    knownAllergies: rng.bool(0.55) ? rng.pickMany(ALLERGY_POOL, rng.int(1, 2)) : ["None documented"],
    createdAt: rng.daysAgo(400, 40),
  };
});

// ---------------------------------------------------------------------------
// Prescriptions, safety issues, agent traces, audit trail
// ---------------------------------------------------------------------------

const WORKFLOW_STATES: PrescriptionWorkflowStatus[] = [
  "draft",
  "safety_analysis_in_progress",
  "pending_doctor_review",
  "doctor_review_in_progress",
  "modification_requested",
  "pharmacist_review_requested",
  "pending_pharmacist_review",
  "pharmacist_review_in_progress",
  "on_hold",
  "approved_for_dispensing",
  "dispensed",
  "dispensed",
  "dispensed",
  "cancelled",
];

const SAFETY_CATEGORIES = [
  "drug_interaction",
  "allergy_conflict",
  "contraindication",
  "duplicate_therapy",
  "dose_concern",
  "renal_hepatic_concern",
  "missing_information",
  "monitoring_requirement",
] as const;

const RECOMMENDED_ACTIONS = [
  "review_medication",
  "adjust_dosage",
  "increase_monitoring",
  "request_additional_information",
  "refer_to_pharmacist",
  "hold_prescription",
  "no_change_required",
] as const;

const DETECTING_AGENTS = [
  "Interaction Screening Agent",
  "Allergy Cross-Check Agent",
  "Renal Dosing Agent",
  "Duplicate Therapy Agent",
  "Monitoring Requirements Agent",
];

const ISSUE_TITLES: Record<string, string[]> = {
  drug_interaction: ["Potential interaction detected", "Moderate interaction with active medication", "Interaction flagged with anticoagulant"],
  allergy_conflict: ["Documented allergy conflict", "Cross-reactivity risk with known allergy"],
  contraindication: ["Contraindicated with existing condition", "Contraindication flagged"],
  duplicate_therapy: ["Overlapping therapy detected", "Duplicate drug class in active regimen"],
  dose_concern: ["Dose outside typical range", "Dose adjustment may be required"],
  renal_hepatic_concern: ["Renal function adjustment recommended", "Hepatic clearance concern"],
  missing_information: ["Missing lab values for safe dosing", "Indication not fully specified"],
  monitoring_requirement: ["Ongoing monitoring recommended", "Baseline monitoring required before start"],
};

function buildMedicationItems(prescriptionIndex: number): MedicationItem[] {
  const count = rng.int(1, 4);
  const items: MedicationItem[] = [];
  for (let j = 0; j < count; j++) {
    const med = rng.pick(MEDICATIONS);
    items.push({
      id: `MED-${prescriptionIndex}-${j}`,
      medicationName: med.name,
      strength: rng.pick(med.strengths),
      dosage: `${rng.int(1, 2)} tablet(s)`,
      route: rng.pick(ROUTES),
      frequency: rng.pick(FREQUENCIES),
      duration: rng.pick(DURATIONS),
      indication: rng.pick(INDICATIONS),
      specialInstructions: rng.bool(0.35) ? "Take with food. Avoid grapefruit juice." : undefined,
      startDate: rng.daysAgo(20, 0),
    });
  }
  return items;
}

function buildSafetyIssues(prescriptionId: string, medItems: MedicationItem[], n: number): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  for (let k = 0; k < n; k++) {
    const category = rng.pick(SAFETY_CATEGORIES);
    const severity = rng.pick(["critical", "high", "moderate", "low"] as const);
    const med = rng.pick(medItems);
    const secondMed = medItems.length > 1 ? rng.pick(medItems.filter((m) => m.id !== med.id)) : null;
    issues.push({
      id: `ISSUE-${prescriptionId}-${k}`,
      prescriptionId,
      category,
      shortTitle: rng.pick(ISSUE_TITLES[category]),
      medicationLabel: secondMed ? `${med.medicationName} + ${secondMed.medicationName}` : med.medicationName,
      severity,
      clinicalExplanation:
        category === "drug_interaction"
          ? `Concurrent use of ${med.medicationName}${secondMed ? ` and ${secondMed.medicationName}` : ""} has a documented interaction profile. Backend analysis flagged this combination for reviewer attention.`
          : category === "allergy_conflict"
          ? `Patient has a documented allergy record that overlaps with ${med.medicationName}. Verify against the allergy list before proceeding.`
          : category === "dose_concern"
          ? `${med.medicationName} ${med.strength} at the prescribed frequency falls outside the typical reference range used by the dosing agent.`
          : `Backend agent flagged ${med.medicationName} under the "${category.replace(/_/g, " ")}" category. See recommended action for next step.`,
      recommendedAction: rng.pick(RECOMMENDED_ACTIONS),
      detectingAgent: rng.pick(DETECTING_AGENTS),
      reviewStatus: rng.pick(["open", "acknowledged", "action_taken", "resolved", "dismissed"] as const),
      detectedAt: rng.daysAgo(14, 0),
    });
  }
  return issues;
}

function buildAgentTrace(prescriptionId: string, issues: SafetyIssue[]): AgentTrace {
  const steps = [
    {
      id: `TRACE-${prescriptionId}-0`,
      agentName: "Intake Normalization Agent",
      action: "normalize_prescription_input",
      input: "Raw prescription payload received from doctor review form",
      output: "Structured medication list validated and normalized",
      confidence: 0.98,
      timestamp: rng.daysAgo(14, 0),
      durationMs: rng.int(80, 400),
    },
    {
      id: `TRACE-${prescriptionId}-1`,
      agentName: "Interaction Screening Agent",
      action: "screen_drug_interactions",
      input: "Normalized medication list + active medication history",
      output: issues.some((i) => i.category === "drug_interaction")
        ? "Interaction(s) identified — routed to reviewer"
        : "No interactions above threshold identified",
      confidence: 0.91,
      timestamp: rng.daysAgo(14, 0),
      durationMs: rng.int(120, 600),
    },
    {
      id: `TRACE-${prescriptionId}-2`,
      agentName: "Allergy Cross-Check Agent",
      action: "cross_check_allergies",
      input: "Medication list + documented allergy record",
      output: issues.some((i) => i.category === "allergy_conflict")
        ? "Allergy conflict identified — routed to reviewer"
        : "No allergy conflicts identified",
      confidence: 0.95,
      timestamp: rng.daysAgo(14, 0),
      durationMs: rng.int(60, 300),
    },
    {
      id: `TRACE-${prescriptionId}-3`,
      agentName: "Aggregation Agent",
      action: "aggregate_findings",
      input: `${issues.length} candidate finding(s) from upstream agents`,
      output: `Final decision computed from ${issues.length} finding(s)`,
      confidence: 0.89,
      timestamp: rng.daysAgo(14, 0),
      durationMs: rng.int(40, 150),
    },
  ];
  const finalDecision: AgentDecision = issues.some((i) => i.severity === "critical")
    ? "blocked"
    : issues.length > 0
    ? "flagged_for_review"
    : "auto_cleared";
  return {
    id: `TRACE-${prescriptionId}`,
    prescriptionId,
    startedAt: steps[0].timestamp,
    completedAt: steps[steps.length - 1].timestamp,
    finalDecision,
    steps,
  };
}

const AUDIT_SEQUENCE_BY_STATUS: Record<string, AuditEventType[]> = {
  draft: ["prescription_created"],
  safety_analysis_in_progress: ["prescription_created", "safety_analysis_started"],
  pending_doctor_review: ["prescription_created", "safety_analysis_started", "safety_analysis_completed"],
  doctor_review_in_progress: ["prescription_created", "safety_analysis_started", "safety_analysis_completed", "doctor_review_started"],
  modification_requested: ["prescription_created", "safety_analysis_started", "safety_analysis_completed", "doctor_review_started", "prescription_modified"],
  pharmacist_review_requested: ["prescription_created", "safety_analysis_started", "safety_analysis_completed", "doctor_review_started", "pharmacist_review_requested"],
  pending_pharmacist_review: ["prescription_created", "safety_analysis_started", "safety_analysis_completed", "doctor_review_started", "recommendation_accepted", "prescription_approved"],
  pharmacist_review_in_progress: ["prescription_created", "safety_analysis_started", "safety_analysis_completed", "doctor_review_started", "prescription_approved", "pharmacy_review_started"],
  on_hold: ["prescription_created", "safety_analysis_completed", "doctor_review_started", "prescription_approved", "pharmacy_review_started", "prescription_held"],
  approved_for_dispensing: ["prescription_created", "safety_analysis_completed", "doctor_review_started", "prescription_approved", "pharmacy_review_started", "clinical_justification_added"],
  dispensed: ["prescription_created", "safety_analysis_completed", "doctor_review_started", "prescription_approved", "pharmacy_review_started", "prescription_dispensed"],
  cancelled: ["prescription_created", "safety_analysis_completed", "doctor_review_started", "prescription_cancelled"],
};

const ACTOR_FOR_EVENT: Record<string, "doctor" | "pharmacist" | "agent" | "system"> = {
  prescription_created: "doctor",
  safety_analysis_started: "agent",
  safety_analysis_completed: "agent",
  doctor_review_started: "doctor",
  recommendation_accepted: "doctor",
  prescription_modified: "doctor",
  pharmacist_review_requested: "doctor",
  clinical_justification_added: "doctor",
  prescription_approved: "doctor",
  pharmacy_review_started: "pharmacist",
  prescription_held: "pharmacist",
  modification_requested: "pharmacist",
  hold_released: "pharmacist",
  prescription_dispensed: "pharmacist",
  intervention_recorded: "pharmacist",
  near_miss_recorded: "pharmacist",
  prescription_cancelled: "doctor",
  prescription_rejected: "pharmacist",
};

const EVENT_SUMMARY: Record<string, string> = {
  prescription_created: "Prescription drafted",
  safety_analysis_started: "Automated safety analysis started",
  safety_analysis_completed: "Automated safety analysis completed",
  doctor_review_started: "Doctor opened prescription for review",
  recommendation_accepted: "Doctor accepted agent recommendation",
  prescription_modified: "Prescription modified by doctor",
  pharmacist_review_requested: "Doctor requested pharmacist review",
  clinical_justification_added: "Clinical justification added",
  prescription_approved: "Prescription approved by doctor",
  pharmacy_review_started: "Pharmacist opened prescription for review",
  prescription_held: "Prescription placed on hold",
  modification_requested: "Pharmacist requested modification",
  hold_released: "Hold released",
  prescription_dispensed: "Prescription marked as dispensed",
  intervention_recorded: "Pharmacist intervention recorded",
  near_miss_recorded: "Near miss recorded",
  prescription_cancelled: "Prescription cancelled",
  prescription_rejected: "Prescription rejected",
};

type BuiltPrescription = {
  prescription: Prescription;
  issues: SafetyIssue[];
  trace: AgentTrace;
  auditEvents: AuditEvent[];
};

function buildPrescriptions(): BuiltPrescription[] {
  const out: BuiltPrescription[] = [];
  let counter = 0;
  patientSeed.forEach((patient) => {
    const numRx = rng.int(1, 3);
    for (let r = 0; r < numRx; r++) {
      counter += 1;
      const id = `rx-${counter}`;
      const displayId = `RX-${204000 + counter}`;
      const status = rng.pick(WORKFLOW_STATES);
      const medItems = buildMedicationItems(counter);
      const issueCount = status === "draft" ? 0 : rng.int(0, 3);
      const issues = buildSafetyIssues(id, medItems, issueCount);
      const trace = buildAgentTrace(id, issues);
      const createdAt = rng.daysAgo(30, 1);
      const updatedAt = rng.daysAgo(1, 0);

      const sequence = AUDIT_SEQUENCE_BY_STATUS[status] ?? ["prescription_created"];
      const auditEvents: AuditEvent[] = sequence.map((evt, i) => ({
        id: `AUDIT-${id}-${i}`,
        prescriptionId: id,
        prescriptionDisplayId: displayId,
        eventType: evt,
        actorType: ACTOR_FOR_EVENT[evt] ?? "system",
        actorName:
          ACTOR_FOR_EVENT[evt] === "doctor"
            ? patient.assignedDoctor.name
            : ACTOR_FOR_EVENT[evt] === "pharmacist"
            ? rng.pick(PHARMACISTS).name
            : ACTOR_FOR_EVENT[evt] === "agent"
            ? "MedX Safety Agent Pipeline"
            : "System",
        summary: EVENT_SUMMARY[evt] ?? evt,
        resultingStatus: status,
        timestamp: rng.daysAgo(29 - i * 2, 0),
      }));

      const prescription: Prescription = {
        id,
        displayId,
        patient: { id: patient.id, name: patient.name, mrn: patient.mrn, age: patient.age, gender: patient.gender },
        prescriber: patient.assignedDoctor,
        medicationItems: medItems,
        knownAllergies: patient.knownAllergies,
        clinicalNotes: rng.bool(0.4) ? "Patient tolerating current regimen well. Reassess at next visit." : undefined,
        workflowStatus: status,
        medicationCount: medItems.length,
        highestSeverity: highestOf(issues.map((i) => i.severity)),
        assignedReviewer:
          status.startsWith("pharmacist") || status === "on_hold" || status === "approved_for_dispensing" || status === "dispensed"
            ? rng.pick(PHARMACISTS)
            : status.startsWith("doctor")
            ? patient.assignedDoctor
            : null,
        createdAt,
        updatedAt,
      };

      out.push({ prescription, issues, trace, auditEvents });
    }
  });
  return out;
}

const BUILT = buildPrescriptions();

export const PATIENTS: Patient[] = patientSeed.map((p) => {
  const rx = BUILT.filter((b) => b.prescription.patient.id === p.id);
  const activeRx = rx.filter((b) => !["dispensed", "cancelled", "rejected"].includes(b.prescription.workflowStatus));
  const allIssues = rx.flatMap((b) => b.issues);
  const openIssues = allIssues.filter((i) => i.reviewStatus === "open" || i.reviewStatus === "acknowledged");
  const latest = [...rx].sort((a, b) => (a.prescription.updatedAt < b.prescription.updatedAt ? 1 : -1))[0];
  return {
    id: p.id,
    mrn: p.mrn,
    name: p.name,
    age: p.age,
    gender: p.gender,
    dateOfBirth: p.dateOfBirth,
    assignedDoctor: p.assignedDoctor,
    knownAllergies: p.knownAllergies,
    activePrescriptionCount: activeRx.length,
    activeMedicationAlertCount: openIssues.length,
    highestAlertSeverity: highestOf(openIssues.map((i) => i.severity)),
    latestPrescriptionStatus: latest ? latest.prescription.workflowStatus : "no_active_prescription",
    lastReviewedAt: latest ? latest.prescription.updatedAt : null,
    createdAt: p.createdAt,
  };
});

export const PRESCRIPTIONS: Prescription[] = BUILT.map((b) => b.prescription);
export const SAFETY_ISSUES: SafetyIssue[] = BUILT.flatMap((b) => b.issues);
export const AGENT_TRACES: AgentTrace[] = BUILT.map((b) => b.trace);
export const AUDIT_EVENTS: AuditEvent[] = BUILT.flatMap((b) => b.auditEvents);
export const DOCTORS_LIST = DOCTORS;
export const PHARMACISTS_LIST = PHARMACISTS;

// ---------------------------------------------------------------------------
// Pharmacy queue, interventions, near misses
// ---------------------------------------------------------------------------

const QUEUE_ELIGIBLE_STATUSES: PrescriptionWorkflowStatus[] = [
  "pending_pharmacist_review",
  "pharmacist_review_in_progress",
  "on_hold",
  "modification_requested",
  "approved_for_dispensing",
  "dispensed",
];

export const PHARMACY_QUEUE: PharmacyQueueItem[] = BUILT.filter((b) =>
  QUEUE_ELIGIBLE_STATUSES.includes(b.prescription.workflowStatus)
).map((b, i) => {
  const rx = b.prescription;
  const reviewStatus =
    rx.workflowStatus === "dispensed"
      ? "dispensed"
      : rx.workflowStatus === "approved_for_dispensing"
      ? "approved"
      : rx.workflowStatus === "on_hold"
      ? "on_hold"
      : rx.workflowStatus === "modification_requested"
      ? "modification_requested"
      : rx.workflowStatus === "pharmacist_review_in_progress"
      ? "in_review"
      : "queued";
  return {
    queueId: `Q-${5000 + i}`,
    prescriptionId: rx.id,
    prescriptionDisplayId: rx.displayId,
    patient: rx.patient,
    prescriber: rx.prescriber,
    highestSeverity: rx.highestSeverity,
    reviewStatus,
    holdStatus: rx.workflowStatus === "on_hold" ? "on_hold" : "none",
    holdReason:
      rx.workflowStatus === "on_hold"
        ? rng.pick([
            "Awaiting prescriber clarification on renal dosing",
            "Pending updated lab values",
            "Allergy conflict requires prescriber confirmation",
            "Duplicate therapy needs prescriber resolution",
          ])
        : null,
    assignedPharmacist: (rx.assignedReviewer as PharmacistRef) ?? rng.pick(PHARMACISTS),
    queuedAt: rng.daysAgo(6, 0),
  };
});

const INTERVENTION_TYPES = [
  "dose_correction",
  "drug_substitution_suggested",
  "prescriber_contacted",
  "allergy_flag_resolved",
  "monitoring_added",
  "prescription_held",
] as const;
const INTERVENTION_OUTCOMES = [
  "accepted_by_prescriber",
  "rejected_by_prescriber",
  "prescription_modified",
  "prescription_cancelled",
  "pending",
] as const;

export const INTERVENTIONS: Intervention[] = rng.pickMany(BUILT, Math.min(16, BUILT.length)).map((b, i) => ({
  id: `INT-${3000 + i}`,
  prescriptionId: b.prescription.id,
  prescriptionDisplayId: b.prescription.displayId,
  patient: b.prescription.patient,
  medicationLabel: rng.pick(b.prescription.medicationItems).medicationName,
  interventionType: rng.pick(INTERVENTION_TYPES),
  outcome: rng.pick(INTERVENTION_OUTCOMES),
  pharmacist: rng.pick(PHARMACISTS),
  notes: "Discussed with prescribing physician; documented per pharmacy escalation protocol.",
  recordedAt: rng.daysAgo(21, 0),
}));

const NEAR_MISS_CATEGORIES = [
  "wrong_dose",
  "wrong_medication",
  "wrong_route",
  "drug_interaction_caught",
  "allergy_caught",
  "duplicate_therapy_caught",
  "documentation_error",
] as const;

export const NEAR_MISSES: NearMiss[] = rng.pickMany(BUILT, Math.min(13, BUILT.length)).map((b, i) => ({
  id: `nm-${i}`,
  displayId: `NM-${7000 + i}`,
  prescriptionId: b.prescription.id,
  prescriptionDisplayId: b.prescription.displayId,
  patient: b.prescription.patient,
  medicationLabel: rng.pick(b.prescription.medicationItems).medicationName,
  category: rng.pick(NEAR_MISS_CATEGORIES),
  severity: rng.pick(["critical", "high", "moderate", "low"]),
  detectedBy: rng.pick(PHARMACISTS).name,
  interventionTaken: rng.pick([
    "Order clarified with prescriber before dispensing",
    "Dose corrected prior to dispensing",
    "Alternate medication confirmed with prescriber",
    "Prescription held pending allergy confirmation",
  ]),
  outcome: rng.pick(INTERVENTION_OUTCOMES),
  notes: rng.bool(0.5) ? "Logged per near-miss reporting protocol; no patient harm occurred." : undefined,
  recordedAt: rng.daysAgo(45, 0),
}));

// ---------------------------------------------------------------------------
// Federation
// ---------------------------------------------------------------------------

export const FEDERATION_NODES: FederationNode[] = HOSPITAL_NODES.map((name, i) => {
  const status = rng.pick(["online", "online", "online", "syncing", "degraded", "offline"] as const);
  return {
    id: `NODE-${100 + i}`,
    hospitalName: name,
    nodeStatus: status,
    trustValue: Number((0.72 + rng.float() * 0.27).toFixed(3)),
    localTrainingStatus: status === "offline" ? "idle" : rng.pick(["training", "aggregating", "completed", "idle"] as const),
    updateStatus: status === "offline" ? "pending" : rng.pick(["submitted", "accepted", "pending"] as const),
    lastCommunicationAt: status === "offline" ? rng.daysAgo(5, 2) : rng.minutesAgo(180, 1),
    currentRound: rng.int(11, 14),
  };
});

export const FEDERATION_OVERVIEW: FederationOverview = {
  federationId: "FED-MEDX-01",
  currentRound: 14,
  totalRounds: 50,
  roundStatus: "aggregating",
  connectedNodeCount: FEDERATION_NODES.filter((n) => n.nodeStatus !== "offline").length,
  totalNodeCount: FEDERATION_NODES.length,
  lastAggregationAt: rng.minutesAgo(40, 5),
};

const FED_EVENTS = ["local_training_completed", "update_submitted", "update_accepted", "update_rejected", "node_reconnected", "aggregation_completed"];

export const FEDERATION_LOG: FederationLogEntry[] = Array.from({ length: 36 }, (_, i) => {
  const node = rng.pick(FEDERATION_NODES);
  const event = rng.pick(FED_EVENTS);
  return {
    id: `FLOG-${9000 + i}`,
    round: rng.int(9, 14),
    node: node.hospitalName,
    event,
    status: event === "update_rejected" ? "rejected" : "ok",
    trustValue: node.trustValue,
    detail:
      event === "update_rejected"
        ? "Update rejected by anomaly-detection gate (norm outside accepted range)."
        : event === "aggregation_completed"
        ? "Round aggregation completed via FedAvg."
        : undefined,
    timestamp: rng.daysAgo(10, 0),
  };
}).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
