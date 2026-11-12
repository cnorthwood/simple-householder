import { describe, expect, it } from 'vitest';
import { salutation } from './salutation';
import { elector } from './testing/fixtures';

describe('salutation', () => {
  it.each([
    ['SA-1: one person', [{ firstName: 'Meg' }], 'Meg'],
    ['SA-1: two people', [{ firstName: 'Meg' }, { firstName: 'Chris' }], 'Meg and Chris'],
    [
      'SA-1: three people',
      [{ firstName: 'Meg' }, { firstName: 'Chris' }, { firstName: 'Sam' }],
      'Meg, Chris and Sam',
    ],
    [
      'SA-2: preferred name wins when present',
      [{ firstName: 'Elizabeth', preferredName: 'Liz' }, { firstName: 'Chris' }],
      'Liz and Chris',
    ],
    [
      'SA-3: a repeated first name appears once',
      [
        { firstName: 'John', suffix: 'Sr' },
        { firstName: 'Brenda' },
        { firstName: 'john', suffix: 'Jr' },
      ],
      'John and Brenda',
    ],
  ])('%s', (_label, people, expected) => {
    expect(salutation(people.map((p) => elector(p)))).toBe(expected);
  });
});
