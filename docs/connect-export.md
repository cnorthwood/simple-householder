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

Ignored columns in Standard Text: `PreferredEmail`, `Pref Phone`, the mailing address
(`mAddressLine1–3`, `mCity`, `mPostalCode`) and `VAddressID`. Despite its name, `VAddressID` is
different for every person, even people at the same address (checked on a whole-constituency
export: 94,566 people, 94,566 different IDs), so it can't be used to find households.

`fixtures/` holds synthetic files in this format. Never add a real export.

## Everyday exporting

Everyday mode needs Standard Text customised with walk and polling number fields (EV-1).

1. Build your list in Connect and click **Export**.
2. Choose Export Format **Standard Text**, then click **Customize export**.
3. Change the fields to export to: Voter File VANID, Name, Postal Address, Voting Address
   (Concatenated), Default Walk, Polling Number. Other fields can be added; they're kept.
4. Optionally choose **Save as new export format**, so next time it can be picked as the Export
   Format.
5. Choose Export As **Excel (.xls)**, then download the `.zip` from **My Export Files**.

Connect expands these fields into columns. A whole-constituency export had exactly the Standard
Text name and address columns (minus `PreferredEmail` and `Pref Phone`) plus:

| Column                    | Example         | Notes                                                            |
| ------------------------- | --------------- | ---------------------------------------------------------------- |
| `DefaultWalkName`         | `9A 12 High St` | Blank for about a third of people. Can contain commas.           |
| `PollingDistrictCode`     | `9A`            | Walks never cross polling districts.                             |
| `ElectorNumberWithSuffix` | `123 `, `123/1` | A trailing space when there's no suffix. `/n` marks a new entry. |

The postal address (`mAddressLine1–3`, `mCity`, `mPostalCode`) matched the voting address for
everyone, so it's dropped along with `MiddleName` and `VAddressID` (EV-2).
