/**
 * Currency formatting and conversion display helpers
 */

/** Format cents as currency string — symbol always on the left */
export function formatCents(cents: number, currency = 'USD'): string {
  const abs = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(cents) / 100);
  return cents < 0 ? `-${abs}` : abs;
}

/** Format dollars (already divided) as currency string — symbol always on the left */
export function formatAmount(amount: number, currency = 'USD'): string {
  const abs = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
  return amount < 0 ? `-${abs}` : abs;
}

/** Get display value for a monetary amount - prefers converted when available */
export function getDisplayAmount(
  amount: number,
  currency: string,
  convertedAmount?: number | null,
  convertedCurrency?: string | null
): { value: number; currency: string; isConverted: boolean } {
  if (convertedAmount != null && convertedCurrency) {
    return { value: convertedAmount, currency: convertedCurrency, isConverted: true };
  }
  return { value: amount, currency, isConverted: false };
}

/** Format for display - shows converted as primary with original as secondary when applicable */
export function formatWithConversion(
  amount: number,
  currency: string,
  convertedAmount?: number | null,
  convertedCurrency?: string | null,
  rateStale?: boolean
): { primary: string; secondary?: string; stale?: boolean } {
  if (convertedAmount != null && convertedCurrency && convertedCurrency !== currency) {
    return {
      primary: formatAmount(convertedAmount, convertedCurrency),
      secondary: formatAmount(amount, currency),
      stale: rateStale ?? false,
    };
  }
  return { primary: formatAmount(amount, currency) };
}
