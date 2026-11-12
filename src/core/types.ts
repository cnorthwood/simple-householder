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
  vAddressId: string;
}
