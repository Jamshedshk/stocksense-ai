/**
 * StockSense AI — Centralized Business Number & Date Formatting Utilities
 * Enforces professional Indian number conventions, sensible decimal precision,
 * and robust display boundaries across the entire application.
 */

import { formatINR as baseFormatINR, formatINRCompact as baseFormatINRCompact } from "./currency";

export { baseFormatINR as formatINR, baseFormatINRCompact as formatINRCompact };

const indianNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/**
 * Formats a unit count with sensible precision:
 * - Whole integers render cleanly without trailing decimals (e.g., 40, 1,250).
 * - Fractional amounts round to at most `maxDecimals` (default 1, e.g., 34.1, 33.5).
 * - Floating point accumulation errors (like 34.100000000000005) are cleanly eliminated.
 */
export function formatUnits(
  units: number | null | undefined,
  maxDecimals: number = 1
): string {
  if (units === null || units === undefined || isNaN(Number(units))) {
    return "0";
  }
  const num = Number(units);

  // Check if effectively whole number
  if (Math.abs(num - Math.round(num)) < 0.0001) {
    return indianNumberFormatter.format(Math.round(num));
  }

  // Fractional amount with Indian integer grouping
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(num * factor) / factor;

  const parts = rounded.toFixed(maxDecimals).split(".");
  const integerPart = indianNumberFormatter.format(parseInt(parts[0], 10));
  const decimalPart = parts[1]?.replace(/0+$/, "");

  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

/**
 * Formats a quantity with unit label (e.g., "40 units", "1 unit", "34.1 units").
 */
export function formatQuantityWithUnit(
  units: number | null | undefined,
  unitLabel: string = "units",
  maxDecimals: number = 1
): string {
  const formatted = formatUnits(units, maxDecimals);
  if (formatted === "1" && unitLabel === "units") {
    return "1 unit";
  }
  return `${formatted} ${unitLabel}`;
}

/**
 * Formats daily sales rates (e.g., "~4.8 / day", "~0.5 / day", "No sales").
 */
export function formatDailySalesRate(
  rate: number | null | undefined,
  options: { prefixApprox?: boolean; suffix?: string } = {}
): string {
  const { prefixApprox = true, suffix = "/ day" } = options;
  if (rate === null || rate === undefined || isNaN(Number(rate)) || Number(rate) <= 0) {
    return "0 / day";
  }
  const formatted = formatUnits(rate, 1);
  const prefix = prefixApprox ? "~" : "";
  return `${prefix}${formatted} ${suffix}`.trim();
}

/**
 * Formats stock coverage days (e.g. "~14 days", "Ample Stock", "< 1 day").
 */
export function formatStockCoverDays(
  days: number | null | undefined
): string {
  if (days === null || days === undefined || isNaN(Number(days))) {
    return "—";
  }
  const num = Number(days);
  if (num >= 999) {
    return "Ample Stock";
  }
  if (num <= 0) {
    return "Out of Stock";
  }
  if (num < 1) {
    return "< 1 day";
  }
  return `~${formatUnits(num, 0)} days`;
}

/**
 * Formats percentage values with standard rounding (e.g., "15.2%").
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return "0%";
  }
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Formats prediction accuracy metrics (MAE) into plain-English feedback.
 */
export function formatPredictionError(
  mae: number | null | undefined,
  fallback: number = 1.0
): string {
  const val = mae !== null && mae !== undefined && !isNaN(Number(mae)) ? Number(mae) : fallback;
  return `Off by ~${formatUnits(val, 1)} units on average`;
}

/**
 * Formats an ISO date string into standard Indian notation (e.g. "10 Oct 2026").
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a date & timestamp into standard Indian readable notation (e.g. "10 Oct 2026, 09:15 PM").
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined
): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}
