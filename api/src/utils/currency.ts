/**
 * Currency utility functions for price conversions
 */

export function toCents(price: number): number {
  return Math.round(price * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}