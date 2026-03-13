import type { RangeType, ResolutionType } from './types';

export const SUPPORTED_RANGES: RangeType[] = ['1D', '7D', '30D', '90D', '6M', '1Y'];

/**
 * Map range string to resolution type
 * 1D, 7D -> intraday
 * 30D, 90D, 1Y -> daily
 */
export function rangeToResolution(range: RangeType): ResolutionType {
  switch (range) {
    case '1D':
    case '7D':
      return 'intraday';
    case '30D':
    case '90D':
    case '6M':
    case '1Y':
      return 'daily';
    default: {
      const _exhaustive: never = range;
      throw new Error(`Unsupported range: ${_exhaustive}`);
    }
  }
}

export interface DateRange {
  from: Date;
  till: Date;
}

/**
 * Calculate from/till dates for a given range
 */
export function rangeToDateRange(range: RangeType, now: Date = new Date()): DateRange {
  const till = new Date(now);
  const from = new Date(now);

  switch (range) {
    case '1D':
      from.setDate(from.getDate() - 1);
      break;
    case '7D':
      from.setDate(from.getDate() - 7);
      break;
    case '30D':
      from.setDate(from.getDate() - 30);
      break;
    case '90D':
      from.setDate(from.getDate() - 90);
      break;
    case '6M':
      from.setMonth(from.getMonth() - 6);
      break;
    case '1Y':
      from.setFullYear(from.getFullYear() - 1);
      break;
    default: {
      const _exhaustive: never = range;
      throw new Error(`Unsupported range: ${_exhaustive}`);
    }
  }

  return { from, till };
}

/**
 * Format date as YYYY-MM-DD for MOEX API
 */
export function formatDateForMoex(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a range string is valid
 */
export function isValidRange(range: string): range is RangeType {
  return SUPPORTED_RANGES.includes(range as RangeType);
}
