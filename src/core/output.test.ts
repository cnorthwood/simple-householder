import { describe, expect, it } from 'vitest';
import { household } from './household';
import {
  addressLines,
  BOM,
  attentionCsv,
  csvField,
  printerCsv,
  summarise,
  summaryText,
  toCsv,
} from './output';
import { parseExportText } from './parseExport';
import { elector, fixtureText, readCsv } from './testing/fixtures';

describe('csv (OUT-1)', () => {
  it.each([
    ['plain', 'plain'],
    ['Smith, Jones', '"Smith, Jones"'],
    ['The "Old" Rectory', '"The ""Old"" Rectory"'],
    ['line\nbreak', '"line\nbreak"'],
    [' edge', '" edge"'],
    [3, '3'],
  ])('%j → %s', (value, expected) => {
    expect(csvField(value)).toBe(expected);
  });

  it('starts with a UTF-8 BOM and uses CRLF line endings', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['1', '2'],
      ]),
    ).toBe(`${BOM}a,b\r\n1,2\r\n`);
  });
});

describe('addressLines (OUT-2)', () => {
  it('closes up blank lines', () => {
    expect(
      addressLines({ line1: 'Flat 1', line2: '', line3: '20 Road', town: 'T', postcode: 'P' }),
    ).toEqual(['Flat 1', '20 Road', '']);
  });
});

describe('printerCsv', () => {
  const { electors } = parseExportText(fixtureText(), 'x.xls');
  const rows = readCsv(printerCsv(household(electors).items));

  it('OUT-1: has exactly the agreed columns', () => {
    expect(Object.keys(rows[0] ?? {})).toEqual([
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
    ]);
  });

  it('OUT-1, OUT-3: writes a householded letter', () => {
    expect(rows.find((r) => r['Address Line 1'] === '12 Larkspur Road')).toEqual({
      Addressee: 'Christopher Ashworth and Megan Ashworth',
      'Name Line 1': 'Christopher Ashworth and Megan Ashworth',
      'Name Line 2': '',
      Salutation: 'Christopher and Megan',
      'Address Line 1': '12 Larkspur Road',
      'Address Line 2': '',
      'Address Line 3': '',
      Town: 'Anytown',
      Postcode: 'M99 1AA',
      Electors: '2',
      Type: 'Household',
    });
  });

  it('OUT-4: sorts by postcode, then address in natural order', () => {
    const order = rows.map((r) => `${r.Postcode} ${r['Address Line 1']}`);
    const twoMill = order.indexOf('M99 3CC 2 Mill Lane');
    const tenMill = order.indexOf('M99 3CC 10 Mill Lane');
    expect(twoMill).toBeGreaterThan(-1);
    expect(twoMill).toBeLessThan(tenMill);
    expect(order[0]?.startsWith('M99 1AA')).toBe(true);
    expect(order.at(-1)?.startsWith('M99 4DD')).toBe(true);
  });

  it('keeps accented names intact', () => {
    expect(
      rows.find((r) => r.Town === 'Anytown' && r['Address Line 1'] === 'The Old Rectory'),
    ).toMatchObject({
      Addressee: 'Siân Ó Briain and Zoë Ó Briain',
      'Address Line 2': 'Church Lane',
      'Address Line 3': 'Little Hamlet',
    });
  });

  it('names every included elector exactly once across all letters', () => {
    const total = rows.reduce((n, r) => n + Number(r.Electors), 0);
    expect(total).toBe(32);
  });
});

describe('attentionCsv (OUT-5)', () => {
  it('lists left-out and flagged records with the detail needed to fix them', () => {
    const e = elector({ firstName: '', lastName: 'Hughes', address: { line1: '30 Mill Lane' } });
    const rows = readCsv(attentionCsv(household([e])));
    expect(rows).toEqual([
      {
        Problem: 'No first name',
        'What we did': 'Left out',
        'First Name': '',
        Surname: 'Hughes',
        'Address Line 1': '30 Mill Lane',
        'Address Line 2': '',
        'Address Line 3': '',
        Town: 'Anytown',
        Postcode: 'M99 1AA',
        'Row in export': String(e.row),
      },
    ]);
  });
});

describe('summary (OUT-6)', () => {
  const parsed = parseExportText(fixtureText(), 'Export.xls');
  const s = summarise(parsed, household(parsed.electors));

  it('counts people and letters', () => {
    expect(s).toEqual({
      peopleRead: 35,
      duplicatesRemoved: 1,
      peopleIncluded: 32,
      leftOut: { 'No postcode': 1, 'No first name': 1 },
      toCheck: 0,
      letters: 20,
      lettersByType: { Household: 5, Single: 5, 'Shared house': 7, 'Household (split)': 3 },
      lettersWithInitials: 1,
      lettersWithFamilyName: 0,
      walksGuessed: 0,
    });
  });

  it('renders as plain text', () => {
    const text = summaryText(s, {
      fileName: 'Export.xls',
      date: new Date('2026-11-12T19:30:00Z'),
      separateSharedHouses: true,
      mode: 'general-election',
    });
    expect(text).toContain('People in the export:        35');
    expect(text).toContain('  - Shared house: 7');
    expect(text).toContain('32 people on 20 letters.');
  });
});
