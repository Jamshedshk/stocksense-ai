/**
 * StockSense AI — Indian Rupee (INR / ₹) Currency Formatting Utilities
 * Standardizes currency representation across products, sales, inventory valuation,
 * reports, charts, and recommendations using Indian number formatting conventions.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Formats a numeric value into standard Indian Rupee notation (e.g. ₹1,25,000.00).
 */
export function formatINR(amount: number | null | undefined, showDecimals: boolean = true): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0.00";
  }
  const num = Number(amount);
  if (!showDecimals) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  }
  return inrFormatter.format(num);
}

/**
 * Formats large amounts compactly for KPI badges or small chart tooltips (e.g. ₹1.2L).
 */
export function formatINRCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0";
  }
  return inrCompactFormatter.format(Number(amount));
}
