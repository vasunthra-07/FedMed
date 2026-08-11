import { format, formatDistanceToNow } from "date-fns";

/**
 * Presentation-only formatting. This turns a backend enum string like
 * "pending_pharmacist_review" into "Pending pharmacist review" for display.
 * It never changes, infers, or maps the underlying value — the raw string
 * is still what drives all logic and is always available via `raw`.
 */
export function formatEnumLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const spaced = value.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function initials(name: string): string {
  const parts = name.replace(/^Dr\.\s*/, "").split(" ").filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
