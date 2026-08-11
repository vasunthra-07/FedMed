import { FEDERATION_LOG, FEDERATION_NODES, FEDERATION_OVERVIEW } from "@/lib/mock/dataset";
import { simulateLatency } from "./client";
import type { FederationLogEntry, FederationNode, FederationOverview } from "@/lib/types";

export async function fetchFederationOverview(): Promise<FederationOverview> {
  return simulateLatency(FEDERATION_OVERVIEW);
}

export async function fetchFederationNodes(): Promise<FederationNode[]> {
  return simulateLatency([...FEDERATION_NODES]);
}

export async function fetchFederationLog(): Promise<FederationLogEntry[]> {
  return simulateLatency([...FEDERATION_LOG]);
}
