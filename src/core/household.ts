import { fitNames, forceFit, fullName, initialledName, joinNames, type LineLimits } from './names';
import { salutation } from './salutation';
import type { Address, Elector } from './types';

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
  /** Give everyone in a large shared house their own letter (HH-3). */
  separateSharedHouses: boolean;
  limits: LineLimits;
}

export const DEFAULT_OPTIONS: HouseholdOptions = {
  separateSharedHouses: true,
  limits: DEFAULT_LIMITS,
};

export interface HouseholdResult {
  items: MailItem[];
  attention: AttentionRecord[];
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

function item(
  electors: Elector[],
  type: ItemType,
  names: string[],
  nameLines: string[],
  usesInitials: boolean,
): MailItem {
  return {
    electors,
    address: (electors[0] as Elector).address,
    type,
    addressee: joinNames(names),
    nameLines,
    salutation: salutation(electors),
    usesInitials,
  };
}

/** NM-4, NM-5: full names if they fit, else initials, else null. */
function tryItem(electors: Elector[], type: ItemType, limits: LineLimits): MailItem | null {
  const full = electors.map(fullName);
  const fullLines = fitNames(full, limits);
  if (fullLines) return item(electors, type, full, fullLines, false);
  const initials = electors.map(initialledName);
  const initialLines = fitNames(initials, limits);
  if (initialLines) return item(electors, type, initials, initialLines, true);
  return null;
}

/** An item for one elector, falling back to forced wrapping (NM-7). */
function singleItem(
  e: Elector,
  type: ItemType,
  limits: LineLimits,
  attention: AttentionRecord[],
): MailItem {
  const fitted = tryItem([e], type, limits);
  if (fitted) return fitted;
  attention.push({ elector: e, reason: 'Name too long for the envelope window', excluded: false });
  const name = initialledName(e);
  return item([e], type, [name], forceFit(name, limits), true);
}

/** NM-6: pack electors in order, as many per letter as fit with full names. */
function splitHousehold(
  electors: Elector[],
  limits: LineLimits,
  attention: AttentionRecord[],
): MailItem[] {
  const items: MailItem[] = [];
  let chunk: Elector[] = [];
  const flush = () => {
    if (chunk.length === 0) return;
    const names = chunk.map(fullName);
    const lines = fitNames(names, limits);
    items.push(
      lines
        ? item(chunk, 'Household (split)', names, lines, false)
        : singleItem(chunk[0] as Elector, 'Household (split)', limits, attention),
    );
    chunk = [];
  };
  for (const e of electors) {
    if (fitNames([...chunk, e].map(fullName), limits)) {
      chunk.push(e);
    } else {
      flush();
      chunk = [e];
      // An elector whose full name doesn't fit even alone gets their own letter right away.
      if (!fitNames([fullName(e)], limits)) flush();
    }
  }
  flush();
  return items;
}

/** Turn electors into letters, following docs/rules.md. */
export function household(
  electors: readonly Elector[],
  options: HouseholdOptions = DEFAULT_OPTIONS,
): HouseholdResult {
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
      items.push(
        withAddress(singleItem(sorted[0] as Elector, 'Single', options.limits, attention)),
      );
    } else if (options.separateSharedHouses && isLargeSharedHouse(sorted)) {
      for (const e of sorted) {
        items.push(withAddress(singleItem(e, 'Shared house', options.limits, attention)));
      }
    } else {
      const whole = tryItem(sorted, 'Household', options.limits);
      const result = whole ? [whole] : splitHousehold(sorted, options.limits, attention);
      items.push(...result.map(withAddress));
    }
  }
  return { items, attention };
}
