import { test, expect } from '@playwright/test';

test.describe('Gold Monitor Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads and shows title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Gold Monitor');
  });

  test('KPI cards are visible after load', async ({ page }) => {
    // Wait for loading to complete (KPI values appear)
    await expect(page.locator('text=Золото 585, ₽/г')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Золото 999, ₽/г')).toBeVisible();
    await expect(page.locator('text=USD/RUB')).toBeVisible();
    await expect(page.locator('text=Последнее обновление')).toBeVisible();
  });

  test('three charts are present (combined + individual)', async ({ page }) => {
    await page.waitForSelector('[data-testid="combined-chart"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="gold-chart"]');
    await page.waitForSelector('[data-testid="usd-chart"]');

    await expect(page.locator('[data-testid="combined-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="gold-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="usd-chart"]')).toBeVisible();
  });

  test('gold chart label says 585, not 999', async ({ page }) => {
    await page.waitForSelector('[data-testid="gold-chart"]', { timeout: 15000 });
    // The chart header should say 585
    await expect(page.locator('text=Золото 585, ₽/г').first()).toBeVisible();
    // No standalone 999 chart header
    const usd999ChartHeaders = page.locator('h3:has-text("999")');
    await expect(usd999ChartHeaders).toHaveCount(0);
  });

  test('range switcher works', async ({ page }) => {
    await page.waitForSelector('[data-testid="gold-chart"]', { timeout: 15000 });

    // Click 7D range
    await page.locator('button:has-text("7D")').click();
    // Page should still show charts (not error)
    await expect(page.locator('[data-testid="gold-chart"]')).toBeVisible();

    // Click 1Y range
    await page.locator('button:has-text("1Y")').click();
    await expect(page.locator('[data-testid="gold-chart"]')).toBeVisible();
  });

  test('combined chart has dual-axis header', async ({ page }) => {
    await page.waitForSelector('[data-testid="combined-chart"]', { timeout: 15000 });
    await expect(page.locator('text=Золото 585 + USD/RUB')).toBeVisible();
  });

  test('table mode shows table with correct columns', async ({ page }) => {
    await page.waitForSelector('[data-testid="gold-chart"]', { timeout: 15000 });

    await page.locator('[data-testid="table-toggle"]').click();

    // Table should appear
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Check required columns
    await expect(page.locator('th:has-text("585")')).toBeVisible();
    await expect(page.locator('th:has-text("999")')).toBeVisible();
    await expect(page.locator('th:has-text("USD")')).toBeVisible();
    await expect(page.locator('th:has-text("Дата")')).toBeVisible();
  });

  test('switching back from table to charts works', async ({ page }) => {
    await page.waitForSelector('[data-testid="gold-chart"]', { timeout: 15000 });

    await page.locator('[data-testid="table-toggle"]').click();
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="table-toggle"]').click();
    await expect(page.locator('[data-testid="gold-chart"]')).toBeVisible();
  });
});
