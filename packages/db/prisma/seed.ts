import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding alert rules...');

  const existingCount = await prisma.alert_rules.count();
  if (existingCount > 0) {
    console.log(`Alert rules already exist (${existingCount} found), skipping seed`);
    return;
  }

  const toEmail = process.env.ALERT_TO_EMAILS || 'user@example.com';

  await prisma.alert_rules.createMany({
    data: [
      {
        metric: 'gold_585_rub_g',
        rule_type: 'ABS_DELTA',
        threshold_value: 50,
        cooldown_minutes: 30,
        recipient_emails: [toEmail],
        is_active: true,
      },
      {
        metric: 'gold_585_rub_g',
        rule_type: 'PCT_DELTA',
        threshold_value: 0.5,
        cooldown_minutes: 30,
        recipient_emails: [toEmail],
        is_active: true,
      },
      {
        metric: 'gold_585_rub_g',
        rule_type: 'DAILY_DIGEST',
        threshold_value: 0,
        cooldown_minutes: 1440,
        recipient_emails: [toEmail],
        is_active: true,
      },
    ],
  });

  console.log('Created 3 default alert rules');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
