import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { connectZip } from './helpers';

/** WCAG 2.2 A and AA rules that axe can check automatically. */
async function expectNoViolations(page: Page, step: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  const summary = violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
  expect(summary, `on the "${step}" step`).toEqual([]);
}

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile (320px, WCAG reflow)', width: 320, height: 640 },
]) {
  test(`every step meets WCAG 2.2 AA automated checks: ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await expectNoViolations(page, 'export');

    await page.getByRole('button', { name: 'I’ve got my .zip file' }).click();
    await expectNoViolations(page, 'file');

    await page.getByLabel(/Choose file/).setInputFiles({
      name: 'StandardText20261112-1.xls',
      mimeType: 'application/vnd.ms-excel',
      buffer: Buffer.from('not an export'),
    });
    await expect(page.getByRole('alert')).not.toBeEmpty();
    await expectNoViolations(page, 'file (with an error)');

    await page.getByLabel(/Choose file/).setInputFiles({
      name: 'StandardText20261112-1.zip',
      mimeType: 'application/zip',
      buffer: await connectZip(),
    });
    await expect(page.getByRole('heading', { name: 'Check your letters' })).toBeVisible();
    await expectNoViolations(page, 'check');

    await page.getByRole('button', { name: 'Create my download' }).click();
    await expect(page.getByRole('link', { name: /^Download / })).toBeVisible();
    await expectNoViolations(page, 'download');

    // No horizontal page scroll at 320px (1.4.10 Reflow); wide tables scroll in their own box.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('the page title says which step you are on (2.4.2)', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Export your list from Connect – Simple Householder');
  await page.getByRole('button', { name: 'I’ve got my .zip file' }).click();
  await expect(page).toHaveTitle('Choose your file – Simple Householder');
});

test('there is space between the last button and the footer', async ({ page }) => {
  await page.goto('./');
  const button = await page.getByRole('button', { name: 'I’ve got my .zip file' }).boundingBox();
  const footer = await page.locator('footer').boundingBox();
  expect((footer?.y ?? 0) - ((button?.y ?? 0) + (button?.height ?? 0))).toBeGreaterThanOrEqual(32);
});
