import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js/lib/zip-native.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');

/** Build a Connect-style export: a zip holding UTF-16LE tab-separated text named .xls. */
export async function connectZip(
  fixture: 'synthetic-standard-text.tsv' | 'synthetic-everyday.tsv' = 'synthetic-standard-text.tsv',
): Promise<Buffer> {
  const text = await readFile(resolve(FIXTURES, fixture), 'utf8');
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const writer = new ZipWriter(new Uint8ArrayWriter());
  await writer.add('StandardText20261112-1.xls', new Uint8ArrayReader(new Uint8Array(utf16)));
  return Buffer.from(await writer.close());
}
