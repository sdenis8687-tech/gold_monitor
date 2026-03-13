import type { FastifyInstance } from 'fastify';
import { isValidRange, rangeToResolution } from '@gold-monitor/shared';
import {
  getLatestDerivedRow,
  getSeriesForRange,
  getLastSuccessfulFetch,
} from '../db-queries';

const STALE_THRESHOLD_MS =
  parseInt(process.env.STALE_THRESHOLD_MINUTES || '25') * 60 * 1000;

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/dashboard', async (req, reply) => {
    const { range = '30D' } = req.query as { range?: string };

    if (!isValidRange(range)) {
      return reply.status(400).send({
        error: { code: 'RANGE_NOT_SUPPORTED', message: `Unsupported range: ${range}` },
      });
    }

    const [latestRow, seriesRows, lastFetch] = await Promise.all([
      getLatestDerivedRow(),
      getSeriesForRange(range),
      getLastSuccessfulFetch(),
    ]);

    if (!latestRow) {
      return reply.status(422).send({
        error: {
          code: 'SOURCE_DATA_UNAVAILABLE',
          message: 'No valid source data available',
        },
      });
    }

    const isStale = lastFetch
      ? Date.now() - lastFetch.getTime() > STALE_THRESHOLD_MS
      : true;

    const resolution = rangeToResolution(range);

    const tablePreview = seriesRows.slice(-10).reverse().map((r) => ({
      ts: r.bucket_ts_utc.toISOString(),
      gold_585_rub_g: r.gold_585_rub_g,
      gold_999_rub_g: r.gold_999_rub_g,
      usd_rub: r.usd_rub,
    }));

    return reply.send({
      latest: {
        gold_585_rub_g: latestRow.gold_585_rub_g,
        gold_999_rub_g: latestRow.gold_999_rub_g,
        usd_rub: latestRow.usd_rub,
        bucket_ts_utc: latestRow.bucket_ts_utc.toISOString(),
        last_successful_fetch_utc: lastFetch ? lastFetch.toISOString() : null,
        is_stale: isStale,
        source: 'MOEX ISS',
      },
      series: {
        gold585: seriesRows.map((r) => ({
          ts: r.bucket_ts_utc.toISOString(),
          value: r.gold_585_rub_g,
        })),
        usdRub: seriesRows.map((r) => ({
          ts: r.bucket_ts_utc.toISOString(),
          value: r.usd_rub,
        })),
      },
      tablePreview,
      meta: {
        range,
        resolution,
        table_supported: true,
        source: 'MOEX ISS',
      },
    });
  });
}
