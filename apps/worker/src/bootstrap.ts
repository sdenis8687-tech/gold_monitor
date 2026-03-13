import { prisma } from '@gold-monitor/db';
import { gold585FromGold999 } from '@gold-monitor/shared';
import { MoexIssClient } from './moex-client';
import { parseLatestResponse, parseCandleResponse } from './parser';
import type { MoexCandle } from '@gold-monitor/shared';
import crypto from 'crypto';

/**
 * MOEX candle timestamps are "YYYY-MM-DD HH:MM:SS" in Moscow time (UTC+3).
 * Replace space with T and append +03:00 to get a valid ISO datetime.
 */
function parseMoexDateTime(dtStr: string): Date {
  const dt = new Date(dtStr.replace(' ', 'T') + '+03:00');
  if (isNaN(dt.getTime())) throw new Error(`Invalid MOEX datetime: "${dtStr}"`);
  return dt;
}

const INSTRUMENTS = {
  GOLD: 'GLDRUB_TOM',
  USD: 'USD000UTSTOM',
};

function hashPayload(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .substring(0, 64);
}

interface CandleWithInstrument {
  instrument: string;
  candle: MoexCandle;
  rawId: bigint;
}

export class Bootstrap {
  private client: MoexIssClient;
  private dailyDays: number;
  private intradayDays: number;

  constructor(
    client?: MoexIssClient,
    dailyDays = parseInt(process.env.BACKFILL_DAILY_DAYS || '365'),
    intradayDays = parseInt(process.env.BACKFILL_INTRADAY_DAYS || '7'),
  ) {
    this.client = client || new MoexIssClient();
    this.dailyDays = dailyDays;
    this.intradayDays = intradayDays;
  }

  async run(): Promise<void> {
    // Check if already bootstrapped
    const existingCount = await prisma.derived_quotes.count();
    if (existingCount > 0) {
      console.log(`Bootstrap skipped: ${existingCount} derived_quotes already exist`);
      return;
    }

    console.log('Starting bootstrap...');
    console.log(`Backfilling ${this.dailyDays} days of daily data and ${this.intradayDays} days of intraday data`);

    const now = new Date();

    // Backfill daily data (365 days)
    const dailyFrom = new Date(now);
    dailyFrom.setDate(dailyFrom.getDate() - this.dailyDays);

    console.log(`Fetching daily candles from ${dailyFrom.toISOString()} to ${now.toISOString()}`);
    await this.backfillCandles(dailyFrom, now, 24, 'daily');

    // Backfill intraday data (7 days)
    const intradayFrom = new Date(now);
    intradayFrom.setDate(intradayFrom.getDate() - this.intradayDays);

    console.log(`Fetching intraday candles from ${intradayFrom.toISOString()} to ${now.toISOString()}`);
    await this.backfillCandles(intradayFrom, now, 10, 'intraday');

    const finalCount = await prisma.derived_quotes.count();
    console.log(`Bootstrap complete: ${finalCount} derived_quotes created`);
  }

  private async backfillCandles(
    from: Date,
    till: Date,
    interval: 10 | 24,
    resolution: 'daily' | 'intraday',
  ): Promise<void> {
    const endpointKind = interval === 24 ? 'candles_daily' : 'candles_intraday';
    const resolutionHint = interval === 24 ? 'daily' : '10min';

    // Fetch gold candles with pagination
    console.log(`Fetching ${INSTRUMENTS.GOLD} ${resolution} candles...`);
    const goldCandles = await this.fetchAndStoreCandles(
      INSTRUMENTS.GOLD,
      from,
      till,
      interval,
      endpointKind,
      resolutionHint,
    );

    // Fetch USD candles with pagination
    console.log(`Fetching ${INSTRUMENTS.USD} ${resolution} candles...`);
    const usdCandles = await this.fetchAndStoreCandles(
      INSTRUMENTS.USD,
      from,
      till,
      interval,
      endpointKind,
      resolutionHint,
    );

    console.log(`Got ${goldCandles.length} gold candles and ${usdCandles.length} usd candles`);

    // Build lookup maps by timestamp
    const goldMap = new Map<string, CandleWithInstrument>();
    const usdMap = new Map<string, CandleWithInstrument>();

    for (const item of goldCandles) {
      goldMap.set(item.candle.begin, item);
    }
    for (const item of usdCandles) {
      usdMap.set(item.candle.begin, item);
    }

    // Create derived quotes by matching timestamps
    const derivedInserts: Array<{
      resolution: string;
      bucket_ts_utc: Date;
      gold_source_ts_utc: Date | null;
      usd_source_ts_utc: Date | null;
      gold_999_rub_g: number;
      gold_585_rub_g: number;
      usd_rub: number;
      gold_is_stale: boolean;
      usd_is_stale: boolean;
      row_status: string;
      raw_gold_id: bigint | null;
      raw_usd_id: bigint | null;
    }> = [];

    // Use gold timestamps as primary
    for (const [ts, goldItem] of goldMap) {
      const usdItem = usdMap.get(ts);

      if (!usdItem) {
        // Try to find nearest USD candle within tolerance
        const goldTime = new Date(ts).getTime();
        let nearest: CandleWithInstrument | null = null;
        let nearestDiff = Infinity;

        for (const [usdTs, usdCandleItem] of usdMap) {
          const diff = Math.abs(new Date(usdTs).getTime() - goldTime);
          if (diff < nearestDiff && diff < 15 * 60 * 1000) {
            // Within 15 minutes
            nearestDiff = diff;
            nearest = usdCandleItem;
          }
        }

        if (!nearest) {
          continue; // No matching USD data, skip
        }

        derivedInserts.push({
          resolution,
          bucket_ts_utc: parseMoexDateTime(ts),
          gold_source_ts_utc: parseMoexDateTime(goldItem.candle.begin),
          usd_source_ts_utc: parseMoexDateTime(nearest.candle.begin),
          gold_999_rub_g: goldItem.candle.close,
          gold_585_rub_g: gold585FromGold999(goldItem.candle.close),
          usd_rub: nearest.candle.close,
          gold_is_stale: false,
          usd_is_stale: false,
          row_status: 'valid',
          raw_gold_id: goldItem.rawId,
          raw_usd_id: nearest.rawId,
        });
      } else {
        derivedInserts.push({
          resolution,
          bucket_ts_utc: parseMoexDateTime(ts),
          gold_source_ts_utc: parseMoexDateTime(goldItem.candle.begin),
          usd_source_ts_utc: parseMoexDateTime(usdItem.candle.begin),
          gold_999_rub_g: goldItem.candle.close,
          gold_585_rub_g: gold585FromGold999(goldItem.candle.close),
          usd_rub: usdItem.candle.close,
          gold_is_stale: false,
          usd_is_stale: false,
          row_status: 'valid',
          raw_gold_id: goldItem.rawId,
          raw_usd_id: usdItem.rawId,
        });
      }
    }

    // Upsert derived quotes in batches
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < derivedInserts.length; i += BATCH_SIZE) {
      const batch = derivedInserts.slice(i, i + BATCH_SIZE);

      for (const item of batch) {
        await prisma.derived_quotes.upsert({
          where: {
            resolution_bucket_ts_utc: {
              resolution: item.resolution,
              bucket_ts_utc: item.bucket_ts_utc,
            },
          },
          update: {
            gold_999_rub_g: item.gold_999_rub_g,
            gold_585_rub_g: item.gold_585_rub_g,
            usd_rub: item.usd_rub,
          },
          create: item,
        });
        inserted++;
      }

      console.log(`Upserted ${inserted}/${derivedInserts.length} ${resolution} derived quotes`);
    }
  }

  private async fetchAndStoreCandles(
    instrument: string,
    from: Date,
    till: Date,
    interval: 10 | 24,
    endpointKind: string,
    resolutionHint: string,
  ): Promise<CandleWithInstrument[]> {
    const allCandles: CandleWithInstrument[] = [];
    let currentFrom = new Date(from);

    while (currentFrom < till) {
      const requestTs = new Date();

      let raw: unknown;
      let httpStatus: number;

      try {
        const result = await this.client.fetchCandles(instrument, currentFrom, till, interval);
        raw = result.raw;
        httpStatus = result.httpStatus;
      } catch (err) {
        console.error(`Error fetching candles for ${instrument}:`, err);
        break;
      }

      const payloadHash = hashPayload(raw);
      const parsedResult = parseCandleResponse(raw);

      // Store raw quote
      let rawId: bigint | null = null;
      try {
        const stored = await prisma.raw_quotes.upsert({
          where: {
            instrument_endpoint_kind_payload_hash: {
              instrument,
              endpoint_kind: endpointKind,
              payload_hash: payloadHash,
            },
          },
          update: {},
          create: {
            source: 'MOEX_ISS',
            instrument,
            endpoint_kind: endpointKind,
            resolution_hint: resolutionHint,
            request_ts_utc: requestTs,
            http_status: httpStatus,
            is_valid: parsedResult.success,
            validation_status: parsedResult.success ? 'valid' : parsedResult.errors.join('; '),
            payload_json: raw as object,
            payload_hash: payloadHash,
          },
        });
        rawId = stored.id;
      } catch (err) {
        console.error(`Error storing raw quote for ${instrument}:`, err);
      }

      if (!parsedResult.success || parsedResult.candles.length === 0) {
        break;
      }

      for (const candle of parsedResult.candles) {
        allCandles.push({
          instrument,
          candle,
          rawId: rawId || BigInt(0),
        });
      }

      if (parsedResult.candles.length < 500) {
        break; // No more data
      }

      // Move from date to after last received candle's end timestamp
      const lastCandle = parsedResult.candles[parsedResult.candles.length - 1];
      const lastEnd = new Date(lastCandle.end);
      lastEnd.setMinutes(lastEnd.getMinutes() + 1);
      currentFrom = lastEnd;

      // Small delay to avoid hammering MOEX API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return allCandles;
  }
}
