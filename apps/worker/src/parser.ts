import { buildColumnIndexMap } from '@gold-monitor/shared';
import type { MoexLatestData, MoexCandle } from '@gold-monitor/shared';

export interface ParsedLatestResult {
  success: boolean;
  data?: MoexLatestData;
  errors: string[];
}

export interface ParsedCandlesResult {
  success: boolean;
  candles: MoexCandle[];
  errors: string[];
}

/**
 * Parse MOEX latest quote response
 * ALWAYS reads fields by column name, never by position
 */
export function parseLatestResponse(raw: unknown, instrument: string): ParsedLatestResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { success: false, candles: [], errors: ['Response is not an object'] } as unknown as ParsedLatestResult;
  }

  const response = raw as Record<string, unknown>;

  // Check marketdata block
  if (!response.marketdata || typeof response.marketdata !== 'object') {
    return { success: false, errors: ['Missing marketdata block'] };
  }

  const marketdata = response.marketdata as Record<string, unknown>;

  if (!Array.isArray(marketdata.columns) || !Array.isArray(marketdata.data)) {
    return {
      success: false,
      errors: ['marketdata.columns or marketdata.data is not an array'],
    };
  }

  const columns = marketdata.columns as string[];
  const data = marketdata.data as unknown[][];

  if (data.length === 0) {
    return { success: false, errors: ['marketdata.data is empty'] };
  }

  const row = data[0];

  // CRITICAL: Build columnIndexMap from columns array, then read by column name
  const colMap = buildColumnIndexMap(columns);

  const lastIdx = colMap['LAST'];
  const updatetimeIdx = colMap['UPDATETIME'];
  const tradingstatusIdx = colMap['TRADINGSTATUS'];
  const secidIdx = colMap['SECID'];
  const boardidIdx = colMap['BOARDID'];

  if (lastIdx === undefined) {
    errors.push('LAST column not found in marketdata');
    return { success: false, errors };
  }

  const last = row[lastIdx] as number | null;
  const updatetime = updatetimeIdx !== undefined ? (row[updatetimeIdx] as string | null) : null;
  const tradingstatus =
    tradingstatusIdx !== undefined ? (row[tradingstatusIdx] as string | null) : null;
  const secid = secidIdx !== undefined ? (row[secidIdx] as string | null) : null;
  const boardid = boardidIdx !== undefined ? (row[boardidIdx] as string | null) : null;

  if (last === null || last === undefined || last <= 0) {
    errors.push(`LAST value is invalid: ${last}`);
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      secid: secid || instrument,
      boardid: boardid || 'CETS',
      last,
      updatetime,
      tradingstatus,
    },
    errors: [],
  };
}

/**
 * Parse MOEX candles response
 * ALWAYS reads fields by column name from columnIndexMap
 */
export function parseCandleResponse(raw: unknown): ParsedCandlesResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { success: false, candles: [], errors: ['Response is not an object'] };
  }

  const response = raw as Record<string, unknown>;

  if (!response.candles || typeof response.candles !== 'object') {
    return { success: false, candles: [], errors: ['Missing candles block'] };
  }

  const candles = response.candles as Record<string, unknown>;

  if (!Array.isArray(candles.columns) || !Array.isArray(candles.data)) {
    return {
      success: false,
      candles: [],
      errors: ['candles.columns or candles.data is not an array'],
    };
  }

  const columns = candles.columns as string[];
  const data = candles.data as unknown[][];

  // CRITICAL: Build columnIndexMap from columns array, then read by column name
  const colMap = buildColumnIndexMap(columns);

  const requiredCols = ['begin', 'end', 'open', 'close', 'high', 'low', 'value', 'volume'];
  for (const col of requiredCols) {
    if (colMap[col] === undefined) {
      errors.push(`Missing column: ${col}`);
    }
  }

  if (errors.length > 0) {
    return { success: false, candles: [], errors };
  }

  const result: MoexCandle[] = [];

  for (const row of data) {
    const close = row[colMap['close']!] as number;

    // Skip candles with invalid close price
    if (close === null || close === undefined || close <= 0) {
      continue;
    }

    const candle: MoexCandle = {
      begin: row[colMap['begin']!] as string,
      end: row[colMap['end']!] as string,
      open: row[colMap['open']!] as number,
      close,
      high: row[colMap['high']!] as number,
      low: row[colMap['low']!] as number,
      value: row[colMap['value']!] as number,
      volume: row[colMap['volume']!] as number,
    };

    result.push(candle);
  }

  return {
    success: true,
    candles: result,
    errors: [],
  };
}

/**
 * Helper: parse raw candles from response object (used by moex-client)
 */
export function parseRawCandles(raw: unknown): MoexCandle[] {
  const result = parseCandleResponse(raw);
  return result.candles;
}
