import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, household, isLargeSharedHouse, type MailItem } from './household';
import { parseExportText } from './parseExport';
import { elector, fixtureText } from './testing/fixtures';
import type { Elector } from './types';

const summary = (items: MailItem[]) =>
  items.map((i) => ({ type: i.type, lines: i.nameLines, salutation: i.salutation }));

const people = (line1: string, ...names: [string, string][]): Elector[] =>
  names.map(([firstName, lastName]) => elector({ firstName, lastName, address: { line1 } }));

describe('household', () => {
  it('HH-1, NM-1: puts everyone at one address on one letter, each named in full', () => {
    const { items } = household(
      people('1 Test Street', ['Meg', 'Northwood'], ['Chris', 'Northwood']),
    );
    expect(summary(items)).toEqual([
      {
        type: 'Household',
        lines: ['Chris Northwood and Meg Northwood'],
        salutation: 'Hello Chris and Meg',
      },
    ]);
  });

  it('HH-1: groups by the whole address, ignoring case and spacing', () => {
    const { items } = household([
      elector({ firstName: 'Sam', address: { line1: '22 Mill Lane', postcode: 'M99 3CC' } }),
      elector({ firstName: 'Alex', address: { line1: '22  MILL LANE', postcode: 'm99 3cc' } }),
    ]);
    expect(items).toHaveLength(1);
  });

  it.each([
    ['address line 1', { line1: 'Flat 2' }],
    ['address line 2', { line2: '22 Larkspur Road' }],
    ['address line 3', { line3: 'Little Hamlet' }],
    ['town', { town: 'Othertown' }],
    ['postcode', { postcode: 'M99 9ZZ' }],
  ])('HH-1: keeps people apart when their %s differs', (_, difference) => {
    const base = { line1: 'Flat 1', line2: '20 Larkspur Road' };
    const { items } = household([
      elector({ firstName: 'Tom', address: base }),
      elector({ firstName: 'Aoife', address: { ...base, ...difference } }),
    ]);
    expect(items.map((i) => i.type)).toEqual(['Single', 'Single']);
  });

  it('HH-2: takes the address from the first elector in file order', () => {
    const { items } = household([
      elector({ lastName: 'Zed', address: { line1: '1 First St' } }),
      elector({ lastName: 'Abel', address: { line1: '1 FIRST ST' } }),
    ]);
    expect(items[0]?.address.line1).toBe('1 First St');
  });

  it('HH-4: orders by surname, then first name, then file order', () => {
    const { items } = household(
      people('1 Test Street', ['Chris', 'Northwood'], ['Ann', 'Bloggs'], ['Meg', 'Northwood']),
    );
    expect(items[0]?.addressee).toBe('Ann Bloggs, Chris Northwood and Meg Northwood');
  });

  it('NM-1: lists two electors with identical names both', () => {
    const { items } = household(people('1 Test Street', ['John', 'Smith'], ['John', 'Smith']));
    expect(items[0]?.addressee).toBe('John Smith and John Smith');
    expect(items[0]?.salutation).toBe('Hello John');
  });

  describe('large shared houses (HH-3)', () => {
    const shared = people(
      '1 Test Street',
      ['Harry', 'Wilson'],
      ['Wei', 'Zhang'],
      ['Marta', 'Kowalski'],
      ['Omar', 'Haddad'],
      ['Grace', 'Wilson'],
      ['Rhys', 'Evans'],
    );

    it.each([
      [6, 3, true],
      [5, 3, false],
      [6, 2, false],
      [10, 1, false],
    ])('%i electors with %i surnames → shared house: %s', (count, surnames, expected) => {
      const group = Array.from({ length: count }, (_, i) =>
        elector({ lastName: `Surname${i % surnames}` }),
      );
      expect(isLargeSharedHouse(group)).toBe(expected);
    });

    it('compares surnames case-insensitively', () => {
      const group = ['Smith', 'SMITH', 'smith', 'Jones', 'jones', 'JONES'].map((lastName) =>
        elector({ lastName }),
      );
      expect(isLargeSharedHouse(group)).toBe(false);
    });

    it('gives each person their own letter', () => {
      const { items } = household(shared);
      expect(items).toHaveLength(6);
      expect(items.every((i) => i.type === 'Shared house' && i.electors.length === 1)).toBe(true);
      expect(items.map((i) => i.salutation)).toContain('Hello Wei');
    });

    it('households them anyway when the option is off', () => {
      const { items } = household(shared, { ...DEFAULT_OPTIONS, separateSharedHouses: false });
      expect(items.length).toBeLessThan(6);
      expect(items.flatMap((i) => i.electors)).toHaveLength(6);
    });
  });

  describe('fitting names in the envelope window', () => {
    it('NM-5: switches every name on the letter to initials when full names don’t fit', () => {
      const { items } = household(
        people(
          '1 Test Street',
          ['Chukwuemeka', 'Okafor'],
          ['Adaeze', 'Okafor'],
          ['Obinna', 'Okafor'],
          ['Ngozi', 'Okafor'],
          ['Kwame', 'Mensah'],
          ['Ama', 'Mensah'],
        ),
      );
      expect(summary(items)).toEqual([
        {
          type: 'Household',
          lines: ['A Mensah, K Mensah, A Okafor, C Okafor,', 'N Okafor and O Okafor'],
          salutation: 'Hello Ama, Kwame, Adaeze, Chukwuemeka, Ngozi and Obinna',
        },
      ]);
      expect(items[0]?.usesInitials).toBe(true);
    });

    it('NM-6: splits a household across letters, as many full names per letter as fit', () => {
      const { items } = household(
        ['Alexandra', 'Benedict', 'Cordelia', 'Dominic', 'Eleanor'].map((firstName) =>
          elector({ firstName, lastName: 'Fotheringham-Whitworth' }),
        ),
      );
      expect(summary(items)).toEqual([
        {
          type: 'Household (split)',
          lines: ['Alexandra Fotheringham-Whitworth and', 'Benedict Fotheringham-Whitworth'],
          salutation: 'Hello Alexandra and Benedict',
        },
        {
          type: 'Household (split)',
          lines: ['Cordelia Fotheringham-Whitworth and', 'Dominic Fotheringham-Whitworth'],
          salutation: 'Hello Cordelia and Dominic',
        },
        {
          type: 'Household (split)',
          lines: ['Eleanor Fotheringham-Whitworth'],
          salutation: 'Hello Eleanor',
        },
      ]);
    });

    it('NM-6: uses initials for one person whose full name is too long on its own', () => {
      const { items } = household(
        ['Alexandra', 'Benedict', 'Cordelia', 'Dominic', 'Maximilian Alexander'].map((firstName) =>
          elector({ firstName, lastName: 'Fotheringham-Whitworth' }),
        ),
      );
      expect(items.map((i) => [i.addressee, i.usesInitials])).toEqual([
        ['Alexandra Fotheringham-Whitworth and Benedict Fotheringham-Whitworth', false],
        ['Cordelia Fotheringham-Whitworth and Dominic Fotheringham-Whitworth', false],
        ['M A Fotheringham-Whitworth', true],
      ]);
    });

    it('NM-7: wraps a name that can’t fit even as initials, and flags it', () => {
      const lastName = 'Wolfeschlegelsteinhausenbergerdorff-Featherstonehaugh';
      const e = elector({ firstName: 'Hubert', lastName });
      const { items, attention } = household([e]);
      expect(items[0]?.nameLines).toEqual(['H', lastName]);
      expect(attention).toEqual([
        { elector: e, reason: 'Name too long for the envelope window', excluded: false },
      ]);
    });
  });

  describe('who can be included (EL-1, EL-2)', () => {
    it.each([
      [{ firstName: '' }, 'No first name'],
      [{ lastName: '' }, 'No surname'],
      [{ address: { postcode: '' } }, 'No postcode'],
      [{ address: { line1: '' } }, 'No address'],
    ] as const)('%j → left out: %s', (fields, reason) => {
      const e = elector(fields);
      const { items, attention } = household([e]);
      expect(items).toEqual([]);
      expect(attention).toEqual([{ elector: e, reason, excluded: true }]);
    });
  });

  it('accounts for every elector in the synthetic fixture exactly once', () => {
    const { electors } = parseExportText(fixtureText(), 'x.xls');
    const { items, attention } = household(electors);
    const included = items.flatMap((i) => i.electors);
    const excluded = attention.filter((a) => a.excluded).map((a) => a.elector);
    expect(included.length + excluded.length).toBe(electors.length);
    expect(new Set([...included, ...excluded]).size).toBe(electors.length);
    expect(items.every((i) => i.nameLines.length <= 2)).toBe(true);
    expect(items.every((i) => i.nameLines.every((l) => l.length <= 40))).toBe(true);
  });
});

describe('performance', () => {
  it('households a whole constituency (100,000 electors) in well under a few seconds', () => {
    const electors = Array.from({ length: 100_000 }, (_, i) =>
      elector({
        firstName: `First${i % 97}`,
        lastName: `Last${Math.floor(i / 2) % 89}`,
        address: { line1: `${Math.floor(i / 2)} Long Road` },
      }),
    );
    const start = performance.now();
    const { items } = household(electors);
    expect(items).toHaveLength(50_000);
    expect(performance.now() - start).toBeLessThan(3000);
  });
});
