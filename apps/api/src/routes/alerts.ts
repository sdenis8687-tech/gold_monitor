import type { FastifyInstance } from 'fastify';
import { prisma } from '@gold-monitor/db';

function toNumber(val: unknown): number {
  return parseFloat(String(val));
}

function serializeRule(rule: {
  id: bigint;
  metric: string;
  rule_type: string;
  threshold_value: object;
  cooldown_minutes: number;
  recipient_emails: string[];
  is_active: boolean;
}) {
  return {
    id: Number(rule.id),
    metric: rule.metric,
    rule_type: rule.rule_type,
    threshold_value: toNumber(rule.threshold_value),
    cooldown_minutes: rule.cooldown_minutes,
    recipient_emails: rule.recipient_emails,
    is_active: rule.is_active,
  };
}

export async function alertsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/alerts/rules', async (_req, reply) => {
    const rules = await prisma.alert_rules.findMany({
      orderBy: { id: 'asc' },
    });
    return reply.send(rules.map(serializeRule));
  });

  app.post('/api/alerts/rules', async (req, reply) => {
    const body = req.body as {
      metric: string;
      rule_type: string;
      threshold_value: number;
      cooldown_minutes: number;
      recipient_emails?: string[];
      is_active?: boolean;
    };

    if (!body.metric || !body.rule_type || body.threshold_value === undefined) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'Missing required fields' },
      });
    }

    const rule = await prisma.alert_rules.create({
      data: {
        metric: body.metric,
        rule_type: body.rule_type,
        threshold_value: body.threshold_value,
        cooldown_minutes: body.cooldown_minutes ?? 30,
        recipient_emails: body.recipient_emails ?? [],
        is_active: body.is_active ?? true,
      },
    });

    return reply.status(201).send(serializeRule(rule));
  });

  app.patch('/api/alerts/rules/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ruleId = parseInt(id);

    if (isNaN(ruleId)) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'Invalid rule ID' },
      });
    }

    const existing = await prisma.alert_rules.findUnique({
      where: { id: BigInt(ruleId) },
    });

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'BAD_REQUEST', message: 'Alert rule not found' },
      });
    }

    const body = req.body as Partial<{
      threshold_value: number;
      cooldown_minutes: number;
      is_active: boolean;
      recipient_emails: string[];
    }>;

    const updated = await prisma.alert_rules.update({
      where: { id: BigInt(ruleId) },
      data: {
        ...(body.threshold_value !== undefined && { threshold_value: body.threshold_value }),
        ...(body.cooldown_minutes !== undefined && { cooldown_minutes: body.cooldown_minutes }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        ...(body.recipient_emails !== undefined && { recipient_emails: body.recipient_emails }),
      },
    });

    return reply.send(serializeRule(updated));
  });
}
