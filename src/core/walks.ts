import type { Address, Elector } from './types';

/** A polling number split for sorting: district, then number, then suffix (EV-10). */
export interface PollingKey {
  district: string;
  number: number;
  suffix: number;
}

/** "123" → 123/0, "123/1" → 123/1. Unreadable numbers sort last. */
export function pollingKey(e: Pick<Elector, 'pollingDistrict' | 'electorNumber'>): PollingKey {
  const match = /^(\d+)(?:\/(\d+))?$/.exec(e.electorNumber.trim());
  return {
    district: e.pollingDistrict,
    number: match ? Number(match[1]) : Number.POSITIVE_INFINITY,
    suffix: match ? Number(match[2] ?? 0) : 0,
  };
}

const naturally = (a: string, b: string) =>
  a.localeCompare(b, 'en-GB', { numeric: true, sensitivity: 'base' });

export function comparePolling(a: PollingKey, b: PollingKey): number {
  return naturally(a.district, b.district) || a.number - b.number || a.suffix - b.suffix;
}

/** "123" or "123/1", as shown in the output. */
export function formatElectorNumber(e: Pick<Elector, 'electorNumber'>): string {
  return e.electorNumber.trim();
}

const fold = (s: string) => s.toLocaleLowerCase('en-GB').replace(/\s+/g, ' ').trim();

/** Same key as householding uses (HH-1). */
function addressKey(a: Address): string {
  return [a.line1, a.line2, a.line3, a.town, a.postcode].map(fold).join('|');
}

/**
 * The street, for breaking ties (EV-7): the address without house and flat numbers, plus postcode.
 * "Flat 2, 20 Larkspur Road" and "18 Larkspur Road" are on the same street if they share a
 * postcode.
 */
export function streetKey(a: Address): string {
  const words = [a.line1, a.line2, a.line3]
    .map(fold)
    .join(' ')
    .replace(/\b(flat|apartment|apt|unit|room|studio|maisonette)\b/g, ' ')
    .replace(/[0-9][0-9a-z/-]*/g, ' ')
    .replace(/[^a-z' ]/g, ' ');
  return `${words.replace(/\s+/g, ' ').trim()}|${fold(a.postcode)}`;
}

export interface WalkResult {
  electors: Elector[];
  /** How many walks were filled in (EV-9). */
  guessed: number;
}

/** Fill in blank walks (EV-6 to EV-8). Returns new electors; the input is left unchanged. */
export function fillWalks(electors: readonly Elector[]): WalkResult {
  const walks = new Map<Elector, string>();

  // EV-6: someone else at the same address.
  const byAddress = new Map<string, string>();
  for (const e of electors) {
    if (e.walk) byAddress.set(addressKey(e.address), e.walk);
  }
  for (const e of electors) {
    if (!e.walk) {
      const housemate = byAddress.get(addressKey(e.address));
      if (housemate) walks.set(e, housemate);
    }
  }

  // EV-7, EV-8: neighbours in polling-number order, within each district.
  const districts = new Map<string, Elector[]>();
  for (const e of electors) {
    const list = districts.get(e.pollingDistrict);
    if (list) list.push(e);
    else districts.set(e.pollingDistrict, [e]);
  }
  for (const [district, list] of districts) {
    const ordered = [...list].sort(
      (a, b) => comparePolling(pollingKey(a), pollingKey(b)) || a.row - b.row,
    );
    const known = (e: Elector) => e.walk || walks.get(e) || '';
    if (!ordered.some(known)) {
      for (const e of ordered) if (!e.walk) walks.set(e, `${district} (no walk)`);
      continue;
    }
    // Nearest elector with a known walk on each side.
    const before: (Elector | undefined)[] = [];
    let last: Elector | undefined;
    for (const e of ordered) {
      before.push(last);
      if (known(e)) last = e;
    }
    const after: (Elector | undefined)[] = new Array<Elector | undefined>(ordered.length);
    let next: Elector | undefined;
    for (let i = ordered.length - 1; i >= 0; i--) {
      after[i] = next;
      if (known(ordered[i] as Elector)) next = ordered[i];
    }
    ordered.forEach((e, i) => {
      if (known(e)) return;
      const prev = before[i];
      const following = after[i];
      walks.set(e, chooseNeighbour(e, prev, following, known));
    });
  }

  let guessed = 0;
  const filled = electors.map((e) => {
    if (e.walk) return e;
    guessed++;
    return { ...e, walk: walks.get(e) ?? '' };
  });
  return { electors: filled, guessed };
}

function chooseNeighbour(
  e: Elector,
  prev: Elector | undefined,
  next: Elector | undefined,
  known: (e: Elector) => string,
): string {
  if (!prev || !next) return known((prev ?? next) as Elector);
  if (known(prev) === known(next)) return known(prev);
  const street = streetKey(e.address);
  const prevSame = streetKey(prev.address) === street;
  const nextSame = streetKey(next.address) === street;
  if (prevSame !== nextSame) return known(prevSame ? prev : next);
  const me = pollingKey(e);
  const distance = (other: Elector) => Math.abs(pollingKey(other).number - me.number);
  return known(distance(next) < distance(prev) ? next : prev);
}
