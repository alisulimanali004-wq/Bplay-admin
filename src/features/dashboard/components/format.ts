/**
 * Dashboard number formatting. Western digits + tabular-nums everywhere so
 * columns of figures stay aligned and the compact "M/K" units read the same in
 * both languages (units are language-neutral; digits stay LTR inside RTL).
 */
const LOCALE = 'en-US';

export function fmtInt(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(Math.round(n));
}

/** Compact money/counts: 48_600_000 → "48.6M", 620_000 → "620K", 940 → "940". */
export function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.round(n));
}
