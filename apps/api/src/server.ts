import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health';
import { quotesRoutes } from './routes/quotes';
import { dashboardRoutes } from './routes/dashboard';
import { tableRoutes } from './routes/table';
import { statusRoutes } from './routes/status';
import { alertsRoutes } from './routes/alerts';

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  await app.register(cors, {
    origin: process.env.WEB_URL || true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  });

  // Global error handler
  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  // Register routes
  await app.register(healthRoutes);
  await app.register(quotesRoutes);
  await app.register(dashboardRoutes);
  await app.register(tableRoutes);
  await app.register(statusRoutes);
  await app.register(alertsRoutes);

  return app;
}
