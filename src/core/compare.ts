/**
 * Shared collators. `localeCompare` with a locale builds a new collator on every call, which
 * made sorting a whole constituency take seconds.
 */
const natural = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });
const text = new Intl.Collator('en-GB');

/** "2 High St" before "10 High St", ignoring case and accents. */
export const compareNatural = (a: string, b: string): number => natural.compare(a, b);

/** Alphabetical, for names. */
export const compareText = (a: string, b: string): number => text.compare(a, b);
