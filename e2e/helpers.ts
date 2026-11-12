import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js/lib/zip-native.js';

const FIXTURE = resolve(import.meta.dirname, '../fixtures/synthetic-standard-text.tsv');

/** Build a Connect-style export: a zip holding UTF-16LE tab-separated text named .xls. */
export async function connectZip(): Promise<Buffer> {
  const text = await readFile(FIXTURE, 'utf8');
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  const writer = new ZipWriter(new Uint8ArrayWriter());
  await writer.add('StandardText20261112-1.xls', new Uint8ArrayReader(new Uint8Array(utf16)));
  return Buffer.from(await writer.close());
}
