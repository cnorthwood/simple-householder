import { joinNames } from './names';
import type { Elector } from './types';

/** "Hello Meg and Chris" (SA-1 to SA-4). */
export function salutation(electors: readonly Elector[]): string {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const e of electors) {
    const name = e.preferredName || e.firstName;
    const key = name.toLocaleLowerCase('en-GB');
    if (!seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }
  return `Hello ${joinNames(names)}`;
}
