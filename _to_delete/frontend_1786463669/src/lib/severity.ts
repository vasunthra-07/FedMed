/**
 * Visual-only helpers for scanning by severity. These never invent or
 * compute a severity — they just map whatever string the backend already
 * returned into an accent class for fast triage (left-edge stripes, group
 * ordering). Unknown values always fall back to a neutral treatment.
 */

const RANK: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

export function severityRank(severity: string | null | undefined): number {
  if (!severity) return 4;
  return RANK[severity.toLowerCase()] ?? 4;
}

const STRIPE: Record<string, string> = {
  critical: "before:bg-severity-critical",
  high: "before:bg-severity-high",
  moderate: "before:bg-severity-moderate",
  low: "before:bg-severity-low",
};

/**
 * Returns Tailwind classes for a left-edge urgency stripe using the ::before
 * pseudo-element pattern. Apply to an element with `relative` already set,
 * or use severityStripeClassRelative for the full combo.
 */
export function severityStripeClass(severity: string | null | undefined): string {
  if (!severity) return "before:bg-border";
  const key = severity.toLowerCase();
  return STRIPE[key] ?? "before:bg-severity-unknown";
}

export function severityStripeClassRelative(severity: string | null | undefined): string {
  return `relative before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-[inherit] ${severityStripeClass(severity)}`;
}

const SEVERITY_ORDER = ["critical", "high", "moderate", "low"] as const;

/**
 * Groups items into severity buckets for grouped-scan lists. Items with an
 * unrecognized or missing severity land in a trailing "Other" bucket, still
 * labeled with whatever the backend sent (or "No severity" if null).
 */
export function groupBySeverity<T>(
  items: T[],
  getSeverity: (item: T) => string | null | undefined
): { key: string; label: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const raw = getSeverity(item);
    const key = raw ? raw.toLowerCase() : "__none__";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }

  const ordered: { key: string; label: string; items: T[] }[] = [];
  for (const key of SEVERITY_ORDER) {
    if (buckets.has(key)) {
      ordered.push({ key, label: key.charAt(0).toUpperCase() + key.slice(1), items: buckets.get(key)! });
      buckets.delete(key);
    }
  }
  // Anything left: other known-but-unranked values, then the no-severity bucket last.
  for (const [key, items] of buckets) {
    if (key === "__none__") continue;
    ordered.push({ key, label: key.charAt(0).toUpperCase() + key.slice(1), items });
  }
  if (buckets.has("__none__")) {
    ordered.push({ key: "__none__", label: "No issues detected", items: buckets.get("__none__")! });
  }
  return ordered;
}
