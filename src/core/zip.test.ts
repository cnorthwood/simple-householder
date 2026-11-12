import { describe, expect, it } from 'vitest';
import {
  BlobReader,
  TextWriter,
  ZipReader,
  type FileEntry,
} from '@zip.js/zip.js/lib/zip-native.js';
import { createEncryptedZip } from './zip';

describe('createEncryptedZip (PW-1)', () => {
  const files = [
    { name: 'addresses.csv', content: 'Addressee\r\nZoë Ó Briain\r\n' },
    { name: 'summary.txt', content: 'Summary' },
  ];

  it('encrypts every file with AES-256', async () => {
    const blob = await createEncryptedZip(files, 'orbit-candle-mosaic-thrift');
    const reader = new ZipReader(new BlobReader(blob));
    const entries = await reader.getEntries();
    expect(entries.map((e) => [e.filename, e.encrypted, e.zipCrypto])).toEqual([
      ['addresses.csv', true, false],
      ['summary.txt', true, false],
    ]);
    await reader.close();
  });

  it('opens with the right password', async () => {
    const blob = await createEncryptedZip(files, 'orbit-candle-mosaic-thrift');
    const reader = new ZipReader(new BlobReader(blob), { password: 'orbit-candle-mosaic-thrift' });
    const [entry] = (await reader.getEntries()) as FileEntry[];
    expect(await entry?.getData(new TextWriter())).toBe('Addressee\r\nZoë Ó Briain\r\n');
    await reader.close();
  });

  it('does not open with the wrong password', async () => {
    const blob = await createEncryptedZip(files, 'orbit-candle-mosaic-thrift');
    const reader = new ZipReader(new BlobReader(blob), { password: 'wrong-password' });
    const [entry] = (await reader.getEntries()) as FileEntry[];
    await expect(entry?.getData(new TextWriter())).rejects.toThrow();
    await reader.close();
  });

  it('does not contain the plain text anywhere in the file', async () => {
    const blob = await createEncryptedZip(files, 'orbit-candle-mosaic-thrift');
    const bytes = new TextDecoder('latin1').decode(await blob.arrayBuffer());
    expect(bytes).not.toContain('Addressee');
  });
});
