/**
 * A column profile says which export columns we need and what they're called. Only Connect's
 * "Standard Text" format is supported for now; another profile (e.g. a custom export
 * format) can be added later without touching the householding code.
 */
export type Field =
  | 'vanId'
  | 'firstName'
  | 'lastName'
  | 'suffix'
  | 'preferredName'
  | 'line1'
  | 'line2'
  | 'line3'
  | 'town'
  | 'postcode'
  | 'vAddressId';

export interface ColumnSpec {
  /** Header names that map to this field, matched with {@link normaliseHeader}. */
  headers: readonly string[];
  required: boolean;
  /** How the column is described to a volunteer in error messages. */
  label: string;
}

export type ColumnProfile = Readonly<Record<Field, ColumnSpec>>;

/** Match headers ignoring case, spaces and underscores (IN-4). */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_]+/g, '');
}

export const STANDARD_TEXT: ColumnProfile = {
  vanId: { headers: ['Voter File VANID', 'VANID'], required: false, label: 'Voter File VANID' },
  firstName: { headers: ['FirstName'], required: true, label: 'FirstName' },
  lastName: { headers: ['LastName'], required: true, label: 'LastName' },
  suffix: { headers: ['Suffix'], required: false, label: 'Suffix' },
  preferredName: {
    headers: ['PreferredName', 'NickName'],
    required: false,
    label: 'PreferredName',
  },
  line1: { headers: ['AddressLine1'], required: true, label: 'AddressLine1' },
  line2: { headers: ['AddressLine2'], required: false, label: 'AddressLine2' },
  line3: { headers: ['AddressLine3'], required: false, label: 'AddressLine3' },
  town: { headers: ['Post Town'], required: true, label: 'Post Town' },
  postcode: { headers: ['Post Code'], required: true, label: 'Post Code' },
  vAddressId: { headers: ['VAddressID'], required: true, label: 'VAddressID' },
};
