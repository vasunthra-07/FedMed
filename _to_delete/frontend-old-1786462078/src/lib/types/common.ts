/**
 * Shared primitive types.
 *
 * IMPORTANT: MedX is UI-only. Every enum-like union below documents the
 * values the backend is *expected* to return so components can be typed
 * usefully, but rendering code must treat these as opaque strings coming
 * from the API — never compute, derive, or override them on the frontend.
 * Components should always fall back gracefully to displaying an unknown
 * value verbatim (see `severity-chip.tsx` / `status-badge.tsx`).
 */

export type IsoDateTime = string;

export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: IsoDateTime;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Backend-defined severity. Known values below; unknown values must still render. */
export type SeverityLevel = "critical" | "high" | "moderate" | "low" | string;

export type AsyncStatus = "idle" | "loading" | "success" | "error";
