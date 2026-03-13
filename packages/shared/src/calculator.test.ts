import { describe, it, expect } from 'vitest';
import { gold585FromGold999, isStale } from './calculator';

describe('gold585FromGold999', () => {
  it('calculates gold 585 from gold 999 correctly', () => {
    // gold_585 = gold_999 * 585 / 999
    const gold999 = 6000;
    const expected = Math.round((6000 * 585) / 999 * 100) / 100;
    expect(gold585FromGold999(gold999)).toBe(expected);
  });

  it('rounds to 2 decimal places', () => {
    const result = gold585FromGold999(5555.123456);
    const decimals = result.toString().split('.')[1];
    expect(decimals?.length ?? 0).toBeLessThanOrEqual(2);
  });

  it('handles round number', () => {
    expect(gold585FromGold999(999)).toBe(585);
  });

  it('handles zero', () => {
    expect(gold585FromGold999(0)).toBe(0);
  });

  it('large value maintains precision', () => {
    const result = gold585FromGold999(10000);
    const expected = Math.round((10000 * 585) / 999 * 100) / 100;
    expect(result).toBe(expected);
  });
});

describe('isStale', () => {
  it('returns true when lastUpdateTime is null', () => {
    expect(isStale(null)).toBe(true);
  });

  it('returns false for recent timestamp', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    expect(isStale(recent, 25)).toBe(false);
  });

  it('returns true for old timestamp beyond threshold', () => {
    const old = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    expect(isStale(old, 25)).toBe(true);
  });

  it('accepts string date', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000);
    expect(isStale(recent.toISOString(), 25)).toBe(false);
  });

  it('uses default threshold of 25 minutes', () => {
    const twentyFourMinutesAgo = new Date(Date.now() - 24 * 60 * 1000);
    expect(isStale(twentyFourMinutesAgo)).toBe(false);

    const twentySixMinutesAgo = new Date(Date.now() - 26 * 60 * 1000);
    expect(isStale(twentySixMinutesAgo)).toBe(true);
  });
});
