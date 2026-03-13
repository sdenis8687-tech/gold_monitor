import type { MoexLatestData, MoexCandle } from './types';

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validate a raw MOEX latest quote response
 * Expects response to have marketdata block with LAST field
 */
export function validateLatestResponse(
  raw: unknown,
  instrument: string,
): ValidationResult<MoexLatestData> {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }

  const response = raw as Record<string, unknown>;

  // Check marketdata block
  if (!response.marketdata || typeof response.marketdata !== 'object') {
    return { valid: false, errors: ['Missing marketdata block'] };
  }

  const marketdata = response.marketdata as Record<string, unknown>;

  if (!Array.isArray(marketdata.columns)) {
    errors.push('marketdata.columns is not an array');
  }
  if (!Array.isArray(marketdata.data)) {
    errors.push('marketdata.data is not an array');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const columns = marketdata.columns as string[];
  const data = marketdata.data as unknown[][];

  if (data.length === 0) {
    return { valid: false, errors: ['marketdata.data is empty'] };
  }

  const row = data[0];
  const colMap = buildColumnIndexMap(columns);

  const lastIdx = colMap['LAST'];
  const updatetimeIdx = colMap['UPDATETIME'];
  const tradingstatusIdx = colMap['TRADINGSTATUS'];
  const secidIdx = colMap['SECID'];
  const boardidIdx = colMap['BOARDID'];

  if (lastIdx === undefined) {
    errors.push('LAST column not found in marketdata');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const last = lastIdx !== undefined ? (row[lastIdx] as number | null) : null;
  const updatetime = updatetimeIdx !== undefined ? (row[updatetimeIdx] as string | null) : null;
  const tradingstatus =
    tradingstatusIdx !== undefined ? (row[tradingstatusIdx] as string | null) : null;
  const secid = secidIdx !== undefined ? (row[secidIdx] as string | null) : null;
  const boardid = boardidIdx !== undefined ? (row[boardidIdx] as string | null) : null;

  if (last === null || last === undefined || last <= 0) {
    errors.push(`LAST value is invalid: ${last}`);
  }

  const data_out: MoexLatestData = {
    secid: secid || instrument,
    boardid: boardid || 'CETS',
    last: last,
    updatetime: updatetime,
    tradingstatus: tradingstatus,
  };

  return {
    valid: errors.length === 0,
    data: data_out,
    errors,
  };
}

/**
 * Validate a raw MOEX candles response
 */
export function validateCandleResponse(raw: unknown): ValidationResult<MoexCandle[]> {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }

  const response = raw as Record<string, unknown>;

  if (!response.candles || typeof response.candles !== 'object') {
    return { valid: false, errors: ['Missing candles block'] };
  }

  const candles = response.candles as Record<string, unknown>;

  if (!Array.isArray(candles.columns)) {
    errors.push('candles.columns is not an array');
  }
  if (!Array.isArray(candles.data)) {
    errors.push('candles.data is not an array');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const columns = candles.columns as string[];
  const data = candles.data as unknown[][];
  const colMap = buildColumnIndexMap(columns);

  const requiredCols = ['begin', 'end', 'open', 'close', 'high', 'low', 'value', 'volume'];
  for (const col of requiredCols) {
    if (colMap[col] === undefined) {
      errors.push(`Missing column: ${col}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const result: MoexCandle[] = [];
  for (const row of data) {
    const candle: MoexCandle = {
      begin: row[colMap['begin']!] as string,
      end: row[colMap['end']!] as string,
      open: row[colMap['open']!] as number,
      close: row[colMap['close']!] as number,
      high: row[colMap['high']!] as number,
      low: row[colMap['low']!] as number,
      value: row[colMap['value']!] as number,
      volume: row[colMap['volume']!] as number,
    };

    // Skip candles with invalid close price
    if (candle.close <= 0) {
      continue;
    }

    result.push(candle);
  }

  return {
    valid: true,
    data: result,
    errors: [],
  };
}

export function buildColumnIndexMap(columns: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  columns.forEach((col, idx) => {
    map[col] = idx;
  });
  return map;
}
