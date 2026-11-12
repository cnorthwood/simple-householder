export interface Address {
  line1: string;
  line2: string;
  line3: string;
  town: string;
  postcode: string;
}

/** One person from the export, after cleaning. */
export interface Elector {
  /** 1-based row number in the export (header excluded), for error messages and stable ordering. */
  row: number;
  firstName: string;
  lastName: string;
  suffix: string;
  /** Empty when the export has no preferred-name column or it's blank. */
  preferredName: string;
  address: Address;
  /** Everyday mode only (EV-1); empty otherwise. */
  walk: string;
  pollingDistrict: string;
  electorNumber: string;
  /** Unrecognised columns kept for the output (EV-2), by header. Empty in General Election mode. */
  extras: Readonly<Record<string, string>>;
}

/** "General Election compatible householding" or "Everyday exporting". */
export type Mode = 'general-election' | 'everyday';
