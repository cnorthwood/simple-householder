import { describe, expect, it } from 'vitest';
import { FriendlyError } from './errors';
import { parseExportText, readExportFile } from './parseExport';
import { fixtureText, fixtureZip, toUtf16le, zipFiles } from './testing/fixtures';

const HEADER =
  'Voter File VANID\tLastName\tFirstName\tSuffix\tAddressLine1\tAddressLine2\tAddressLine3\tPost Town\tPost Code\tVAddressID';

describe('parseExportText', () => {
  it('reads every person from the synthetic Standard Text fixture, removing duplicates (IN-6)', () => {
    const parsed = parseExportText(fixtureText(), 'x.xls');
    expect(parsed.electors).toHaveLength(34);
    expect(parsed.duplicatesRemoved).toBe(1);
  });

  it('maps registered-address columns, not mailing-address ones', () => {
    const [first] = parseExportText(fixtureText(), 'x.xls').electors;
    expect(first).toEqual({
      row: 1,
      firstName: 'Megan',
      lastName: 'Ashworth',
      suffix: '',
      preferredName: '',
      address: {
        line1: '12 Larkspur Road',
        line2: '',
        line3: '',
        town: 'Anytown',
        postcode: 'M99 1AA',
      },
      vAddressId: '5001',
    });
  });

  it('matches headers ignoring case, spaces and underscores (IN-4)', () => {
    const text =
      'lastname\tFIRST_NAME\taddress line1\tPOSTTOWN\tpost_code\tv address id\nSmith\tJo\t1 A St\tAnytown\tm99 1aa\t7';
    const [e] = parseExportText(text, 'x.txt').electors;
    expect(e).toMatchObject({ firstName: 'Jo', lastName: 'Smith', vAddressId: '7' });
    expect(e?.address.postcode).toBe('M99 1AA');
  });

  it('reads a preferred name column when present (SA-2)', () => {
    const text = `${HEADER}\tPreferredName\n1\tSmith\tElizabeth\t\t1 A St\t\t\tAnytown\tM99 1AA\t7\tLiz`;
    expect(parseExportText(text, 'x.txt').electors[0]?.preferredName).toBe('Liz');
  });

  it('names every missing required column (IN-4)', () => {
    expect(() => parseExportText('LastName\tFirstName\nSmith\tJo', 'x.xls')).toThrow(
      /missing some columns we need: AddressLine1, Post Town, Post Code, VAddressID/,
    );
  });

  it('explains when the file has been re-saved as CSV', () => {
    expect(() => parseExportText('LastName,FirstName\nSmith,Jo', 'x.csv')).toThrow(
      /saved again as a CSV/,
    );
  });

  it('rejects a file with a header but no people', () => {
    expect(() => parseExportText(HEADER, 'x.xls')).toThrow(/no people/);
  });

  it('only throws FriendlyErrors, whose messages are shown to volunteers', () => {
    expect(() => parseExportText('', 'x.xls')).toThrow(FriendlyError);
  });
});

describe('readExportFile (IN-1, IN-2)', () => {
  it('reads a Connect zip containing a UTF-16 .xls', async () => {
    const parsed = await readExportFile('StandardText.zip', await fixtureZip());
    expect(parsed.fileName).toBe('Export20261112-1.xls');
    expect(parsed.electors).toHaveLength(34);
    expect(parsed.electors.map((e) => e.firstName)).toContain('Zoë');
  });

  it('reads the .xls on its own', async () => {
    const parsed = await readExportFile('Export.xls', toUtf16le(fixtureText()));
    expect(parsed.electors).toHaveLength(34);
  });

  it.each([
    ['an empty zip', [], /empty/],
    [
      'a zip with several files',
      [
        { name: 'a.xls', bytes: toUtf16le(HEADER) },
        { name: 'b.xls', bytes: toUtf16le(HEADER) },
      ],
      /contains 2 files/,
    ],
    [
      'a zip of something else',
      [{ name: 'photo.jpg', bytes: new Uint8Array([1, 2, 3]) }],
      /isn’t a Connect export/,
    ],
  ])('rejects %s', async (_label, files, message) => {
    await expect(readExportFile('x.zip', await zipFiles(files))).rejects.toThrow(message);
  });

  it('explains when the export has been re-saved as an Excel workbook', async () => {
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]);
    await expect(readExportFile('x.xls', xls)).rejects.toThrow(/saved again in Excel/);
    const xlsx = await zipFiles([{ name: 'x.xlsx', bytes: new Uint8Array([0x50, 0x4b, 3, 4]) }]);
    await expect(readExportFile('x.zip', xlsx)).rejects.toThrow(/saved again in Excel/);
  });
});
