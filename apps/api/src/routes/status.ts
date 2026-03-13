import type { FastifyInstance } from 'fastify';
import { getLastSuccessfulFetch, getLastInstrumentStatus } from '../db-queries';

const POLL_INTERVAL_MINUTES = parseInt(process.env.POLL_INTERVAL_MINUTES || '5');
const STALE_THRESHOLD_MINUTES = parseInt(process.env.STALE_THRESHOLD_MINUTES || '25');
const STALE_THRESHOLD_MS = STALE_THRESHOLD_MINUTES * 60 * 1000;

export async function statusRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/source/status', async (_req, reply) => {
    const [lastFetch, lastGoldStatus, lastUsdStatus] = await Promise.all([
      getLastSuccessfulFetch(),
      getLastInstrumentStatus('GLDRUB_TOM'),
      getLastInstrumentStatus('USD000UTSTOM'),
    ]);

    const isStale = lastFetch
      ? Date.now() - lastFetch.getTime() > STALE_THRESHOLD_MS
      : true;

    return reply.send({
      source: 'MOEX ISS',
      poll_interval_minutes: POLL_INTERVAL_MINUTES,
      stale_threshold_minutes: STALE_THRESHOLD_MINUTES,
      last_successful_fetch_utc: lastFetch ? lastFetch.toISOString() : null,
      is_stale: isStale,
      last_gold_status: lastGoldStatus,
      last_usd_status: lastUsdStatus,
    });
  });
}
