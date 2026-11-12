import {
  fitUnits,
  forceFit,
  fullName,
  groupBySurname,
  groupedUnits,
  initialledName,
  initials,
  type LineLimits,
} from './names';
import { salutation } from './salutation';
import type { Address, Elector, Mode } from './types';
import { fillWalks } from './walks';

/** Large shared house thresholds (HH-3). Change here and in docs/rules.md together. */
export const SHARED_HOUSE_MIN_ELECTORS = 6;
export const SHARED_HOUSE_MIN_SURNAMES = 3;

/** Name lines on a DL window envelope with an A4 letter (NM-4). */
export const DEFAULT_LIMITS: LineLimits = { maxLines: 2, lineLength: 40 };

export type ItemType = 'Single' | 'Household' | 'Household (split)' | 'Shared house';

/** One letter. */
export interface MailItem {
  electors: Elector[];
  address: Address;
  type: ItemType;
  /** The names joined on one line, as laid out over `nameLines`. */
  addressee: string;
  nameLines: string[];
  salutation: string;
  usesInitials: boolean;
  /** "The Northwood Family" (EV-5, everyday mode only). */
  usesFamilyName: boolean;
}

export type AttentionReason =
  | 'No first name'
  | 'No surname'
  | 'No postcode'
  | 'No address'
  | 'Name too long for the envelope window';

export interface AttentionRecord {
  elector: Elector;
  reason: AttentionReason;
  /** Left out of the printer file (true), or included but worth a manual check (false). */
  excluded: boolean;
}

export interface HouseholdOptions {
  mode: Mode;
  /** Give everyone in a large shared house their own letter (HH-3). */
  separateSharedHouses: boolean;
  limits: LineLimits;
}

export const DEFAULT_OPTIONS: HouseholdOptions = {
  mode: 'general-election',
  separateSharedHouses: true,
  limits: DEFAULT_LIMITS,
};

export interface HouseholdResult {
  items: MailItem[];
  attention: AttentionRecord[];
  /** Blank walks filled in (EV-9); always 0 in General Election mode. */
  walksGuessed: number;
}

/** EL-1, EL-2: why an elector can't be addressed, if they can't. */
function exclusionReason(e: Elector): AttentionReason | null {
  if (!e.firstName) return 'No first name';
  if (!e.lastName) return 'No surname';
  if (!e.address.postcode) return 'No postcode';
  if (!e.address.line1) return 'No address';
  return null;
}

const fold = (s: string) => s.toLocaleLowerCase('en-GB').replace(/\s+/g, ' ').trim();

/**
 * HH-1: the whole registered address, ignoring case and spacing. Not VAddressID, which Connect
 * gives each person rather than each property.
 */
function householdKey(e: Elector): string {
  const a = e.address;
  return [a.line1, a.line2, a.line3, a.town, a.postcode].map(fold).join('|');
}

/** HH-4: surname, then first name, then file order. */
function byName(a: Elector, b: Elector): number {
  return (
    fold(a.lastName).localeCompare(fold(b.lastName), 'en-GB') ||
    fold(a.firstName).localeCompare(fold(b.firstName), 'en-GB') ||
    a.row - b.row
  );
}

/** HH-3 */
export function isLargeSharedHouse(electors: readonly Elector[]): boolean {
  const surnames = new Set(electors.map((e) => fold(e.lastName)));
  return electors.length >= SHARED_HOUSE_MIN_ELECTORS && surnames.size >= SHARED_HOUSE_MIN_SURNAMES;
}

/** One way of writing the addressee: the pieces that mustn't be broken across lines. */
interface Naming {
  units: string[];
  usesInitials: boolean;
  usesFamilyName: boolean;
}

/** NM-4 to NM-5 (General Election) or EV-3 to EV-5 (everyday), in order of preference. */
function namings(electors: Elector[], mode: Mode): Naming[] {
  if (mode === 'general-election') {
    return [
      { units: electors.map(fullName), usesInitials: false, usesFamilyName: false },
      { units: electors.map(initialledName), usesInitials: true, usesFamilyName: false },
    ].map((n) => ({ ...n, units: namesToUnits(n.units) }));
  }
  const full = groupBySurname(electors, (e) => e.firstName);
  const result: Naming[] = [
    { units: groupedUnits(full), usesInitials: false, usesFamilyName: false },
    {
      units: groupedUnits(groupBySurname(electors, (e) => initials(e.firstName))),
      usesInitials: true,
      usesFamilyName: false,
    },
  ];
  const [only] = full;
  if (full.length === 1 && only && electors.length > 1) {
    result.push({
      units: ['The', ...only.surname.split(' '), 'Family'],
      usesInitials: false,
      usesFamilyName: true,
    });
  }
  return result;
}

/** NM-3/NM-4 joining for General Election mode, as unbreakable pieces. */
function namesToUnits(names: string[]): string[] {
  return names.map((name, i) => {
    if (i < names.length - 2) return `${name},`;
    if (i === names.length - 2) return `${name} and`;
    return name;
  });
}

function item(electors: Elector[], type: ItemType, naming: Naming, nameLines: string[]): MailItem {
  return {
    electors,
    address: (electors[0] as Elector).address,
    type,
    addressee: naming.units.join(' '),
    nameLines,
    salutation: salutation(electors),
    usesInitials: naming.usesInitials,
    usesFamilyName: naming.usesFamilyName,
  };
}

/** The first naming that fits, or null. */
function tryItem(electors: Elector[], type: ItemType, options: HouseholdOptions): MailItem | null {
  for (const naming of namings(electors, options.mode)) {
    const lines = fitUnits(naming.units, options.limits);
    if (lines) return item(electors, type, naming, lines);
  }
  return null;
}

/** Does the first-choice naming (full names) fit? Used to pack split households (NM-6). */
function fullNamesFit(electors: Elector[], options: HouseholdOptions): boolean {
  const [first] = namings(electors, options.mode);
  return first !== undefined && fitUnits(first.units, options.limits) !== null;
}

/** An item for one elector, falling back to forced wrapping (NM-7). */
function singleItem(
  e: Elector,
  type: ItemType,
  options: HouseholdOptions,
  attention: AttentionRecord[],
): MailItem {
  const fitted = tryItem([e], type, options);
  if (fitted) return fitted;
  attention.push({ elector: e, reason: 'Name too long for the envelope window', excluded: false });
  const name = initialledName(e);
  return item(
    [e],
    type,
    { units: [name], usesInitials: true, usesFamilyName: false },
    forceFit(name, options.limits),
  );
}

/** NM-6, EV-5: pack electors in order, as many per letter as fit with full names. */
function splitHousehold(
  electors: Elector[],
  options: HouseholdOptions,
  attention: AttentionRecord[],
): MailItem[] {
  const items: MailItem[] = [];
  let chunk: Elector[] = [];
  const flush = () => {
    if (chunk.length === 0) return;
    const [naming] = namings(chunk, options.mode);
    const lines = naming && fitUnits(naming.units, options.limits);
    items.push(
      naming && lines
        ? item(chunk, 'Household (split)', naming, lines)
        : singleItem(chunk[0] as Elector, 'Household (split)', options, attention),
    );
    chunk = [];
  };
  for (const e of electors) {
    if (fullNamesFit([...chunk, e], options)) {
      chunk.push(e);
    } else {
      flush();
      chunk = [e];
      // An elector whose full name doesn't fit even alone gets their own letter right away.
      if (!fullNamesFit([e], options)) flush();
    }
  }
  flush();
  return items;
}

/** Turn electors into letters, following docs/rules.md. */
export function household(
  input: readonly Elector[],
  options: HouseholdOptions = DEFAULT_OPTIONS,
): HouseholdResult {
  const { electors, guessed } =
    options.mode === 'everyday' ? fillWalks(input) : { electors: input, guessed: 0 };
  const attention: AttentionRecord[] = [];
  const groups = new Map<string, Elector[]>();
  for (const e of electors) {
    const reason = exclusionReason(e);
    if (reason) {
      attention.push({ elector: e, reason, excluded: true });
      continue;
    }
    const key = householdKey(e);
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }

  const items: MailItem[] = [];
  for (const group of groups.values()) {
    // HH-2: the address comes from the first elector in file order, before sorting by name.
    const address = (group[0] as Elector).address;
    const sorted = [...group].sort(byName);
    const withAddress = (i: MailItem): MailItem => ({ ...i, address });

    if (sorted.length === 1) {
      items.push(withAddress(singleItem(sorted[0] as Elector, 'Single', options, attention)));
    } else if (options.separateSharedHouses && isLargeSharedHouse(sorted)) {
      for (const e of sorted) {
        items.push(withAddress(singleItem(e, 'Shared house', options, attention)));
      }
    } else {
      const whole = tryItem(sorted, 'Household', options);
      const result = whole ? [whole] : splitHousehold(sorted, options, attention);
      items.push(...result.map(withAddress));
    }
  }
  return { items, attention, walksGuessed: guessed };
}
