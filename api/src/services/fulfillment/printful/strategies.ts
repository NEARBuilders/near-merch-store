import { Schedule } from 'every-plugin/effect';

/**
 * Operation strategies define timeout, retry, and rate limiting behavior
 * for different types of Printful API operations.
 */
export const OperationStrategies = {
  /**
   * Critical operations: Orders, confirmations
   * - Must succeed
   * - Longer timeout
   * - More retries
   * - Conservative rate limiting
   */
  critical: {
    timeout: '30 seconds' as const,
    retries: 5,
    retrySchedule: Schedule.exponential('1 second').pipe(
      Schedule.intersect(Schedule.recurs(5))
    ),
    rateLimitBurst: 10,
    rateLimitRestorePerSecond: 2,
    description: 'Critical operations (orders, confirmations)',
  },

  /**
   * Standard operations: Sync products, product details
   * - Should succeed but not critical
   * - Moderate timeout
   * - Limited retries
   * - Standard rate limiting
   */
  standard: {
    timeout: '10 seconds' as const,
    retries: 2,
    retrySchedule: Schedule.exponential('500 millis').pipe(
      Schedule.intersect(Schedule.recurs(2))
    ),
    rateLimitBurst: 20,
    rateLimitRestorePerSecond: 2,
    description: 'Standard operations (sync products, details)',
  },

  /**
   * Best-effort operations: Catalog enrichment
   * - Optional data
   * - Short timeout
   * - No retries
   * - Permissive rate limiting
   */
  bestEffort: {
    timeout: '3 seconds' as const,
    retries: 0,
    retrySchedule: Schedule.recurs(0) as unknown as Schedule.Schedule<number>,
    rateLimitBurst: 30,
    rateLimitRestorePerSecond: 2,
    description: 'Best-effort operations (catalog enrichment)',
  },
} as const;

export type OperationStrategy = keyof typeof OperationStrategies;

/**
 * Get strategy configuration by name
 */
export function getStrategy(strategy: OperationStrategy) {
  return OperationStrategies[strategy];
}

/**
 * Parse timeout string to milliseconds
 */
export function parseTimeout(timeoutStr: string): number {
  const match = timeoutStr.match(/(\d+)\s*(second|seconds|s|millisecond|milliseconds|ms)/i);
  if (!match) return 10000; // Default 10 seconds

  const value = parseInt(match[1]!, 10);
  const unit = match[2];
  if (!unit) return value * 1000; // Default to seconds

  const normalizedUnit = unit.toLowerCase();

  if (normalizedUnit === 'millisecond' || normalizedUnit === 'milliseconds' || normalizedUnit === 'ms') {
    return value;
  }

  return value * 1000;
}
