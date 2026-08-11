/**
 * Placeholder API layer.
 *
 * Every function here is shaped like a real network call (async, returns a
 * typed payload, can reject) so that swapping in real `fetch` calls against
 * the MedX backend later is a drop-in change for the TanStack Query hooks
 * that consume these functions — no component code should need to change.
 */
export function simulateLatency<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class ApiError extends Error {
  constructor(message: string, public code: string = "unknown_error") {
    super(message);
    this.name = "ApiError";
  }
}
