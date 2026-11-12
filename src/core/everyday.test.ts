/** End-to-end core test of everyday mode on the synthetic fixture (EV-1 to EV-12). */
import { describe, expect, it } from 'vitest';
import { downloadFiles } from './download';
import { DEFAULT_OPTIONS, household } from './household';
import { everydayCsv } from './output';
import { parseExportText } from './parseExport';
import { EVERYDAY, STANDARD_TEXT } from './profile';
import { everydayFixtureText, readCsv } from './testing/fixtures';

const options = { ...DEFAULT_OPTIONS, mode: 'everyday' as const };
const parsed = parseExportText(everydayFixtureText(), 'Everyday.xls', EVERYDAY);
const result = household(parsed.electors, options);
const body = readCsv(everydayCsv(result.items, parsed.extraColumns));
const column = (name: string) => body.map((r) => r[name]);

describe('everyday mode on the synthetic fixture', () => {
  it('EV-2: keeps no extra columns from the standard layout', () => {
    expect(parsed.extraColumns).toEqual([]);
  });

  it('EV-11: sorts by walk, then earliest polling number', () => {
    expect(column('Addressee')).toEqual([
      'Christopher & Megan Ashworth',
      'Ruth & Tom Bennett',
      'Li Chen',
      'Tendai Dube',
      'Rhys Evans',
      'Anna & Jonas Fischer',
      'Sofia Garcia',
      'Kate & Mark Johnson and Ali Khan',
      'Cerys & Owen Hughes',
      'Sara Iqbal',
    ]);
  });

  it('EV-6 to EV-8: fills every walk, from housemates, neighbours and districts', () => {
    expect(column('Default Walk')).toEqual([
      ...Array<string>(5).fill('9A 01 Larkspur Road'),
      ...Array<string>(3).fill('9A 02 Elm Close'),
      '9B (no walk)',
      '9B (no walk)',
    ]);
    expect(result.walksGuessed).toBe(6);
  });

  it('EV-12: lists every elector number on the letter, in order', () => {
    expect(column('Polling District')[0]).toBe('9A');
    expect(column('Elector Numbers')).toContain('10; 11; 12');
    expect(column('Elector Numbers')).toContain('4/1');
  });

  it('names the file for walking, not the printer', () => {
    const files = downloadFiles(parsed, result, options, new Date());
    expect(files[0]?.name).toBe('addresses-by-walk.csv');
    expect(files[1]?.content).toContain('Walks filled in:             6');
    expect(files[1]?.content).toContain('NOT suitable for Royal Mail');
  });
});

describe('extra columns (EV-2, EV-12)', () => {
  const text = [
    'LastName\tFirstName\tAddressLine1\tPost Town\tPost Code\tDefaultWalkName\tPollingDistrictCode\tElectorNumberWithSuffix\tMiddleName\tVAddressID\tmAddressLine1\tSupport\tTeller',
    'Northwood\tMeg\t1 A St\tAnytown\tM99 1AA\tNorth\t9A\t1 \tJ\t71\t1 A St\tLD\tYes',
    'Northwood\tChris\t1 A St\tAnytown\tM99 1AA\tNorth\t9A\t2 \t\t72\t1 A St\tLD\tNo',
  ].join('\r\n');
  const p = parseExportText(text, 'x.xls', EVERYDAY);
  const csv = everydayCsv(household(p.electors, options).items, p.extraColumns);

  it('keeps unrecognised columns, but not the ones the export format brings along', () => {
    expect(p.extraColumns).toEqual(['Support', 'Teller']);
  });

  it('shows a shared value once, and joins values that differ', () => {
    expect(csv).toContain('North,9A,1; 2,LD,Yes; No');
  });

  it('keeps no extra columns in General Election mode', () => {
    expect(parseExportText(text, 'x.xls', STANDARD_TEXT).extraColumns).toEqual([]);
  });

  it('EV-1: asks for the everyday export steps when walk columns are missing', () => {
    expect(() =>
      parseExportText(
        'LastName\tFirstName\tAddressLine1\tPost Town\tPost Code\nA\tB\tC\tD\tE',
        'x.xls',
        EVERYDAY,
      ),
    ).toThrow(/DefaultWalkName, PollingDistrictCode, ElectorNumberWithSuffix\. Please follow/);
  });
});
