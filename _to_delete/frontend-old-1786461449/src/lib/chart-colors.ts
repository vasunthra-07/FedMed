// Chart colors as resolved values (not CSS var references) for reliable
// SVG fill/stroke rendering across browsers.
export const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  moderate: "#d97706",
  low: "#64748b",
};

export const CATEGORICAL_PALETTE = [
  "#2563eb",
  "#0d9488",
  "#7c3aed",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#65a30d",
  "#db2777",
  "#64748b",
];

export const STATUS_COLORS: Record<string, string> = {
  danger: "#dc2626",
  warning: "#d97706",
  success: "#16a34a",
  info: "#2563eb",
  neutral: "#64748b",
};

export function colorForIndex(i: number): string {
  return CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length];
}
