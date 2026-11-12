import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  TextWriter,
  Uint8ArrayReader,
  ZipReader,
  type FileEntry,
} from '@zip.js/zip.js/lib/zip-native.js';
import { connectZip } from './helpers';

const SINGLE_FILE = resolve(import.meta.dirname, '../dist-single/index.html');

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

async function chooseMode(page: Page, mode: RegExp) {
  await expect(page.getByRole('heading', { name: 'What are you making?' })).toBeVisible();
  await page.getByRole('radio', { name: mode }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function download(page: Page) {
  await page.getByRole('button', { name: 'Create my download' }).click();
  await expect(page.getByRole('heading', { name: 'Download your letters' })).toBeVisible();
  const password = (await page.getByTestId('password').textContent()) ?? '';
  expect(password).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: /Download householded-addresses-.*\.zip/ }).click();
  const path = await (await downloadPromise).path();
  return { password, zip: new Uint8Array(await readFile(path)) };
}

async function runWizard(page: Page) {
  await chooseMode(page, /General Election/);
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
  await expect(page.getByText('Christopher and Megan')).toBeVisible();

  // Turning off the shared-house option households them instead.
  await page.getByLabel(/Give everyone in a large shared house their own letter/).uncheck();
  await expect(page.getByText('32 people will get 14 letters.')).toBeAttached();
  await page.getByLabel(/Give everyone in a large shared house their own letter/).check();
  await expect(page.getByText('32 people will get 20 letters.')).toBeAttached();

  return download(page);
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
    'Christopher Ashworth and Megan Ashworth,Christopher Ashworth and Megan Ashworth,,Christopher and Megan,12 Larkspur Road,,,Anytown,M99 1AA,2,Household',
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

test('everyday mode sorts by walk and shortens names', async ({ page }) => {
  await page.goto('/');
  await chooseMode(page, /Everyday exporting/);
  await expect(page.getByText(/Customize export/)).toBeVisible();
  await page.getByRole('button', { name: 'I’ve got my .zip file' }).click();
  await page.getByLabel(/Choose file/).setInputFiles({
    name: 'StandardText20261112-2.zip',
    mimeType: 'application/zip',
    buffer: await connectZip('synthetic-everyday.tsv'),
  });
  await expect(page.getByText('16 people will get 10 letters.')).toBeAttached();
  await expect(page.getByText(/can’t be sent as Royal Mail candidate mail/)).toBeVisible();
  await expect(page.getByText('6 people had no walk in Connect')).toBeVisible();
  await expect(page.getByText('Christopher & Megan Ashworth')).toBeVisible();

  const { password, zip } = await download(page);
  const files = await readZip(zip, password);
  const csv = files['addresses-by-walk.csv'] ?? '';
  const lines = csv.trim().split('\r\n');
  expect(lines).toHaveLength(11);
  expect(lines[1]).toContain('Christopher & Megan Ashworth');
  expect(lines[1]).toContain('9A 01 Larkspur Road,9A,1; 2');
  expect(lines[10]).toContain('9B (no walk)');
});

test('everyday mode asks for the customised export if given a standard one', async ({ page }) => {
  await page.goto('/');
  await chooseMode(page, /Everyday exporting/);
  await page.getByRole('button', { name: 'I’ve got my .zip file' }).click();
  await page.getByLabel(/Choose file/).setInputFiles({
    name: 'StandardText20261112-1.zip',
    mimeType: 'application/zip',
    buffer: await connectZip(),
  });
  await expect(page.getByRole('alert')).toContainText('DefaultWalkName');
  await expect(page.getByRole('alert')).toContainText('customise your export');
});

test('explains when the wrong file is chosen', async ({ page }) => {
  await page.goto('/');
  await chooseMode(page, /General Election/);
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
  expect(files['addresses-for-printer.csv']).toContain('Christopher and Megan');
  expect(unexpected).toEqual([]);
});
