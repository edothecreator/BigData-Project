import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compact number formatter, e.g. 150346 -> "150.3K", 6990280 -> "7.0M".
 * Used for headline KPI values.
 */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Full grouped number, e.g. 150346 -> "150,346". */
export function formatFull(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

/** Percent with no decimals, e.g. 0.796 -> "80%". Input is a fraction 0..1. */
export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(fraction);
}
