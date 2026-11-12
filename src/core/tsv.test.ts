import { describe, expect, it } from 'vitest';
import { cleanValue, parseTsv, unwrapField } from './tsv';
import { decodeText } from './decode';
import { toUtf16le } from './testing/fixtures';

describe('decodeText (IN-2)', () => {
  it.each([
    ['UTF-16LE with BOM', toUtf16le('Zoë\tSiân')],
    [
      'UTF-8 with BOM',
      new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Zoë\tSiân')]),
    ],
    ['UTF-8 without BOM', new TextEncoder().encode('Zoë\tSiân')],
    [
      'UTF-16BE with BOM',
      new Uint8Array([
        0xfe, 0xff, 0, 0x5a, 0, 0x6f, 0, 0xeb, 0, 9, 0, 0x53, 0, 0x69, 0, 0xe2, 0, 0x6e,
      ]),
    ],
  ])('decodes %s', (_label, bytes) => {
    expect(decodeText(bytes)).toBe('Zoë\tSiân');
  });
});

describe('unwrapField (IN-3)', () => {
  it.each([
    ['plain', 'plain'],
    ['="07700 900123"', '07700 900123'],
    ['"quoted"', 'quoted'],
    ['"say ""hi"""', 'say "hi"'],
    ['', ''],
    ['"', '"'],
  ])('%j → %j', (raw, expected) => {
    expect(unwrapField(raw)).toBe(expected);
  });
});

describe('cleanValue (IN-5)', () => {
  it.each([
    ['  Megan  ', 'Megan'],
    ['Mary   Jane', 'Mary Jane'],
    ['Flat 1', 'Flat 1'],
  ])('%j → %j', (raw, expected) => {
    expect(cleanValue(raw)).toBe(expected);
  });
});

describe('parseTsv (IN-3)', () => {
  it('splits CRLF and LF rows, skips blank rows and cleans fields', () => {
    expect(parseTsv('a\tb\r\n\r\n 1 \t="2"\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps empty fields', () => {
    expect(parseTsv('a\t\tc')).toEqual([['a', '', 'c']]);
  });
});
