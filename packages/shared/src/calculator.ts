/**
 * Business rules for gold price calculations
 */

/**
 * Calculate gold 585 price from gold 999 price
 * gold_585_rub_g = round(gold_999_rub_g * 585 / 999, 2)
 */
export function gold585FromGold999(gold999RubG: number): number {
  return Math.round((gold999RubG * 585) / 999 * 100) / 100;
}

/**
 * Check if a timestamp is stale (older than threshold minutes)
 */
export function isStale(
  lastUpdateTime: Date | string | null,
  thresholdMinutes: number = 25,
): boolean {
  if (!lastUpdateTime) {
    return true;
  }
  const updateTime = typeof lastUpdateTime === 'string' ? new Date(lastUpdateTime) : lastUpdateTime;
  const now = new Date();
  const diffMs = now.getTime() - updateTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes > thresholdMinutes;
}

