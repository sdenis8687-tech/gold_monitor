import { describe, it, expect } from 'vitest';
import { parseLatestResponse, parseCandleResponse } from './parser';

// Sample MOEX latest response fixture for GLDRUB_TOM
const MOEX_LATEST_GLDRUB_FIXTURE = {
  securities: {
    columns: ['SECID', 'BOARDID', 'SHORTNAME', 'STATUS', 'DECIMALS'],
    data: [['GLDRUB_TOM', 'CETS', 'Золото (рубли)', 'A', 2]],
  },
  marketdata: {
    columns: [
      'SECID',
      'BOARDID',
      'BID',
      'BIDDEPTH',
      'OFFER',
      'OFFERDEPTH',
      'SPREAD',
      'BIDDEPTHT',
      'OFFERDEPTHT',
      'OPEN',
      'LOW',
      'HIGH',
      'LAST',
      'LASTCHANGEPRCNT',
      'NUMTRADES',
      'VOLTODAY',
      'VALTODAY',
      'VALTODAY_USD',
      'ETFSETTLEVALUE',
      'TRADINGSTATUS',
      'UPDATETIME',
      'LASTBID',
      'LASTOFFER',
      'MARKETPRICE2',
      'LASTTOPREVPRICE',
    ],
    data: [
      [
        'GLDRUB_TOM',
        'CETS',
        6050.0,
        5,
        6055.0,
        10,
        5.0,
        100,
        200,
        6000.0,
        5950.0,
        6100.0,
        6052.5,
        0.5,
        1500,
        10000,
        60000000,
        750000,
        null,
        'T',
        '15:30:00',
        6050.0,
        6055.0,
        6052.0,
        0.5,
      ],
    ],
  },
};

// Sample MOEX latest response fixture for USD000UTSTOM
const MOEX_LATEST_USD_FIXTURE = {
  securities: {
    columns: ['SECID', 'BOARDID', 'SHORTNAME'],
    data: [['USD000UTSTOM', 'CETS', 'USD/RUB_TOM']],
  },
  marketdata: {
    columns: [
      'SECID',
      'BOARDID',
      'BID',
      'OFFER',
      'SPREAD',
      'OPEN',
      'LOW',
      'HIGH',
      'LAST',
      'NUMTRADES',
      'VOLTODAY',
      'VALTODAY',
      'TRADINGSTATUS',
      'UPDATETIME',
    ],
    data: [['USD000UTSTOM', 'CETS', 89.5, 89.55, 0.05, 89.0, 88.5, 90.0, 89.52, 5000, 500000, 44000000000, 'T', '15:30:00']],
  },
};

// Sample MOEX candles fixture
const MOEX_CANDLES_DAILY_FIXTURE = {
  candles: {
    columns: ['begin', 'end', 'open', 'close', 'high', 'low', 'value', 'volume'],
    data: [
      ['2024-01-15 00:00:00', '2024-01-16 00:00:00', 5900.0, 5950.25, 5970.0, 5880.0, 29000000, 4900],
      ['2024-01-16 00:00:00', '2024-01-17 00:00:00', 5950.25, 6000.5, 6020.0, 5940.0, 31000000, 5200],
      ['2024-01-17 00:00:00', '2024-01-18 00:00:00', 6000.5, 0, 6010.0, 5990.0, 0, 0], // Invalid candle, should be skipped
      ['2024-01-18 00:00:00', '2024-01-19 00:00:00', 6000.5, 6050.0, 6070.0, 5990.0, 32000000, 5300],
    ],
  },
};

describe('parseLatestResponse', () => {
  it('parses gold latest response correctly', () => {
    const result = parseLatestResponse(MOEX_LATEST_GLDRUB_FIXTURE, 'GLDRUB_TOM');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.last).toBe(6052.5);
    expect(result.data?.secid).toBe('GLDRUB_TOM');
    expect(result.data?.boardid).toBe('CETS');
    expect(result.data?.updatetime).toBe('15:30:00');
    expect(result.data?.tradingstatus).toBe('T');
  });

  it('parses USD latest response correctly', () => {
    const result = parseLatestResponse(MOEX_LATEST_USD_FIXTURE, 'USD000UTSTOM');
    expect(result.success).toBe(true);
    expect(result.data?.last).toBe(89.52);
    expect(result.data?.secid).toBe('USD000UTSTOM');
  });

  it('reads LAST by column name not position', () => {
    // Reorder columns to test that we read by name, not position
    const shuffledFixture = {
      ...MOEX_LATEST_GLDRUB_FIXTURE,
      marketdata: {
        columns: ['BOARDID', 'LAST', 'SECID', 'TRADINGSTATUS', 'UPDATETIME'],
        data: [['CETS', 6052.5, 'GLDRUB_TOM', 'T', '15:30:00']],
      },
    };
    const result = parseLatestResponse(shuffledFixture, 'GLDRUB_TOM');
    expect(result.success).toBe(true);
    expect(result.data?.last).toBe(6052.5);
  });

  it('returns failure for null LAST value', () => {
    const nullLastFixture = {
      marketdata: {
        columns: ['SECID', 'BOARDID', 'LAST', 'TRADINGSTATUS', 'UPDATETIME'],
        data: [['GLDRUB_TOM', 'CETS', null, 'T', '15:30:00']],
      },
    };
    const result = parseLatestResponse(nullLastFixture, 'GLDRUB_TOM');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns failure for zero LAST value', () => {
    const zeroLastFixture = {
      marketdata: {
        columns: ['SECID', 'BOARDID', 'LAST', 'TRADINGSTATUS', 'UPDATETIME'],
        data: [['GLDRUB_TOM', 'CETS', 0, 'T', '15:30:00']],
      },
    };
    const result = parseLatestResponse(zeroLastFixture, 'GLDRUB_TOM');
    expect(result.success).toBe(false);
  });

  it('returns failure for missing marketdata block', () => {
    const result = parseLatestResponse({ foo: 'bar' }, 'GLDRUB_TOM');
    expect(result.success).toBe(false);
  });

  it('returns failure for empty data array', () => {
    const emptyFixture = {
      marketdata: {
        columns: ['SECID', 'BOARDID', 'LAST'],
        data: [],
      },
    };
    const result = parseLatestResponse(emptyFixture, 'GLDRUB_TOM');
    expect(result.success).toBe(false);
  });
});

describe('parseCandleResponse', () => {
  it('parses candles correctly', () => {
    const result = parseCandleResponse(MOEX_CANDLES_DAILY_FIXTURE);
    expect(result.success).toBe(true);
    expect(result.candles).toHaveLength(3); // One invalid candle with close=0 should be skipped
  });

  it('reads fields by column name not position', () => {
    // Reorder columns to test name-based reading
    const shuffledFixture = {
      candles: {
        columns: ['volume', 'high', 'begin', 'close', 'end', 'low', 'value', 'open'],
        data: [
          [4900, 5970.0, '2024-01-15 00:00:00', 5950.25, '2024-01-16 00:00:00', 5880.0, 29000000, 5900.0],
        ],
      },
    };
    const result = parseCandleResponse(shuffledFixture);
    expect(result.success).toBe(true);
    expect(result.candles[0].close).toBe(5950.25);
    expect(result.candles[0].begin).toBe('2024-01-15 00:00:00');
    expect(result.candles[0].high).toBe(5970.0);
  });

  it('skips candles with close <= 0', () => {
    const result = parseCandleResponse(MOEX_CANDLES_DAILY_FIXTURE);
    // The third candle has close=0 and should be skipped
    const closePrices = result.candles.map((c) => c.close);
    expect(closePrices.every((c) => c > 0)).toBe(true);
  });

  it('returns failure for missing candles block', () => {
    const result = parseCandleResponse({ foo: 'bar' });
    expect(result.success).toBe(false);
  });

  it('returns success with empty candles for empty data', () => {
    const emptyFixture = {
      candles: {
        columns: ['begin', 'end', 'open', 'close', 'high', 'low', 'value', 'volume'],
        data: [],
      },
    };
    const result = parseCandleResponse(emptyFixture);
    expect(result.success).toBe(true);
    expect(result.candles).toHaveLength(0);
  });

  it('uses begin as timestamp', () => {
    const result = parseCandleResponse(MOEX_CANDLES_DAILY_FIXTURE);
    expect(result.candles[0].begin).toBe('2024-01-15 00:00:00');
  });
});
