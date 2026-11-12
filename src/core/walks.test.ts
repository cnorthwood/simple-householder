import { describe, expect, it } from 'vitest';
import { elector } from './testing/fixtures';
import type { Elector } from './types';
import { comparePolling, fillWalks, pollingKey, streetKey } from './walks';

const sortNumbers = (numbers: string[]) =>
  numbers
    .map((electorNumber) => ({ electorNumber, pollingDistrict: '9A' }))
    .sort((a, b) => comparePolling(pollingKey(a), pollingKey(b)))
    .map((e) => e.electorNumber);

describe('polling numbers (EV-10)', () => {
  it('puts suffixed numbers between their neighbours', () => {
    expect(sortNumbers(['124', '123/2', '9', '123', '1234', '123/1', '123/10'])).toEqual([
      '9',
      '123',
      '123/1',
      '123/2',
      '123/10',
      '124',
      '1234',
    ]);
  });

  it('ignores trailing spaces, as Connect adds them', () => {
    expect(pollingKey({ pollingDistrict: '9A', electorNumber: '123 ' })).toEqual({
      district: '9A',
      number: 123,
      suffix: 0,
    });
  });

  it('sorts by district first, naturally', () => {
    const keys = ['9B', '10A', '9A'].map((pollingDistrict) =>
      pollingKey({ pollingDistrict, electorNumber: '1' }),
    );
    expect(keys.sort(comparePolling).map((k) => k.district)).toEqual(['9A', '9B', '10A']);
  });
});

describe('streetKey', () => {
  it.each([
    [{ line1: '12 Larkspur Road' }, { line1: '14A Larkspur Road' }, true],
    [{ line1: 'Flat 2', line2: '20 Larkspur Road' }, { line1: '18 Larkspur Road' }, true],
    [{ line1: '12 Larkspur Road' }, { line1: '12 Larkspur Road', postcode: 'M99 9ZZ' }, false],
    [{ line1: '12 Larkspur Road' }, { line1: '12 Elm Close' }, false],
  ])('%j vs %j → same street: %s', (a, b, same) => {
    const addr = (o: object) => elector({ address: o }).address;
    expect(streetKey(addr(a)) === streetKey(addr(b))).toBe(same);
  });
});

/** Electors in district 9A: [electorNumber, walk, address line 1]. */
const district = (...rows: [string, string, string][]): Elector[] =>
  rows.map(([electorNumber, walk, line1]) =>
    elector({ pollingDistrict: '9A', electorNumber, walk, address: { line1 } }),
  );
const walksOf = (electors: Elector[]) => fillWalks(electors).electors.map((e) => e.walk);

describe('fillWalks', () => {
  it('EV-6: takes the walk of someone at the same address first', () => {
    expect(
      walksOf(
        district(
          ['1', 'North', '1 A St'],
          ['2', '', '5 B St'],
          ['3', 'North', '3 A St'],
          ['50', 'South', '5 B St'],
        ),
      ),
    ).toEqual(['North', 'South', 'North', 'South']);
  });

  it('EV-7: uses the walk on both sides when they agree', () => {
    expect(
      walksOf(district(['1', 'North', '1 A St'], ['2', '', '2 B St'], ['3', 'North', '3 A St'])),
    ).toEqual(['North', 'North', 'North']);
  });

  it('EV-7: uses the only side with a walk at the start or end of a district', () => {
    expect(
      walksOf(district(['1', '', '1 A St'], ['2', 'North', '2 A St'], ['3', '', '3 A St'])),
    ).toEqual(['North', 'North', 'North']);
  });

  it('EV-7: places 123/1 between 123 and 124', () => {
    expect(
      walksOf(
        district(['124', 'South', '3 B St'], ['123/1', '', '9 Z St'], ['123', 'South', '1 B St']),
      ),
    ).toEqual(['South', 'South', 'South']);
  });

  it('EV-7: when the sides disagree, prefers the side on the same street', () => {
    expect(
      walksOf(
        district(['10', 'North', '1 A St'], ['11', '', '2 B St'], ['20', 'South', '4 B St']),
      )[1],
    ).toBe('South');
  });

  it('EV-7: otherwise the nearer polling number, then the earlier one', () => {
    expect(
      walksOf(
        district(['10', 'North', '1 A St'], ['18', '', '2 C St'], ['20', 'South', '4 B St']),
      )[1],
    ).toBe('South');
    expect(
      walksOf(
        district(['10', 'North', '1 A St'], ['15', '', '2 C St'], ['20', 'South', '4 B St']),
      )[1],
    ).toBe('North');
  });

  it('EV-7: never takes a walk from another polling district', () => {
    const electors = [
      elector({ pollingDistrict: '9A', electorNumber: '1', walk: 'North' }),
      elector({ pollingDistrict: '9B', electorNumber: '2', walk: '', address: { line1: '2 B' } }),
    ];
    expect(walksOf(electors)).toEqual(['North', '9B (no walk)']);
  });

  it('EV-8: names the walk after the district when it has no walks at all', () => {
    expect(walksOf(district(['1', '', '1 A St'], ['2', '', '2 A St']))).toEqual([
      '9A (no walk)',
      '9A (no walk)',
    ]);
  });

  it('EV-9: counts the walks it filled in and keeps file order', () => {
    const result = fillWalks(
      district(['3', 'North', '3 A St'], ['1', '', '1 A St'], ['2', 'North', '2 A St']),
    );
    expect(result.guessed).toBe(1);
    expect(result.electors.map((e) => e.electorNumber)).toEqual(['3', '1', '2']);
  });
});

describe('fillWalks keeps housemates together', () => {
  it('EV-6: gives everyone at an address the walk guessed for the first of them', () => {
    // 2 Elm St (numbers 11 and 19) has no walk; 11 is nearer North, 19 nearer South.
    const electors = district(
      ['10', 'North', '1 A St'],
      ['11', '', '2 Elm St'],
      ['19', '', '2 Elm St'],
      ['20', 'South', '4 B St'],
    );
    expect(walksOf(electors)).toEqual(['North', 'North', 'North', 'South']);
  });
});
