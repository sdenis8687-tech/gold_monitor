import type { FastifyInstance } from 'fastify';
import { isValidRange } from '@gold-monitor/shared';
import { getLatestDerivedRow, getSeriesForRange, getLastSuccessfulFetch } from '../db-queries';

const STALE_THRESHOLD_MS =
  parseInt(process.env.STALE_THRESHOLD_MINUTES || '25') * 60 * 1000;

export async function quotesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/quotes/latest', async (_req, reply) => {
    const row = await getLatestDerivedRow();
    if (!row) {
      return reply.status(422).send({
        error: {
          code: 'SOURCE_DATA_UNAVAILABLE',
          message: 'No valid source data available',
        },
      });
    }

    const lastFetch = await getLastSuccessfulFetch();
    const isStale = lastFetch
      ? Date.now() - lastFetch.getTime() > STALE_THRESHOLD_MS
      : true;

    return reply.send({
      gold_585_rub_g: row.gold_585_rub_g,
      gold_999_rub_g: row.gold_999_rub_g,
      usd_rub: row.usd_rub,
      bucket_ts_utc: row.bucket_ts_utc.toISOString(),
      last_successful_fetch_utc: lastFetch ? lastFetch.toISOString() : null,
      is_stale: isStale,
      source: 'MOEX ISS',
    });
  });

  app.get('/api/quotes/history', async (req, reply) => {
    const { range = '7D' } = req.query as { range?: string };

    if (!isValidRange(range)) {
      return reply.status(400).send({
        error: { code: 'RANGE_NOT_SUPPORTED', message: `Unsupported range: ${range}` },
      });
    }

    const rows = await getSeriesForRange(range);

    if (rows.length === 0) {
      return reply.status(422).send({
        error: {
          code: 'SOURCE_DATA_UNAVAILABLE',
          message: 'No valid source data found for requested range',
        },
      });
    }

    const resolution = rows[0].resolution;

    return reply.send({
      range,
      resolution,
      series: {
        gold585: rows.map((r) => ({ ts: r.bucket_ts_utc.toISOString(), value: r.gold_585_rub_g })),
        usdRub: rows.map((r) => ({ ts: r.bucket_ts_utc.toISOString(), value: r.usd_rub })),
      },
      rows: rows.map((r) => ({
        ts: r.bucket_ts_utc.toISOString(),
        gold_585_rub_g: r.gold_585_rub_g,
        gold_999_rub_g: r.gold_999_rub_g,
        usd_rub: r.usd_rub,
      })),
      meta: {
        source: 'MOEX ISS',
      },
    });
  });
}
