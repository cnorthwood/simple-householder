import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  TextWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
  type FileEntry,
} from '@zip.js/zip.js/lib/zip-native.js';

const FIXTURE = resolve(import.meta.dirname, '../fixtures/synthetic-standard-text.tsv');
const SINGLE_FILE = resolve(import.meta.dirname, '../dist-single/index.html');

/** Build a Connect-style export: a zip holding UTF-16LE tab-separated text named .xls. */
async function connectZip(): Promise<Buffer> {
  const text = await readFile(FIXTURE, 'utf8');
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const writer = new ZipWriter(new Uint8ArrayWriter());
  await writer.add('StandardText20261112-1.xls', new Uint8ArrayReader(new Uint8Array(utf16)));
  return Buffer.from(await writer.close());
}

/** Record any request that isn't for the page's own static files. */
function watchNetwork(page: Page) {
  const unexpected: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    const local =
      ['localhost', '127.0.0.1'].includes(url.hostname) ||
      ['file:', 'blob:', 'data:'].includes(url.protocol);
    if (
      !local ||
      ['fetch', 'xhr', 'websocket', 'eventsource', 'ping'].includes(req.resourceType())
    ) {
      unexpected.push(`${req.resourceType()} ${req.url()}`);
    }
  });
  return unexpected;
}

async function runWizard(page: Page) {
  await expect(page.getByRole('heading', { name: 'Export your list from Connect' })).toBeVisible();
  await expect(page.getByText('Choose Export Format “Standard Text”')).toBeVisible();
  await page.getByRole('button', { name: 'I’ve got my .zip file' }).click();

  await expect(page.getByRole('heading', { name: 'Choose your file' })).toBeVisible();
  await page.getByLabel(/Choose file/).setInputFiles({
    name: 'StandardText20261112-1.zip',
    mimeType: 'application/zip',
    buffer: await connectZip(),
  });

  await expect(page.getByRole('heading', { name: 'Check your letters' })).toBeVisible();
  await expect(page.getByText('32 people will get 20 letters.')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Needs attention (2)' })).toBeVisible();
  await expect(page.getByText('Christopher Ashworth and Megan Ashworth')).toBeVisible();
  await expect(page.getByText('Hello Christopher and Megan')).toBeVisible();

  // Turning off the shared-house option households them instead.
  await page.getByLabel(/Give everyone in a large shared house their own letter/).uncheck();
  await expect(page.getByText('32 people will get 14 letters.')).toBeAttached();
  await page.getByLabel(/Give everyone in a large shared house their own letter/).check();
  await expect(page.getByText('32 people will get 20 letters.')).toBeAttached();

  await page.getByRole('button', { name: 'Create my download' }).click();
  await expect(page.getByRole('heading', { name: 'Download your letters' })).toBeVisible();
  const password = (await page.getByTestId('password').textContent()) ?? '';
  expect(password).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: /Download householded-addresses-.*\.zip/ }).click();
  const download = await downloadPromise;
  const path = await download.path();
  return { password, zip: new Uint8Array(await readFile(path)) };
}

async function readZip(zip: Uint8Array, password: string) {
  const reader = new ZipReader(new Uint8ArrayReader(zip), { password });
  const entries = (await reader.getEntries()) as FileEntry[];
  const files: Record<string, string> = {};
  for (const e of entries) {
    expect(e.encrypted).toBe(true);
    files[e.filename] = await e.getData(new TextWriter());
  }
  await reader.close();
  return files;
}

test('walks through the wizard and downloads an encrypted zip', async ({ page }) => {
  const unexpected = watchNetwork(page);
  await page.goto('/');
  const { password, zip } = await runWizard(page);

  const files = await readZip(zip, password);
  expect(Object.keys(files).sort()).toEqual([
    'addresses-for-printer.csv',
    'needs-attention.csv',
    'summary.txt',
  ]);
  const csv = files['addresses-for-printer.csv'] ?? '';
  expect(csv).toContain(
    'Christopher Ashworth and Megan Ashworth,Christopher Ashworth and Megan Ashworth,,Hello Christopher and Megan,12 Larkspur Road,,,Anytown,M99 1AA,2,Household',
  );
  expect(csv.trim().split('\r\n')).toHaveLength(21);
  expect(files['summary.txt']).toContain('32 people on 20 letters.');

  await expect(
    new ZipReader(new Uint8ArrayReader(zip), { password: 'wrong-password' })
      .getEntries()
      .then(([e]) => (e as FileEntry).getData(new TextWriter())),
  ).rejects.toThrow();

  expect(unexpected).toEqual([]);
});

test('explains when the wrong file is chosen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'I’ve got my .zip file' }).click();
  await page.getByLabel(/Choose file/).setInputFiles({
    name: 'holiday.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Dear diary'),
  });
  await expect(page.getByRole('alert')).toContainText('doesn’t look like a Connect export');
});

test('the offline single-file version works from disk', async ({ page }) => {
  const unexpected = watchNetwork(page);
  await page.goto(pathToFileURL(SINGLE_FILE).href);
  const { password, zip } = await runWizard(page);
  const files = await readZip(zip, password);
  expect(files['addresses-for-printer.csv']).toContain('Hello Christopher and Megan');
  expect(unexpected).toEqual([]);
});
