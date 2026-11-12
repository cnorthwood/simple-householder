import { decodeText } from './decode';
import { FriendlyError } from './errors';
import { normaliseHeader, STANDARD_TEXT, type ColumnProfile, type Field } from './profile';
import { parseTsv } from './tsv';
import type { Elector } from './types';
import { extractSingleFile, isZip } from './zip';

export interface ParsedExport {
  /** Name of the data file (inside the zip, if it was zipped). */
  fileName: string;
  electors: Elector[];
  /** Rows dropped because their VANID had already been seen (IN-6). */
  duplicatesRemoved: number;
}

const DATA_FILE = /\.(xls|txt|tsv|csv)$/i;

/** Real (binary) .xls workbooks start with the OLE compound-file signature. */
function isOleWorkbook(bytes: Uint8Array): boolean {
  return [0xd0, 0xcf, 0x11, 0xe0].every((b, i) => bytes[i] === b);
}

function headerIndex(headers: string[], profile: ColumnProfile) {
  const normalised = headers.map(normaliseHeader);
  const index = {} as Record<Field, number>;
  const missing: string[] = [];
  for (const [field, spec] of Object.entries(profile) as [Field, ColumnProfile[Field]][]) {
    const i = normalised.findIndex((h) => spec.headers.some((name) => normaliseHeader(name) === h));
    index[field] = i;
    if (i === -1 && spec.required) missing.push(spec.label);
  }
  return { index, missing };
}

/** Turn decoded export text into electors (IN-3 to IN-6). */
export function parseExportText(
  text: string,
  fileName: string,
  profile: ColumnProfile = STANDARD_TEXT,
): ParsedExport {
  const [headers, ...rows] = parseTsv(text);
  if (headers && headers.length === 1 && (headers[0] ?? '').includes(',')) {
    throw new FriendlyError(
      'This looks like a file that has been opened and saved again as a CSV. Please use the .zip exactly as you downloaded it from Connect.',
    );
  }
  if (!headers || headers.length < 2) {
    throw new FriendlyError(
      'This file doesn’t look like a Connect export. Please check you chose Export Format “Standard Text” and Export As “Excel (.xls)”.',
    );
  }
  const { index, missing } = headerIndex(headers, profile);
  if (missing.length > 0) {
    throw new FriendlyError(
      `This file is missing some columns we need: ${missing.join(', ')}. Please check you chose Export Format “Standard Text” in Connect.`,
    );
  }

  const seenVanIds = new Set<string>();
  let duplicatesRemoved = 0;
  const electors: Elector[] = [];
  rows.forEach((fields, i) => {
    const get = (field: Field) => {
      const col = index[field];
      return col === -1 ? '' : (fields[col] ?? '');
    };
    const vanId = get('vanId');
    if (vanId) {
      if (seenVanIds.has(vanId)) {
        duplicatesRemoved++;
        return;
      }
      seenVanIds.add(vanId);
    }
    electors.push({
      row: i + 1,
      firstName: get('firstName'),
      lastName: get('lastName'),
      suffix: get('suffix'),
      preferredName: get('preferredName'),
      address: {
        line1: get('line1'),
        line2: get('line2'),
        line3: get('line3'),
        town: get('town'),
        postcode: get('postcode').toUpperCase(),
      },
      vAddressId: get('vAddressId'),
    });
  });

  if (electors.length === 0) {
    throw new FriendlyError('This export has no people in it. Please check your list in Connect.');
  }
  return { fileName, electors, duplicatesRemoved };
}

/** Read a file chosen by the user: a Connect export .zip, or the file inside it (IN-1, IN-2). */
export async function readExportFile(name: string, bytes: Uint8Array): Promise<ParsedExport> {
  let fileName = name;
  let data = bytes;
  if (isZip(bytes)) {
    const inner = await extractSingleFile(bytes);
    fileName = inner.name;
    data = inner.bytes;
  }
  if (isZip(data) || isOleWorkbook(data)) {
    throw new FriendlyError(
      'This looks like a spreadsheet that has been opened and saved again in Excel. Please use the .zip exactly as you downloaded it from Connect.',
    );
  }
  if (!DATA_FILE.test(fileName)) {
    throw new FriendlyError(
      `“${fileName}” isn’t a Connect export. Please choose the .zip you downloaded from “My Export Files” in Connect.`,
    );
  }
  return parseExportText(decodeText(data), fileName);
}
