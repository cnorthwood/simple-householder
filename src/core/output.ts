import type { AttentionReason, HouseholdResult, ItemType, MailItem } from './household';
import { compareNatural } from './compare';
import { comparePolling, formatElectorNumber, pollingKey } from './walks';
import type { ParsedExport } from './parseExport';
import type { Address, Elector, Mode } from './types';

/** Byte-order mark, so Excel reads the file as UTF-8. */
export const BOM = String.fromCharCode(0xfeff);

/** RFC 4180: quote fields containing commas, quotes, line breaks or edge spaces. */
export function csvField(value: string | number): string {
  const s = String(value);
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 BOM so Excel shows accented names correctly; CRLF line endings (OUT-1). */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return `${BOM}${rows.map((r) => r.map(csvField).join(',')).join('\r\n')}\r\n`;
}

export const PRINTER_COLUMNS = [
  'Addressee',
  'Name Line 1',
  'Name Line 2',
  'Salutation',
  'Address Line 1',
  'Address Line 2',
  'Address Line 3',
  'Town',
  'Postcode',
  'Electors',
  'Type',
] as const;

/** Close up blank address lines (OUT-2). */
export function addressLines(a: Address): [string, string, string] {
  const [l1 = '', l2 = '', l3 = ''] = [a.line1, a.line2, a.line3].filter(Boolean);
  return [l1, l2, l3];
}

const compare = compareNatural;

/** Postcode, then address (natural order), then addressee (OUT-4). */
export function sortItems(items: readonly MailItem[]): MailItem[] {
  return [...items].sort(
    (a, b) =>
      compare(a.address.postcode, b.address.postcode) ||
      compare(addressLines(a.address).join(' '), addressLines(b.address).join(' ')) ||
      compare(a.addressee, b.addressee),
  );
}

export function printerRow(item: MailItem): string[] {
  const [line1 = '', line2 = ''] = item.nameLines;
  return [
    item.addressee,
    line1,
    line2,
    item.salutation,
    ...addressLines(item.address),
    item.address.town,
    item.address.postcode,
    String(item.electors.length),
    item.type,
  ];
}

/** The file for the printer (OUT-1 to OUT-4). */
export function printerCsv(items: readonly MailItem[]): string {
  return toCsv([PRINTER_COLUMNS, ...sortItems(items).map(printerRow)]);
}

const byPolling = (a: Elector, b: Elector) =>
  comparePolling(pollingKey(a), pollingKey(b)) || a.row - b.row;

/** One value if everyone agrees, otherwise the different values joined (EV-12). */
export function collapse(values: readonly string[]): string {
  return [...new Set(values.filter(Boolean))].join('; ');
}

/** Walk (natural order), then earliest polling number, then addressee (EV-11). */
export function sortByWalk(items: readonly MailItem[]): MailItem[] {
  const keyed = items.map((item) => {
    // The earliest polling number on the letter decides its place in the walk.
    const first = item.electors
      .map((e) => ({ e, key: pollingKey(e) }))
      .reduce((a, b) => (comparePolling(b.key, a.key) < 0 ? b : a));
    return { item, walk: walkOf(item), key: first.key, row: first.e.row };
  });
  return keyed
    .sort(
      (a, b) =>
        compare(a.walk, b.walk) ||
        comparePolling(a.key, b.key) ||
        a.row - b.row ||
        compare(a.item.addressee, b.item.addressee),
    )
    .map((k) => k.item);
}

const walkOf = (item: MailItem) => collapse(item.electors.map((e) => e.walk));

export const EVERYDAY_COLUMNS = [
  ...PRINTER_COLUMNS,
  'Default Walk',
  'Polling District',
  'Elector Numbers',
] as const;

/** The everyday file, sorted for walking (EV-10 to EV-12), with any extra columns kept. */
export function everydayCsv(items: readonly MailItem[], extraColumns: readonly string[]): string {
  const rows = sortByWalk(items).map((item) => {
    const electors = [...item.electors].sort(byPolling);
    return [
      ...printerRow(item),
      walkOf(item),
      collapse(electors.map((e) => e.pollingDistrict)),
      electors.map(formatElectorNumber).join('; '),
      ...extraColumns.map((column) => collapse(electors.map((e) => e.extras[column] ?? ''))),
    ];
  });
  return toCsv([[...EVERYDAY_COLUMNS, ...extraColumns], ...rows]);
}

/** The main file in the download, for the chosen mode. */
export function addressesCsv(
  items: readonly MailItem[],
  mode: Mode,
  extraColumns: readonly string[],
): string {
  return mode === 'everyday' ? everydayCsv(items, extraColumns) : printerCsv(items);
}

/** Records left out or worth checking, with enough detail to fix them in Connect (OUT-5). */
export function attentionCsv(result: HouseholdResult): string {
  const rows = result.attention.map(({ elector: e, reason, excluded }) => [
    reason,
    excluded ? 'Left out' : 'Included – please check',
    e.firstName,
    e.lastName,
    ...addressLines(e.address),
    e.address.town,
    e.address.postcode,
    String(e.row),
  ]);
  return toCsv([
    [
      'Problem',
      'What we did',
      'First Name',
      'Surname',
      'Address Line 1',
      'Address Line 2',
      'Address Line 3',
      'Town',
      'Postcode',
      'Row in export',
    ],
    ...rows,
  ]);
}

export interface Summary {
  peopleRead: number;
  duplicatesRemoved: number;
  peopleIncluded: number;
  leftOut: Partial<Record<AttentionReason, number>>;
  toCheck: number;
  letters: number;
  lettersByType: Partial<Record<ItemType, number>>;
  lettersWithInitials: number;
  lettersWithFamilyName: number;
  walksGuessed: number;
}

export function summarise(parsed: ParsedExport, result: HouseholdResult): Summary {
  const leftOut: Summary['leftOut'] = {};
  for (const a of result.attention) {
    if (a.excluded) leftOut[a.reason] = (leftOut[a.reason] ?? 0) + 1;
  }
  const lettersByType: Summary['lettersByType'] = {};
  for (const i of result.items) lettersByType[i.type] = (lettersByType[i.type] ?? 0) + 1;
  return {
    peopleRead: parsed.electors.length + parsed.duplicatesRemoved,
    duplicatesRemoved: parsed.duplicatesRemoved,
    peopleIncluded: result.items.reduce((n, i) => n + i.electors.length, 0),
    leftOut,
    toCheck: result.attention.filter((a) => !a.excluded).length,
    letters: result.items.length,
    lettersByType,
    lettersWithInitials: result.items.filter((i) => i.usesInitials).length,
    lettersWithFamilyName: result.items.filter((i) => i.usesFamilyName).length,
    walksGuessed: result.walksGuessed,
  };
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`;

/** Plain-text summary included in the download (OUT-6). */
export function summaryText(
  s: Summary,
  meta: { fileName: string; date: Date; separateSharedHouses: boolean; mode: Mode },
): string {
  const lines = [
    'Simple Householder summary',
    '==========================',
    '',
    `Export file:  ${meta.fileName}`,
    `Created:      ${meta.date.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`,
    '',
    `People in the export:        ${s.peopleRead.toLocaleString('en-GB')}`,
    `Duplicate rows removed:      ${s.duplicatesRemoved.toLocaleString('en-GB')}`,
    `People left out:             ${Object.values(s.leftOut)
      .reduce((a, b) => a + b, 0)
      .toLocaleString('en-GB')}`,
    ...Object.entries(s.leftOut).map(
      ([reason, n]) => `  - ${reason}: ${n.toLocaleString('en-GB')}`,
    ),
    `People included:             ${s.peopleIncluded.toLocaleString('en-GB')}`,
    '',
    `Letters:                     ${s.letters.toLocaleString('en-GB')}`,
    ...Object.entries(s.lettersByType).map(
      ([type, n]) => `  - ${type}: ${n.toLocaleString('en-GB')}`,
    ),
    `Letters using initials:      ${s.lettersWithInitials.toLocaleString('en-GB')}`,
    ...(meta.mode === 'everyday'
      ? [
          `Letters to "The … Family":   ${s.lettersWithFamilyName.toLocaleString('en-GB')}`,
          `Walks filled in:             ${s.walksGuessed.toLocaleString('en-GB')}`,
        ]
      : []),
    `Names to check by hand:      ${s.toCheck.toLocaleString('en-GB')}`,
    '',
    meta.separateSharedHouses
      ? 'Large shared houses (6+ people, 3+ surnames): one letter per person.'
      : 'Large shared houses: householded like any other address.',
    '',
    meta.mode === 'everyday'
      ? `Everyday exporting: names are shortened (e.g. "Chris & Meg Northwood"), so this file is NOT suitable for Royal Mail candidate mail. ${plural(s.peopleIncluded, 'person', 'people')} on ${plural(s.letters, 'letter')}, sorted by walk.`
      : `Every letter names each elector individually, as Royal Mail requires. ${plural(s.peopleIncluded, 'person', 'people')} on ${plural(s.letters, 'letter')}.`,
  ];
  return `${lines.join('\r\n')}\r\n`;
}
