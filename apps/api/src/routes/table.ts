import type { FastifyInstance } from 'fastify';
import { isValidRange } from '@gold-monitor/shared';
import { getTableRows } from '../db-queries';

export async function tableRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/table', async (req, reply) => {
    const query = req.query as { range?: string; page?: string; pageSize?: string };
    const range = query.range || '30D';
    const page = Math.max(1, parseInt(query.page || '1'));
    const pageSize = Math.min(500, Math.max(1, parseInt(query.pageSize || '100')));

    if (!isValidRange(range)) {
      return reply.status(400).send({
        error: { code: 'RANGE_NOT_SUPPORTED', message: `Unsupported range: ${range}` },
      });
    }

    const { rows, totalRows, resolution } = await getTableRows(range, page, pageSize);

    return reply.send({
      range,
      resolution,
      page,
      pageSize,
      totalRows,
      rows: rows.map((r) => ({
        ts: r.bucket_ts_utc.toISOString(),
        gold_585_rub_g: r.gold_585_rub_g,
        gold_999_rub_g: r.gold_999_rub_g,
        usd_rub: r.usd_rub,
      })),
    });
  });
}
