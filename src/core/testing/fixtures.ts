/** Test helpers for building Connect-style exports from synthetic data. Tests only. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Uint8ArrayReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js/lib/zip-native.js';
import { BOM } from '../output';
import type { Elector } from '../types';

export const FIXTURE_PATH = resolve(
  import.meta.dirname,
  '../../../fixtures/synthetic-standard-text.tsv',
);

export function fixtureText(): string {
  return readFileSync(FIXTURE_PATH, 'utf8');
}

export const EVERYDAY_FIXTURE_PATH = resolve(
  import.meta.dirname,
  '../../../fixtures/synthetic-everyday.tsv',
);

export function everydayFixtureText(): string {
  return readFileSync(EVERYDAY_FIXTURE_PATH, 'utf8');
}

/** Encode text as Connect does for "Excel (.xls)": UTF-16LE with a byte-order mark. */
export function toUtf16le(text: string): Uint8Array {
  const out = new Uint8Array(2 + text.length * 2);
  out[0] = 0xff;
  out[1] = 0xfe;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out[2 + i * 2] = code & 0xff;
    out[3 + i * 2] = code >> 8;
  }
  return out;
}

export async function zipFiles(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const writer = new ZipWriter(new Uint8ArrayWriter());
  for (const file of files) await writer.add(file.name, new Uint8ArrayReader(file.bytes));
  return writer.close();
}

/** A Connect-style export zip of the synthetic fixture. */
export async function fixtureZip(): Promise<Uint8Array> {
  return zipFiles([{ name: 'Export20261112-1.xls', bytes: toUtf16le(fixtureText()) }]);
}

let nextRow = 1;
/** Build an elector for table-driven tests; only override what the test is about. */
export function elector(
  overrides: Partial<Omit<Elector, 'address'>> & { address?: Partial<Elector['address']> } = {},
): Elector {
  const { address, ...rest } = overrides;
  return {
    row: nextRow++,
    firstName: 'Alex',
    lastName: 'Example',
    suffix: '',
    preferredName: '',
    walk: '',
    pollingDistrict: '',
    electorNumber: '',
    extras: {},
    ...rest,
    address: {
      line1: '1 Test Street',
      line2: '',
      line3: '',
      town: 'Anytown',
      postcode: 'M99 1AA',
      ...address,
    },
  };
}

/** Parse our own CSV back for assertions (handles the quoting we produce). */
export function readCsv(csv: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const text = csv.startsWith(BOM) ? csv.slice(1) : csv;
  const endField = () => {
    row.push(field);
    field = '';
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      endField();
    } else if (c === '\r' && text[i + 1] === '\n') {
      endField();
      rows.push(row);
      row = [];
      i++;
    } else {
      field += c;
    }
  }
  const [header = [], ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
