import {
  AGENT_TRACES,
  FEDERATION_LOG,
  NEAR_MISSES,
  PHARMACY_QUEUE,
  PRESCRIPTIONS,
  SAFETY_ISSUES,
} from "@/lib/mock/dataset";
import { simulateLatency } from "./client";

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function lastNDays(n: number) {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export interface AlertsOverTimePoint {
  date: string;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

export async function fetchAlertsOverTime(): Promise<AlertsOverTimePoint[]> {
  const days = lastNDays(14);
  const points: AlertsOverTimePoint[] = days.map((date) => ({ date, critical: 0, high: 0, moderate: 0, low: 0 }));
  const idx = new Map(points.map((p, i) => [p.date, i]));
  for (const issue of SAFETY_ISSUES) {
    const key = dayKey(issue.detectedAt);
    const i = idx.get(key);
    if (i === undefined) continue;
    const sev = issue.severity as "critical" | "high" | "moderate" | "low";
    if (sev in points[i]) (points[i][sev] as number) += 1;
  }
  return simulateLatency(points, 200);
}

export interface WorkflowStatusPoint {
  status: string;
  count: number;
}

export async function fetchWorkflowStatusDistribution(): Promise<WorkflowStatusPoint[]> {
  const counts = new Map<string, number>();
  for (const rx of PRESCRIPTIONS) counts.set(rx.workflowStatus, (counts.get(rx.workflowStatus) ?? 0) + 1);
  const points = Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  return simulateLatency(points, 200);
}

export interface PharmacyOutcomePoint {
  outcome: string;
  count: number;
}

export async function fetchPharmacyReviewOutcomes(): Promise<PharmacyOutcomePoint[]> {
  const counts = new Map<string, number>();
  for (const q of PHARMACY_QUEUE) counts.set(q.reviewStatus, (counts.get(q.reviewStatus) ?? 0) + 1);
  const points = Array.from(counts.entries()).map(([outcome, count]) => ({ outcome, count }));
  return simulateLatency(points, 200);
}

export interface NearMissTrendPoint {
  week: string;
  count: number;
}

export async function fetchNearMissTrends(): Promise<NearMissTrendPoint[]> {
  const buckets = new Map<string, number>();
  for (const nm of NEAR_MISSES) {
    const d = new Date(nm.recordedAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const points = Array.from(buckets.entries())
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));
  return simulateLatency(points, 200);
}

export interface AgentDecisionPoint {
  decision: string;
  count: number;
}

export async function fetchAgentDecisions(): Promise<AgentDecisionPoint[]> {
  const counts = new Map<string, number>();
  for (const t of AGENT_TRACES) counts.set(t.finalDecision, (counts.get(t.finalDecision) ?? 0) + 1);
  const points = Array.from(counts.entries()).map(([decision, count]) => ({ decision, count }));
  return simulateLatency(points, 200);
}

export interface FederationMetricPoint {
  round: number;
  avgTrustValue: number;
  acceptedUpdates: number;
  rejectedUpdates: number;
}

export async function fetchFederationMetrics(): Promise<FederationMetricPoint[]> {
  const byRound = new Map<number, { trust: number[]; accepted: number; rejected: number }>();
  for (const entry of FEDERATION_LOG) {
    const bucket = byRound.get(entry.round) ?? { trust: [], accepted: 0, rejected: 0 };
    if (typeof entry.trustValue === "number") bucket.trust.push(entry.trustValue);
    if (entry.event === "update_accepted") bucket.accepted += 1;
    if (entry.event === "update_rejected") bucket.rejected += 1;
    byRound.set(entry.round, bucket);
  }
  const points = Array.from(byRound.entries())
    .map(([round, b]) => ({
      round,
      avgTrustValue: b.trust.length ? Number((b.trust.reduce((a, c) => a + c, 0) / b.trust.length).toFixed(3)) : 0,
      acceptedUpdates: b.accepted,
      rejectedUpdates: b.rejected,
    }))
    .sort((a, b) => a.round - b.round);
  return simulateLatency(points, 200);
}
