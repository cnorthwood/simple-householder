# Connect export format

## How campaigners export

1. Build your list in Connect. Make sure it only includes people who can vote in this election.
2. Click **Export**.
3. Choose Export Format **Standard Text**.
4. Choose Export As **Excel (.xls)**.
5. Go to **My Export Files** and download the `.zip`.
6. Give that `.zip` to Simple Householder.

## What the file looks like

- A `.zip` containing one file named like `StandardText20261112-<number>.xls`.
- Despite the `.xls` name, it isn't an Excel workbook. It's **UTF-16LE text with a byte-order
  mark**, tab-separated, with CRLF line endings and one header row.
- Some values are wrapped as `="…"` so Excel keeps them as text (phone numbers, for example).

## Columns

Header names are matched ignoring case, spaces and underscores (rule IN-4).

| Column                     | Use                                                                           | Required |
| -------------------------- | ----------------------------------------------------------------------------- | -------- |
| `Voter File VANID`         | Removing duplicate rows (IN-6). Never output.                                 | No       |
| `FirstName`                | Name and salutation                                                           | Yes      |
| `LastName`                 | Name and shared-house detection                                               | Yes      |
| `MiddleName`               | Ignored (not needed by Royal Mail)                                            | No       |
| `Suffix`                   | Appended to the name, e.g. "Jr"                                               | No       |
| `PreferredName`/`NickName` | Salutation, if present (not in Standard Text; header names not yet confirmed) | No       |
| `AddressLine1`             | Registered address                                                            | Yes      |
| `AddressLine2`             | Registered address                                                            | No       |
| `AddressLine3`             | Registered address                                                            | No       |
| `Post Town`                | Registered address                                                            | Yes      |
| `Post Code`                | Registered address                                                            | Yes      |
| `VAddressID`               | Household key (HH-1)                                                          | Yes      |

Ignored columns in Standard Text: `PreferredEmail`, `Pref Phone`, and the mailing address
(`mAddressLine1–3`, `mCity`, `mPostalCode`).

`fixtures/` holds synthetic files in this format. Never add a real export.
