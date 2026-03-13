import { prisma } from '@gold-monitor/db';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface AlertCheckContext {
  gold585: number;
  gold999: number;
  usdRub: number;
}

export class AlertEngine {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      console.warn('SMTP_HOST not configured, email alerts disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        user && pass
          ? {
              user,
              pass,
            }
          : undefined,
    });
  }

  async check(gold585: number, gold999: number, usdRub: number): Promise<void> {
    const ctx: AlertCheckContext = { gold585, gold999, usdRub };

    try {
      const activeRules = await prisma.alert_rules.findMany({
        where: { is_active: true },
      });

      for (const rule of activeRules) {
        try {
          await this.checkRule(rule, ctx);
        } catch (err) {
          console.error(`Error checking alert rule ${rule.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Error fetching alert rules:', err);
    }
  }

  private async checkRule(
    rule: {
      id: bigint;
      metric: string;
      rule_type: string;
      threshold_value: { toNumber(): number };
      cooldown_minutes: number;
      recipient_emails: string[];
    },
    ctx: AlertCheckContext,
  ): Promise<void> {
    const metricValue = this.getMetricValue(rule.metric, ctx);
    if (metricValue === null) {
      return;
    }

    // Check cooldown
    const cooldownOk = await this.checkCooldown(rule.id, rule.cooldown_minutes);
    if (!cooldownOk) {
      return;
    }

    const threshold = rule.threshold_value.toNumber();

    switch (rule.rule_type) {
      case 'ABS_DELTA':
        await this.checkAbsDelta(rule, metricValue, threshold, ctx);
        break;
      case 'PCT_DELTA':
        await this.checkPctDelta(rule, metricValue, threshold, ctx);
        break;
      case 'DAILY_DIGEST':
        await this.checkDailyDigest(rule, metricValue, ctx);
        break;
      default:
        console.warn(`Unknown rule type: ${rule.rule_type}`);
    }
  }

  private getMetricValue(metric: string, ctx: AlertCheckContext): number | null {
    switch (metric) {
      case 'gold_585_rub_g':
        return ctx.gold585;
      case 'gold_999_rub_g':
        return ctx.gold999;
      case 'usd_rub':
        return ctx.usdRub;
      default:
        console.warn(`Unknown metric: ${metric}`);
        return null;
    }
  }

  private async checkCooldown(ruleId: bigint, cooldownMinutes: number): Promise<boolean> {
    const cooldownAgo = new Date(Date.now() - cooldownMinutes * 60 * 1000);

    const lastEvent = await prisma.alert_events.findFirst({
      where: {
        rule_id: ruleId,
        triggered_at_utc: {
          gte: cooldownAgo,
        },
      },
      orderBy: {
        triggered_at_utc: 'desc',
      },
    });

    return !lastEvent;
  }

  private async checkAbsDelta(
    rule: { id: bigint; metric: string; rule_type: string; recipient_emails: string[] },
    currentValue: number,
    threshold: number,
    _ctx: AlertCheckContext,
  ): Promise<void> {
    // Get previous value from last 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previousQuote = await prisma.derived_quotes.findFirst({
      where: {
        bucket_ts_utc: { gte: dayAgo },
        resolution: 'intraday',
      },
      orderBy: { bucket_ts_utc: 'asc' },
    });

    if (!previousQuote) {
      return;
    }

    const previousValue = this.getQuoteMetricValue(rule.metric, previousQuote);
    if (previousValue === null) {
      return;
    }

    const deltaAbs = Math.abs(currentValue - previousValue);

    if (deltaAbs >= threshold) {
      await this.triggerAlert(rule, currentValue, deltaAbs, null);
    }
  }

  private async checkPctDelta(
    rule: { id: bigint; metric: string; rule_type: string; recipient_emails: string[] },
    currentValue: number,
    threshold: number,
    _ctx: AlertCheckContext,
  ): Promise<void> {
    // Get previous value from last 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previousQuote = await prisma.derived_quotes.findFirst({
      where: {
        bucket_ts_utc: { gte: dayAgo },
        resolution: 'intraday',
      },
      orderBy: { bucket_ts_utc: 'asc' },
    });

    if (!previousQuote) {
      return;
    }

    const previousValue = this.getQuoteMetricValue(rule.metric, previousQuote);
    if (previousValue === null || previousValue === 0) {
      return;
    }

    const deltaAbs = currentValue - previousValue;
    const deltaPct = Math.abs((deltaAbs / previousValue) * 100);

    if (deltaPct >= threshold) {
      await this.triggerAlert(rule, currentValue, Math.abs(deltaAbs), deltaPct);
    }
  }

  private async checkDailyDigest(
    rule: { id: bigint; metric: string; rule_type: string; recipient_emails: string[] },
    currentValue: number,
    _ctx: AlertCheckContext,
  ): Promise<void> {
    // DAILY_DIGEST: trigger once per day (cooldown already checked)
    await this.triggerAlert(rule, currentValue, null, null);
  }

  private getQuoteMetricValue(
    metric: string,
    quote: { gold_585_rub_g: { toNumber(): number }; gold_999_rub_g: { toNumber(): number }; usd_rub: { toNumber(): number } },
  ): number | null {
    switch (metric) {
      case 'gold_585_rub_g':
        return quote.gold_585_rub_g.toNumber();
      case 'gold_999_rub_g':
        return quote.gold_999_rub_g.toNumber();
      case 'usd_rub':
        return quote.usd_rub.toNumber();
      default:
        return null;
    }
  }

  private async triggerAlert(
    rule: { id: bigint; metric: string; rule_type: string; recipient_emails: string[] },
    metricValue: number,
    deltaAbs: number | null,
    deltaPct: number | null,
  ): Promise<void> {
    const triggeredAt = new Date();

    let deliveryStatus = 'pending';
    let deliveryError: string | null = null;

    // Send email
    if (this.transporter && rule.recipient_emails.length > 0) {
      try {
        await this.sendAlertEmail(rule, metricValue, deltaAbs, deltaPct);
        deliveryStatus = 'sent';
      } catch (err) {
        deliveryStatus = 'failed';
        deliveryError = err instanceof Error ? err.message : String(err);
        console.error(`Failed to send alert email for rule ${rule.id}:`, err);
      }
    } else {
      deliveryStatus = 'skipped_no_smtp';
    }

    // Record alert event
    await prisma.alert_events.create({
      data: {
        rule_id: rule.id,
        metric: rule.metric,
        rule_type: rule.rule_type,
        metric_value: metricValue,
        delta_abs: deltaAbs,
        delta_pct: deltaPct,
        triggered_at_utc: triggeredAt,
        delivery_status: deliveryStatus,
        delivery_error: deliveryError,
      },
    });

    console.log(
      `Alert triggered: rule=${rule.id}, metric=${rule.metric}, type=${rule.rule_type}, value=${metricValue}, deltaAbs=${deltaAbs}, deltaPct=${deltaPct}`,
    );
  }

  private async sendAlertEmail(
    rule: { metric: string; rule_type: string; recipient_emails: string[] },
    metricValue: number,
    deltaAbs: number | null,
    deltaPct: number | null,
  ): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP not configured');
    }

    const fromEmail = process.env.ALERT_FROM_EMAIL || 'alerts@example.com';
    const subject = `Gold Monitor Alert: ${rule.rule_type} for ${rule.metric}`;

    let body = `Alert triggered for metric: ${rule.metric}\n`;
    body += `Rule type: ${rule.rule_type}\n`;
    body += `Current value: ${metricValue}\n`;
    if (deltaAbs !== null) body += `Delta (absolute): ${deltaAbs.toFixed(2)}\n`;
    if (deltaPct !== null) body += `Delta (%): ${deltaPct.toFixed(2)}%\n`;
    body += `\nTime: ${new Date().toISOString()}`;

    await this.transporter.sendMail({
      from: fromEmail,
      to: rule.recipient_emails.join(', '),
      subject,
      text: body,
    });
  }
}
