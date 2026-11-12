import { expect, test } from '@playwright/test';

test('loads and explains the privacy promise', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Simple Householder' })).toBeVisible();
  await expect(page.getByText('Your data stays on your computer.')).toBeVisible();
});

test('makes no network requests beyond its own static files', async ({ page, baseURL }) => {
  const offOrigin: string[] = [];
  const dynamic: string[] = [];
  page.on('request', (req) => {
    if (!req.url().startsWith(baseURL ?? '')) offOrigin.push(req.url());
    if (['fetch', 'xhr', 'websocket', 'eventsource', 'ping'].includes(req.resourceType())) {
      dynamic.push(req.url());
    }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(offOrigin).toEqual([]);
  expect(dynamic).toEqual([]);
});

test('Content Security Policy blocks outbound connections', async ({ page }) => {
  await page.goto('/');
  const blocked = await page.evaluate(async () => {
    try {
      await fetch('https://example.com/', { mode: 'no-cors' });
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});
