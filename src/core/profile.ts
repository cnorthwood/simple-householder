import type { Mode } from './types';

/**
 * A column profile says which export columns we need and what they're called. General Election
 * mode reads Connect's "Standard Text" format; everyday mode reads Standard Text customised with
 * walk and polling number fields (EV-1).
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
  | 'walk'
  | 'pollingDistrict'
  | 'electorNumber';

export interface ColumnSpec {
  /** Header names that map to this field, matched with {@link normaliseHeader}. */
  headers: readonly string[];
  required: boolean;
  /** How the column is described to a volunteer in error messages. */
  label: string;
}

export interface ColumnProfile {
  columns: Readonly<Partial<Record<Field, ColumnSpec>>>;
  /** Keep columns we don't recognise, for the output (EV-2). */
  keepExtras: boolean;
  /** Columns that come with the export format but aren't wanted in the output (EV-2). */
  dropped: readonly string[];
  /** Added to the "missing columns" error to say how to fix it. */
  missingHint: string;
}

/** Match headers ignoring case, spaces and underscores (IN-4). */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_]+/g, '');
}

const STANDARD_COLUMNS = {
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
} satisfies Partial<Record<Field, ColumnSpec>>;

export const STANDARD_TEXT: ColumnProfile = {
  columns: STANDARD_COLUMNS,
  keepExtras: false,
  dropped: [],
  missingHint: 'Please check you chose Export Format “Standard Text” in Connect.',
};

export const EVERYDAY: ColumnProfile = {
  columns: {
    ...STANDARD_COLUMNS,
    walk: { headers: ['DefaultWalkName'], required: true, label: 'DefaultWalkName' },
    pollingDistrict: {
      headers: ['PollingDistrictCode'],
      required: true,
      label: 'PollingDistrictCode',
    },
    electorNumber: {
      headers: ['ElectorNumberWithSuffix'],
      required: true,
      label: 'ElectorNumberWithSuffix',
    },
  },
  keepExtras: true,
  dropped: [
    'MiddleName',
    'VAddressID',
    'mAddressLine1',
    'mAddressLine2',
    'mAddressLine3',
    'mCity',
    'mPostalCode',
  ],
  missingHint:
    'Please follow the steps to customise your export, including Default Walk and Polling Number.',
};

export const PROFILES: Readonly<Record<Mode, ColumnProfile>> = {
  'general-election': STANDARD_TEXT,
  everyday: EVERYDAY,
};
