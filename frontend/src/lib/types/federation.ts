import type { IsoDateTime } from "./common";

export type FederationNodeStatus = "online" | "offline" | "syncing" | "degraded" | string;

export type TrainingRoundStatus =
  | "idle"
  | "training"
  | "aggregating"
  | "completed"
  | "failed"
  | string;

export type UpdateStatus = "pending" | "submitted" | "accepted" | "rejected" | string;

export interface FederationNode {
  id: string;
  hospitalName: string;
  nodeStatus: FederationNodeStatus;
  trustValue: number | string;
  localTrainingStatus: TrainingRoundStatus;
  updateStatus: UpdateStatus;
  lastCommunicationAt: IsoDateTime;
  currentRound: number;
}

export interface FederationOverview {
  federationId: string;
  currentRound: number;
  totalRounds: number | null;
  roundStatus: TrainingRoundStatus;
  connectedNodeCount: number;
  totalNodeCount: number;
  lastAggregationAt: IsoDateTime | null;
}

export interface FederationLogEntry {
  id: string;
  round: number;
  node: string;
  event: string;
  status: string;
  trustValue: number | string | null;
  detail?: string;
  timestamp: IsoDateTime;
}
