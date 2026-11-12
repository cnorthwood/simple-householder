import type { Elector } from './types';

/** First name, surname and suffix (NM-2). */
export function fullName(e: Elector): string {
  return [e.firstName, e.lastName, e.suffix].filter(Boolean).join(' ');
}

/** One initial per word of the first name, then surname and suffix (NM-5). */
export function initialledName(e: Elector): string {
  const initials = e.firstName
    .split(' ')
    .filter(Boolean)
    .map((word) => (Array.from(word)[0] ?? '').toUpperCase());
  return [...initials, e.lastName, e.suffix].filter(Boolean).join(' ');
}

/** "A", "A and B", "A, B and C" (NM-3, SA-1). */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * The joined names split into pieces that may not be broken across lines: each name with the
 * comma or " and" that follows it (NM-4).
 */
function unbreakableUnits(names: readonly string[]): string[] {
  return names.map((name, i) => {
    if (i < names.length - 2) return `${name},`;
    if (i === names.length - 2) return `${name} and`;
    return name;
  });
}

/** Greedily fill lines with words/units, never exceeding `lineLength` unless a unit alone does. */
function fill(units: readonly string[], lineLength: number): string[] {
  const lines: string[] = [];
  for (const unit of units) {
    const last = lines.at(-1);
    if (last !== undefined && last.length + 1 + unit.length <= lineLength) {
      lines[lines.length - 1] = `${last} ${unit}`;
    } else {
      lines.push(unit);
    }
  }
  return lines;
}

export interface LineLimits {
  maxLines: number;
  lineLength: number;
}

/**
 * Lay out names on at most `maxLines` lines of `lineLength` characters, breaking only between
 * names (NM-4). Returns null if they don't fit.
 */
export function fitNames(names: readonly string[], limits: LineLimits): string[] | null {
  const units = unbreakableUnits(names);
  if (units.some((u) => u.length > limits.lineLength)) return null;
  const lines = fill(units, limits.lineLength);
  return lines.length <= limits.maxLines ? lines : null;
}

/**
 * Last resort for a name too long to fit even as initials (NM-7): wrap between words, putting
 * any overflow on the last line. Never truncates.
 */
export function forceFit(text: string, limits: LineLimits): string[] {
  const lines = fill(text.split(' '), limits.lineLength);
  if (lines.length <= limits.maxLines) return lines;
  const kept = lines.slice(0, limits.maxLines - 1);
  return [...kept, lines.slice(limits.maxLines - 1).join(' ')];
}
