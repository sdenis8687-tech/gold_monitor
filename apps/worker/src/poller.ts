import { prisma } from '@gold-monitor/db';
import { gold585FromGold999, isStale } from '@gold-monitor/shared';
import { MoexIssClient } from './moex-client';
import { parseLatestResponse } from './parser';
import { AlertEngine } from './alerts';
import crypto from 'crypto';

const INSTRUMENTS = {
  GOLD: 'GLDRUB_TOM',
  USD: 'USD000UTSTOM',
};

const STALE_THRESHOLD_MINUTES = parseInt(process.env.STALE_THRESHOLD_MINUTES || '25');
const POLL_INTERVAL_MINUTES = parseInt(process.env.POLL_INTERVAL_MINUTES || '5');

/**
 * MOEX returns UPDATETIME as "HH:MM:SS" (Moscow time, UTC+3).
 * Combine with today's UTC date and subtract 3 hours to get UTC datetime.
 */
function parseMoexTime(timeStr: string | null): Date | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, h, m, s] = match.map(Number);
  const now = new Date();
  const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h - 3, m, s));
  return isNaN(dt.getTime()) ? null : dt;
}

function hashPayload(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .substring(0, 64);
}

export class Poller {
  private client: MoexIssClient;
  private alertEngine: AlertEngine;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(client?: MoexIssClient) {
    this.client = client || new MoexIssClient();
    this.alertEngine = new AlertEngine();
  }

  start(): void {
    console.log(`Starting poller with ${POLL_INTERVAL_MINUTES} minute interval`);

    // Run immediately
    this.poll().catch(console.error);

    // Then poll on interval
    this.intervalId = setInterval(
      () => {
        this.poll().catch(console.error);
      },
      POLL_INTERVAL_MINUTES * 60 * 1000,
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('Poller stopped');
  }

  async poll(): Promise<void> {
    if (this.isRunning) {
      console.log('Poll already in progress, skipping');
      return;
    }

    this.isRunning = true;
    console.log(`[${new Date().toISOString()}] Polling MOEX...`);

    try {
      const [goldResult, usdResult] = await Promise.allSettled([
        this.fetchAndStore(INSTRUMENTS.GOLD),
        this.fetchAndStore(INSTRUMENTS.USD),
      ]);

      let goldData: { last: number; updatetime: string | null; rawId: bigint } | null = null;
      let usdData: { last: number; updatetime: string | null; rawId: bigint } | null = null;

      if (goldResult.status === 'fulfilled') {
        goldData = goldResult.value;
      } else {
        console.error('Gold fetch failed:', goldResult.reason);
      }

      if (usdResult.status === 'fulfilled') {
        usdData = usdResult.value;
      } else {
        console.error('USD fetch failed:', usdResult.reason);
      }

      if (!goldData || !usdData) {
        console.warn('Cannot create derived quote: missing gold or USD data');
        return;
      }

      const bucketTs = new Date();
      const goldSourceTs = parseMoexTime(goldData.updatetime);
      const usdSourceTs = parseMoexTime(usdData.updatetime);
      const goldIsStale = isStale(goldSourceTs ?? null, STALE_THRESHOLD_MINUTES);
      const usdIsStale = isStale(usdSourceTs ?? null, STALE_THRESHOLD_MINUTES);

      const gold585 = gold585FromGold999(goldData.last);

      // Upsert derived quote
      await prisma.derived_quotes.upsert({
        where: {
          resolution_bucket_ts_utc: {
            resolution: 'intraday',
            bucket_ts_utc: bucketTs,
          },
        },
        update: {
          gold_999_rub_g: goldData.last,
          gold_585_rub_g: gold585,
          usd_rub: usdData.last,
          gold_is_stale: goldIsStale,
          usd_is_stale: usdIsStale,
        },
        create: {
          resolution: 'intraday',
          bucket_ts_utc: bucketTs,
          gold_source_ts_utc: goldSourceTs,
          usd_source_ts_utc: usdSourceTs,
          gold_999_rub_g: goldData.last,
          gold_585_rub_g: gold585,
          usd_rub: usdData.last,
          gold_is_stale: goldIsStale,
          usd_is_stale: usdIsStale,
          row_status: 'valid',
          raw_gold_id: goldData.rawId,
          raw_usd_id: usdData.rawId,
        },
      });

      console.log(
        `[${bucketTs.toISOString()}] Stored: gold999=${goldData.last}, gold585=${gold585}, usd=${usdData.last}`,
      );

      // Run alert checks
      await this.alertEngine.check(gold585, goldData.last, usdData.last);
    } catch (err) {
      console.error('Poll error:', err);
    } finally {
      this.isRunning = false;
    }
  }

  private async fetchAndStore(
    instrument: string,
  ): Promise<{ last: number; updatetime: string | null; rawId: bigint }> {
    const requestTs = new Date();
    const result = await this.client.fetchLatest(instrument);
    const payloadHash = hashPayload(result.raw);

    const parsed = parseLatestResponse(result.raw, instrument);

    let rawId: bigint;
    try {
      const stored = await prisma.raw_quotes.upsert({
        where: {
          instrument_endpoint_kind_payload_hash: {
            instrument,
            endpoint_kind: 'latest',
            payload_hash: payloadHash,
          },
        },
        update: {
          request_ts_utc: requestTs,
        },
        create: {
          source: 'MOEX_ISS',
          instrument,
          endpoint_kind: 'latest',
          resolution_hint: 'latest',
          request_ts_utc: requestTs,
          source_ts_utc: parseMoexTime(parsed.data?.updatetime ?? null),
          http_status: result.httpStatus,
          is_valid: parsed.success,
          validation_status: parsed.success ? 'valid' : parsed.errors.join('; '),
          payload_json: result.raw as object,
          payload_hash: payloadHash,
        },
      });
      rawId = stored.id;
    } catch (err) {
      console.error(`Error storing raw quote for ${instrument}:`, err);
      rawId = BigInt(0);
    }

    if (!parsed.success || !parsed.data?.last) {
      throw new Error(`Failed to parse ${instrument} latest quote: ${parsed.errors.join('; ')}`);
    }

    return {
      last: parsed.data.last,
      updatetime: parsed.data.updatetime,
      rawId,
    };
  }
}
