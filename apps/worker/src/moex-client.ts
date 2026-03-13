import type { MoexCandle } from '@gold-monitor/shared';
import { formatDateForMoex } from '@gold-monitor/shared';

const DEFAULT_BASE_URL = 'https://iss.moex.com';
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_CANDLES_PER_REQUEST = 500;

export interface FetchLatestResult {
  raw: unknown;
  httpStatus: number;
}

export interface FetchCandlesResult {
  raw: unknown;
  httpStatus: number;
  candles: MoexCandle[];
  hasMore: boolean;
}

export class MoexIssClient {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(
    baseUrl: string = process.env.MOEX_BASE_URL || DEFAULT_BASE_URL,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
  }

  /**
   * Fetch latest quote for an instrument
   */
  async fetchLatest(instrument: string): Promise<FetchLatestResult> {
    const url =
      `${this.baseUrl}/iss/engines/currency/markets/selt/boards/CETS/securities/${instrument}.json` +
      `?iss.only=marketdata,securities&iss.meta=off`;

    const response = await this.fetchWithTimeout(url);
    const raw = await response.json();

    return {
      raw,
      httpStatus: response.status,
    };
  }

  /**
   * Fetch candles for an instrument for a given date range
   * interval=10 for intraday, interval=24 for daily
   */
  async fetchCandles(
    instrument: string,
    from: Date,
    till: Date,
    interval: 10 | 24,
  ): Promise<FetchCandlesResult> {
    const fromStr = formatDateForMoex(from);
    const tillStr = formatDateForMoex(till);

    const url =
      `${this.baseUrl}/iss/engines/currency/markets/selt/boards/CETS/securities/${instrument}/candles.json` +
      `?iss.meta=off&from=${fromStr}&till=${tillStr}&interval=${interval}`;

    const response = await this.fetchWithTimeout(url);
    const raw = await response.json();

    const { parseRawCandles } = await import('./parser');
    const candles = parseRawCandles(raw);
    const hasMore = candles.length >= MAX_CANDLES_PER_REQUEST;

    return {
      raw,
      httpStatus: response.status,
      candles,
      hasMore,
    };
  }

  /**
   * Fetch all candles for a date range, handling pagination
   */
  async fetchAllCandles(
    instrument: string,
    from: Date,
    till: Date,
    interval: 10 | 24,
  ): Promise<MoexCandle[]> {
    const allCandles: MoexCandle[] = [];
    let currentFrom = new Date(from);

    while (currentFrom < till) {
      const result = await this.fetchCandles(instrument, currentFrom, till, interval);

      if (result.candles.length === 0) {
        break;
      }

      allCandles.push(...result.candles);

      if (!result.hasMore) {
        break;
      }

      // Move from date to after last received candle's end timestamp
      const lastCandle = result.candles[result.candles.length - 1];
      const lastEnd = new Date(lastCandle.end);

      // Add 1 minute to avoid re-fetching the last candle
      lastEnd.setMinutes(lastEnd.getMinutes() + 1);
      currentFrom = lastEnd;
    }

    return allCandles;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'GoldMonitor/1.0',
        },
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
