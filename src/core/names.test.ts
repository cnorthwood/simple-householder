import { describe, expect, it } from 'vitest';
import { fitNames, forceFit, fullName, initialledName, joinNames } from './names';
import { elector } from './testing/fixtures';

const limits = { maxLines: 2, lineLength: 40 };

describe('fullName (NM-2)', () => {
  it.each([
    [{ firstName: 'Meg', lastName: 'Northwood' }, 'Meg Northwood'],
    [{ firstName: 'John', lastName: 'Smith', suffix: 'Jr' }, 'John Smith Jr'],
    [{ firstName: 'Mary Jane', lastName: 'Watson' }, 'Mary Jane Watson'],
  ])('%j → %s', (fields, expected) => {
    expect(fullName(elector(fields))).toBe(expected);
  });
});

describe('initialledName (NM-5)', () => {
  it.each([
    [{ firstName: 'Meg', lastName: 'Northwood' }, 'M Northwood'],
    [{ firstName: 'Mary Jane', lastName: 'Smith' }, 'M J Smith'],
    [{ firstName: 'Anne-Marie', lastName: 'Jones' }, 'A Jones'],
    [{ firstName: 'émile', lastName: 'Zola' }, 'É Zola'],
    [{ firstName: 'John', lastName: 'Smith', suffix: 'Sr' }, 'J Smith Sr'],
  ])('%j → %s', (fields, expected) => {
    expect(initialledName(elector(fields))).toBe(expected);
  });
});

describe('joinNames (NM-3)', () => {
  it.each([
    [['A'], 'A'],
    [['A', 'B'], 'A and B'],
    [['A', 'B', 'C'], 'A, B and C'],
    [['A', 'B', 'C', 'D'], 'A, B, C and D'],
  ])('%j → %s', (names, expected) => {
    expect(joinNames(names)).toBe(expected);
  });
});

describe('fitNames (NM-4)', () => {
  it('keeps short names on one line', () => {
    expect(fitNames(['Meg Northwood', 'Chris Northwood'], limits)).toEqual([
      'Meg Northwood and Chris Northwood',
    ]);
  });

  it('breaks only between names, keeping the joining word with the name before it', () => {
    expect(fitNames(['Christopher Ashworth', 'Megan Ashworth', 'Priya Patel'], limits)).toEqual([
      'Christopher Ashworth, Megan Ashworth and',
      'Priya Patel',
    ]);
  });

  it('allows exactly the line length', () => {
    const name = 'X'.repeat(40);
    expect(fitNames([name], limits)).toEqual([name]);
  });

  it('returns null when a single name is longer than a line', () => {
    expect(fitNames(['X'.repeat(41)], limits)).toBeNull();
  });

  it('returns null when more lines are needed than allowed', () => {
    const names = [
      'Alexandra Smith',
      'Benedict Smith',
      'Cordelia Smith',
      'Dominic Smith',
      'Eleanor Smith',
    ];
    expect(fitNames(names, limits)).toBeNull();
  });
});

describe('forceFit (NM-7)', () => {
  it('wraps between words and never truncates', () => {
    const name = `A ${'Long'.repeat(12)} ${'Name'.repeat(12)} Jr`;
    const lines = forceFit(name, limits);
    expect(lines).toHaveLength(2);
    expect(lines.join(' ')).toBe(name);
  });
});
