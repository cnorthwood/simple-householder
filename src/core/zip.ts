import {
  type Entry,
  type FileEntry,
  BlobWriter,
  configure,
  TextReader,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js/lib/zip-native.js';
import { FriendlyError } from './errors';

// No web workers: keeps everything in-page and inside the CSP.
configure({ useWebWorkers: false });

/** "PK" followed by a local file header (03 04) or, for an empty archive, the end record (05 06). */
export function isZip(bytes: Uint8Array): boolean {
  const [p, k, a, b] = bytes;
  return p === 0x50 && k === 0x4b && ((a === 3 && b === 4) || (a === 5 && b === 6));
}

/** Extract the single data file from a Connect export zip (IN-1). */
export async function extractSingleFile(
  bytes: Uint8Array,
): Promise<{ name: string; bytes: Uint8Array }> {
  const reader = new ZipReader(new Uint8ArrayReader(bytes));
  try {
    const entries = (await reader.getEntries()).filter(
      (e: Entry): e is FileEntry => !e.directory && !e.filename.startsWith('__MACOSX/'),
    );
    if (entries.length !== 1) {
      throw new FriendlyError(
        entries.length === 0
          ? 'That zip file is empty. Please download the export from Connect again.'
          : `That zip file contains ${entries.length} files, but a Connect export contains just one. Please use the .zip straight from "My Export Files" in Connect.`,
      );
    }
    const [entry] = entries as [FileEntry];
    if (entry.encrypted) {
      throw new FriendlyError(
        'That zip file is password protected. Please use the .zip straight from Connect.',
      );
    }
    return { name: entry.filename, bytes: await entry.getData(new Uint8ArrayWriter()) };
  } finally {
    await reader.close();
  }
}

/** Build an AES-256 encrypted zip (PW-1). */
export async function createEncryptedZip(
  files: { name: string; content: string }[],
  password: string,
): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter('application/zip'), {
    password,
    encryptionStrength: 3, // AES-256
    zipCrypto: false,
  });
  for (const file of files) {
    await writer.add(file.name, new TextReader(file.content));
  }
  return writer.close();
}
