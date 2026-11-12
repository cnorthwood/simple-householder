import { EFF_LARGE_WORDLIST } from './effLargeWordlist';

/**
 * Words we leave out because they'd look awkward in a password for political mail
 * (crime/violence, insults, party and election words), plus the four hyphenated words, which
 * would be ambiguous next to our hyphen separator. Removing ~50 of 7,776 words costs a
 * negligible amount of strength.
 */
export const EXCLUDED_WORDS: ReadonlySet<string> = new Set([
  // Hyphenated
  'drop-down',
  'felt-tip',
  't-shirt',
  'yo-yo',
  // Awkward in a political context
  'arson',
  'bribe',
  'coerce',
  'crook',
  'cruelly',
  'cruelness',
  'cruelty',
  'dictator',
  'disgrace',
  'drown',
  'electable',
  'election',
  'elective',
  'evil',
  'exploit',
  'failing',
  'flop',
  'fool',
  'gore',
  'graves',
  'graveyard',
  'green',
  'hate',
  'jailbird',
  'jailbreak',
  'jailer',
  'jailhouse',
  'lying',
  'poison',
  'prison',
  'reformat',
  'reformed',
  'reformer',
  'reformist',
  'riot',
  'scam',
  'shame',
  'smuggler',
  'smuggling',
  'smugly',
  'smugness',
  'traitor',
  'unelected',
  'voter',
  'wound',
]);

export const PASSWORD_WORDS: readonly string[] = EFF_LARGE_WORDLIST.filter(
  (w) => !EXCLUDED_WORDS.has(w),
);

export const PASSWORD_WORD_COUNT = 4;

/** Fills the buffer with random values. */
export type RandomSource = (buffer: Uint32Array<ArrayBuffer>) => void;

const cryptoRandom: RandomSource = (buffer) => {
  crypto.getRandomValues(buffer);
};

/** A uniformly random integer in [0, n), using rejection sampling to avoid modulo bias. */
export function randomIndex(n: number, random: RandomSource = cryptoRandom): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buffer = new Uint32Array(1);
  for (;;) {
    random(buffer);
    const value = buffer[0] as number;
    if (value < limit) return value % n;
  }
}

/** Four random words, lowercase and hyphen-separated, e.g. "orbit-candle-mosaic-thrift" (PW-2). */
export function generatePassword(random: RandomSource = cryptoRandom): string {
  return Array.from(
    { length: PASSWORD_WORD_COUNT },
    () => PASSWORD_WORDS[randomIndex(PASSWORD_WORDS.length, random)],
  ).join('-');
}

/** Bits of strength of a generated password. */
export function passwordBits(): number {
  return PASSWORD_WORD_COUNT * Math.log2(PASSWORD_WORDS.length);
}
