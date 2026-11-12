import type { Elector } from './types';

/** First name, surname and suffix (NM-2). */
export function fullName(e: Elector): string {
  return [e.firstName, e.lastName, e.suffix].filter(Boolean).join(' ');
}

/** One initial per word of the first name, then surname and suffix (NM-5). */
export function initialledName(e: Elector): string {
  return [initials(e.firstName), e.lastName, e.suffix].filter(Boolean).join(' ');
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
  return fitUnits(unbreakableUnits(names), limits);
}

/** Lay out pieces that mustn't be broken on at most `maxLines` lines, or null if they don't fit. */
export function fitUnits(units: readonly string[], limits: LineLimits): string[] | null {
  if (units.some((u) => u.length > limits.lineLength)) return null;
  const lines = fill(units, limits.lineLength);
  return lines.length <= limits.maxLines ? lines : null;
}

/** People sharing a surname, for everyday mode (EV-3). */
export interface SurnameGroup {
  /** First names (or initials), in order. */
  firstNames: string[];
  /** Surname and suffix. */
  surname: string;
}

/**
 * Group consecutive electors with the same surname and suffix (case-insensitive). Electors should
 * already be sorted by surname (HH-4).
 */
export function groupBySurname(
  electors: readonly Elector[],
  firstNameOf: (e: Elector) => string,
): SurnameGroup[] {
  const groups: (SurnameGroup & { key: string })[] = [];
  for (const e of electors) {
    const surname = [e.lastName, e.suffix].filter(Boolean).join(' ');
    const key = surname.toLocaleLowerCase('en-GB');
    const last = groups.at(-1);
    if (last?.key === key) last.firstNames.push(firstNameOf(e));
    else groups.push({ key, surname, firstNames: [firstNameOf(e)] });
  }
  return groups.map(({ firstNames, surname }) => ({ firstNames, surname }));
}

/** First name words as initials: "Mary Jane" → "M J" (NM-5). */
export function initials(firstName: string): string {
  return firstName
    .split(' ')
    .filter(Boolean)
    .map((word) => (Array.from(word)[0] ?? '').toUpperCase())
    .join(' ');
}

/**
 * "Chris & Meg Northwood and Sam Okafor" as pieces that mustn't be broken (EV-3, EV-4): lines may
 * break between first names or between groups, never between a first name and its surname.
 */
export function groupedUnits(groups: readonly SurnameGroup[]): string[] {
  return groups.flatMap((group, g) => {
    const separator = g < groups.length - 2 ? ',' : g === groups.length - 2 ? ' and' : '';
    const n = group.firstNames.length;
    return group.firstNames.map((first, i) => {
      if (i < n - 2) return `${first},`;
      if (i === n - 2) return `${first} &`;
      return `${first} ${group.surname}${separator}`;
    });
  });
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
