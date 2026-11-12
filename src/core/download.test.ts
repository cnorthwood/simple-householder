import { describe, expect, it } from 'vitest';
import { BlobReader, ZipReader } from '@zip.js/zip.js/lib/zip-native.js';
import { buildDownload, downloadFileName, downloadFiles } from './download';
import { DEFAULT_OPTIONS, household } from './household';
import { parseExportText } from './parseExport';
import { elector, fixtureText } from './testing/fixtures';

const date = new Date(2026, 10, 12, 19, 30);

describe('download (PW-1)', () => {
  const parsed = parseExportText(fixtureText(), 'Export.xls');
  const result = household(parsed.electors);

  it('contains the printer file, summary and needs-attention list', () => {
    expect(downloadFiles(parsed, result, DEFAULT_OPTIONS, date).map((f) => f.name)).toEqual([
      'addresses-for-printer.csv',
      'summary.txt',
      'needs-attention.csv',
    ]);
  });

  it('leaves out the needs-attention list when there is nothing in it', () => {
    const clean = {
      fileName: 'x.xls',
      electors: [elector()],
      duplicatesRemoved: 0,
      extraColumns: [],
    };
    const files = downloadFiles(clean, household(clean.electors), DEFAULT_OPTIONS, date);
    expect(files.map((f) => f.name)).toEqual(['addresses-for-printer.csv', 'summary.txt']);
  });

  it('is named with the date', () => {
    expect(downloadFileName(date)).toBe('householded-addresses-2026-11-12.zip');
  });

  it('is an encrypted zip', async () => {
    const { blob } = await buildDownload(parsed, result, DEFAULT_OPTIONS, 'a-b-c-d', date);
    const reader = new ZipReader(new BlobReader(blob));
    const entries = await reader.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.encrypted)).toBe(true);
    await reader.close();
  });
});
