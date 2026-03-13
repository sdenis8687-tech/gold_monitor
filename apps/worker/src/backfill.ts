/**
 * Backfill daily candles from MOEX ISS into the database.
 *
 * Usage (inside Docker):
 *   docker compose exec worker node dist/backfill.js
 *
 * Usage (locally, with port-forwarded postgres):
 *   DATABASE_URL=postgresql://gold:goldpass@localhost:5432/goldmonitor \
 *     npx ts-node --compiler-options '{"module":"CommonJS"}' src/backfill.ts
 */
import { prisma } from '@gold-monitor/db';
import { gold585FromGold999, formatDateForMoex } from '@gold-monitor/shared';
import { MoexIssClient } from './moex-client';
import { parseCandleResponse } from './parser';
import type { MoexCandle } from '@gold-monitor/shared';
import crypto from 'crypto';

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

function parseMoexDateTime(dtStr: string): Date {
  const dt = new Date(dtStr.replace(' ', 'T') + '+03:00');
  if (isNaN(dt.getTime())) throw new Error(`Invalid MOEX datetime: "${dtStr}"`);
  return dt;
}

interface StoredCandle {
  instrument: string;
  candle: MoexCandle;
  rawId: bigint;
}

async function fetchAllDailyCandles(
  client: MoexIssClient,
  instrument: string,
  from: Date,
  till: Date,
): Promise<StoredCandle[]> {
  const all: StoredCandle[] = [];
  let currentFrom = new Date(from);

  while (currentFrom < till) {
    console.log(`  Fetching ${instrument} daily from ${formatDateForMoex(currentFrom)}...`);

    const result = await client.fetchCandles(instrument, currentFrom, till, 24);
    const payloadHash = hashPayload(result.raw);
    const parsed = parseCandleResponse(result.raw);

    // Store raw response
    let rawId: bigint = BigInt(0);
    try {
      const stored = await prisma.raw_quotes.upsert({
        where: {
          instrument_endpoint_kind_payload_hash: {
            instrument,
            endpoint_kind: 'candles_daily',
            payload_hash: payloadHash,
          },
        },
        update: {},
        create: {
          source: 'MOEX_ISS',
          instrument,
          endpoint_kind: 'candles_daily',
          resolution_hint: 'daily',
          request_ts_utc: new Date(),
          http_status: result.httpStatus,
          is_valid: parsed.success,
          validation_status: parsed.success ? 'valid' : parsed.errors.join('; '),
          payload_json: result.raw as object,
          payload_hash: payloadHash,
        },
      });
      rawId = stored.id;
    } catch (err) {
      console.error(`  Error storing raw quote for ${instrument}:`, err);
    }

    if (!parsed.success || parsed.candles.length === 0) {
      console.log(`  No more candles for ${instrument}`);
      break;
    }

    console.log(`  Got ${parsed.candles.length} candles`);

    for (const candle of parsed.candles) {
      all.push({ instrument, candle, rawId });
    }

    if (parsed.candles.length < 500) {
      break;
    }

    const lastCandle = parsed.candles[parsed.candles.length - 1];
    const lastEnd = new Date(lastCandle.end.replace(' ', 'T') + '+03:00');
    lastEnd.setDate(lastEnd.getDate() + 1);
    currentFrom = lastEnd;

    await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

async function main() {
  const from = new Date('2026-01-01T00:00:00+03:00');
  const till = new Date();

  console.log(`=== Backfill daily candles: ${formatDateForMoex(from)} → ${formatDateForMoex(till)} ===`);

  const client = new MoexIssClient();

  console.log('\nFetching GOLD candles...');
  const goldCandles = await fetchAllDailyCandles(client, INSTRUMENTS.GOLD, from, till);
  console.log(`Total gold candles: ${goldCandles.length}`);

  console.log('\nFetching USD candles...');
  const usdCandles = await fetchAllDailyCandles(client, INSTRUMENTS.USD, from, till);
  console.log(`Total USD candles: ${usdCandles.length}`);

  // Build lookup maps
  const goldMap = new Map<string, StoredCandle>();
  const usdMap = new Map<string, StoredCandle>();

  for (const item of goldCandles) goldMap.set(item.candle.begin, item);
  for (const item of usdCandles) usdMap.set(item.candle.begin, item);

  // Match and upsert derived quotes
  let matched = 0;
  let matchedStale = 0;

  for (const [ts, goldItem] of goldMap) {
    let usdItem = usdMap.get(ts);
    let usdIsStale = false;

    // If no exact match, try nearest available USD (any date) — fallback for periods
    // where MOEX doesn't have USD candles (e.g. USD000UTSTOM history starts later)
    if (!usdItem) {
      const goldTime = parseMoexDateTime(ts).getTime();
      let nearest: StoredCandle | null = null;
      let nearestDiff = Infinity;

      for (const [usdTs, usdCandleItem] of usdMap) {
        const diff = Math.abs(parseMoexDateTime(usdTs).getTime() - goldTime);
        if (diff < nearestDiff) {
          nearestDiff = diff;
          nearest = usdCandleItem;
        }
      }

      if (nearest) {
        usdItem = nearest;
        usdIsStale = nearestDiff > 24 * 60 * 60 * 1000; // stale if > 1 day away
      }
    }

    if (!usdItem) continue;

    const bucketTs = parseMoexDateTime(ts);

    await prisma.derived_quotes.upsert({
      where: {
        resolution_bucket_ts_utc: {
          resolution: 'daily',
          bucket_ts_utc: bucketTs,
        },
      },
      update: {
        gold_999_rub_g: goldItem.candle.close,
        gold_585_rub_g: gold585FromGold999(goldItem.candle.close),
        usd_rub: usdItem.candle.close,
      },
      create: {
        resolution: 'daily',
        bucket_ts_utc: bucketTs,
        gold_source_ts_utc: parseMoexDateTime(goldItem.candle.begin),
        usd_source_ts_utc: parseMoexDateTime(usdItem.candle.begin),
        gold_999_rub_g: goldItem.candle.close,
        gold_585_rub_g: gold585FromGold999(goldItem.candle.close),
        usd_rub: usdItem.candle.close,
        gold_is_stale: false,
        usd_is_stale: usdIsStale,
        row_status: 'valid',
        raw_gold_id: goldItem.rawId,
        raw_usd_id: usdItem.rawId,
      },
    });

    if (usdIsStale) matchedStale++; else matched++;
    const total = matched + matchedStale;
    if (total % 20 === 0) {
      console.log(`  Upserted ${total} derived quotes...`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Matched (exact USD): ${matched}`);
  console.log(`Matched (nearest USD, stale): ${matchedStale}`);

  const total = await prisma.derived_quotes.count({ where: { resolution: 'daily' } });
  console.log(`Total daily derived_quotes in DB: ${total}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
