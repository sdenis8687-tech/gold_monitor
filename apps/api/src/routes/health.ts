import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      service: 'gold-monitor-api',
      time_utc: new Date().toISOString(),
    });
  });
}
