import { describe, expect, it } from 'vitest';
import { salutation } from './salutation';
import { elector } from './testing/fixtures';

describe('salutation', () => {
  it.each([
    ['SA-1: one person', [{ firstName: 'Meg' }], 'Hello Meg'],
    ['SA-1: two people', [{ firstName: 'Meg' }, { firstName: 'Chris' }], 'Hello Meg and Chris'],
    [
      'SA-1: three people',
      [{ firstName: 'Meg' }, { firstName: 'Chris' }, { firstName: 'Sam' }],
      'Hello Meg, Chris and Sam',
    ],
    [
      'SA-2: preferred name wins when present',
      [{ firstName: 'Elizabeth', preferredName: 'Liz' }, { firstName: 'Chris' }],
      'Hello Liz and Chris',
    ],
    [
      'SA-3: a repeated first name appears once',
      [
        { firstName: 'John', suffix: 'Sr' },
        { firstName: 'Brenda' },
        { firstName: 'john', suffix: 'Jr' },
      ],
      'Hello John and Brenda',
    ],
  ])('%s', (_label, people, expected) => {
    expect(salutation(people.map((p) => elector(p)))).toBe(expected);
  });
});
