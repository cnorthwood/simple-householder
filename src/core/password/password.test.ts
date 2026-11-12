import { describe, expect, it } from 'vitest';
import { EFF_LARGE_WORDLIST } from './effLargeWordlist';
import {
  EXCLUDED_WORDS,
  generatePassword,
  PASSWORD_WORDS,
  passwordBits,
  randomIndex,
  type RandomSource,
} from './password';

describe('word list (PW-2)', () => {
  it('is the complete EFF large word list', () => {
    expect(EFF_LARGE_WORDLIST).toHaveLength(7776);
    expect(EFF_LARGE_WORDLIST[0]).toBe('abacus');
    expect(EFF_LARGE_WORDLIST.at(-1)).toBe('zoom');
    expect(new Set(EFF_LARGE_WORDLIST).size).toBe(7776);
  });

  it('only excludes words that are actually in the list', () => {
    for (const w of EXCLUDED_WORDS) expect(EFF_LARGE_WORDLIST).toContain(w);
    expect(PASSWORD_WORDS).toHaveLength(7776 - EXCLUDED_WORDS.size);
  });

  it('has no words containing the hyphen separator', () => {
    expect(PASSWORD_WORDS.every((w) => /^[a-z]+$/.test(w))).toBe(true);
  });

  it('gives a password of over 50 bits', () => {
    expect(passwordBits()).toBeGreaterThan(51);
  });
});

/** A fake random source returning the given values in turn. */
const sequence = (...values: number[]): RandomSource => {
  let i = 0;
  return (buffer) => {
    buffer[0] = values[i++ % values.length] ?? 0;
  };
};

describe('randomIndex (PW-2)', () => {
  it('rejects values in the biased tail rather than wrapping them', () => {
    // For n = 3, values >= 4294967295 (= floor(2^32 / 3) * 3) must be rejected.
    expect(randomIndex(3, sequence(0xffffffff, 7))).toBe(1);
  });

  it('is within range', () => {
    for (let i = 0; i < 1000; i++) {
      const n = randomIndex(PASSWORD_WORDS.length);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(PASSWORD_WORDS.length);
    }
  });
});

describe('generatePassword (PW-2)', () => {
  it('is four list words joined by hyphens', () => {
    const words = generatePassword().split('-');
    expect(words).toHaveLength(4);
    for (const w of words) expect(PASSWORD_WORDS).toContain(w);
  });

  it('uses the random source', () => {
    expect(generatePassword(sequence(0, 1, 2, 3))).toBe(PASSWORD_WORDS.slice(0, 4).join('-'));
  });

  it('varies', () => {
    const seen = new Set(Array.from({ length: 50 }, () => generatePassword()));
    expect(seen.size).toBe(50);
  });
});
