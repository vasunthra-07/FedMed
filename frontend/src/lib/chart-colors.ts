// Chart colors as resolved values (not CSS var references) for reliable
// SVG fill/stroke rendering across browsers. Kept in step with the app's
// design tokens (globals.css) and status bucket classification (status.ts)
// so charts read as part of the same system as badges and cards, not a
// default charting-library palette.

export const SEVERITY_COLORS: Record<string, string> = {
  critical: "#c53b32", // matches --severity-critical / Critical
  high: "#c9702f",
  moderate: "#d4872c", // matches Warning
  low: "#7a8794", // matches Muted — least urgent, deliberately desaturated
};

export const STATUS_BUCKET_COLORS: Record<string, string> = {
  danger: "#c53b32",
  warning: "#d4872c",
  success: "#2f7d57",
  info: "#1e4d8f",
  neutral: "#7a8794",
};

// Restrained, on-brand categorical palette for charts with several
// unrelated series (e.g. a workflow-status distribution) — blues/greens/
// ambers drawn from the product palette rather than a rainbow default.
export const CATEGORICAL_PALETTE = [
  "#1e4d8f",
  "#2f7d57",
  "#d4872c",
  "#546476",
  "#5b8fc7",
  "#7aa88f",
  "#c9702f",
  "#9aa5b1",
];

export function colorForIndex(i: number): string {
  return CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length];
}
