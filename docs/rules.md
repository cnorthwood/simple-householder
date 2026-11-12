# Addressing and householding rules

This is the specification for Simple Householder. Every rule has an ID, a source, and at least one
test that names the rule ID. If the code and this document disagree, that's a bug in one of them.
Ask, don't guess.

**Sources**

- **RM**: Royal Mail, _Candidate Mail: Your guide to a successful election communication_ (2026
  edition, file `Candidate-Mail-Guide-to-Elections-2026-V1.pdf`), cited by page. It's marked
  confidential, so it isn't committed. Get it from royalmail.com/candidatemail.
- **Decision**: a project decision recorded in [`plan.md`](plan.md).

## Royal Mail requirements (summary)

From RM p14 ("Prepare your mail"), each addressed item must be addressed to individually named
electors. More than one elector may be listed on one item. RM's examples include:

| Acceptable                  | Unacceptable             |
| --------------------------- | ------------------------ |
| Alan Smith and Brenda Smith | Alan and Brenda Smith    |
| A Smith                     | The Smith Family         |
| Mr A Smith and Mrs B Smith  | The Occupier, The Tenant |
| Miss C Smith, Ms C Smith    | No name at all           |

Items need the full address including postcode (RM p14, p18). The total number of items must not
exceed the electorate (RM p14). Householding only ever reduces the count, so this always holds.
Sorting (Electionsort/Streetsort, RM p15–18) is done by the printer.

## Input

- **IN-1** _(Decision)_ Accept a `.zip` containing exactly one export file (`.xls`, `.txt`, `.tsv`
  or `.csv`), or that file on its own.
- **IN-2** _(Decision)_ Detect the encoding from the byte-order mark: UTF-16LE, UTF-16BE or UTF-8.
  Without a BOM, assume UTF-8. Connect's "Excel (.xls)" export is really UTF-16LE tab-separated
  text.
- **IN-3** _(Decision)_ Fields are separated by tabs and rows by CRLF or LF. Blank rows are
  ignored. A field wrapped as `="…"` (Excel text protection) is unwrapped. A field wrapped in
  double quotes is unquoted, with `""` becoming `"`.
- **IN-7** _(Decision)_ A file that has been opened and saved again in Excel (a real `.xls`/`.xlsx`
  workbook, or a comma-separated CSV) is rejected with a message asking for the original Connect
  download. We don't try to read it, because Excel may have changed the data.
- **IN-4** _(Decision)_ Header names are matched ignoring case, spaces and underscores. The
  required and optional columns are listed in [`connect-export.md`](connect-export.md). Any missing
  required column is reported, by name, in plain English.
- **IN-5** _(Decision)_ All values are trimmed, with internal runs of whitespace collapsed to one
  space. Postcodes are upper-cased.
- **IN-6** _(Decision)_ If a `Voter File VANID` column is present, repeated VANIDs are kept once
  (the first) and counted in the summary. VANIDs are never output.

## Who can be included

- **EL-1** _(RM p14: "No name at all" is unacceptable)_ An elector with no first name or no
  surname is left out and listed in "needs attention". We can't name them correctly.
- **EL-2** _(RM p14, p18: full address and postcode)_ An elector with no postcode or no first
  address line is left out and listed in "needs attention".

## Householding

- **HH-1** _(Decision)_ Electors are grouped by `VAddressID`. An elector with a blank `VAddressID`
  is grouped by the normalised registered address instead: address lines, town and postcode,
  compared case-insensitively with whitespace collapsed.
- **HH-2** _(Decision)_ A group's address is taken from its first elector in file order.
- **HH-3** _(Decision: large shared houses)_ If a group has **6 or more electors** and **3 or more
  different surnames** (compared case-insensitively), it isn't householded. Each elector gets their
  own item, of type "Shared house".
- **HH-4** _(Decision)_ Within an item, electors are ordered by surname, then first name (both
  case-insensitive), then file order. This keeps families together.

## Addressee names

- **NM-1** _(RM p14)_ Every elector on an item is named individually. Names are never combined
  ("Alan and Brenda Smith" is not allowed) and electors are never dropped. Two electors with
  identical names are both listed.
- **NM-2** _(Decision; RM p14 allows names without titles)_ A full name is the first name, surname
  and suffix if present ("John Smith Jr"). No titles or middle names.
- **NM-3** _(Decision; RM p14 "Miss C Smith, Ms C Smith")_ Names are joined as "A", "A and B",
  "A, B and C", "A, B, C and D". There's no comma before "and".
- **NM-4** _(Decision: DL window envelope)_ The addressee must fit in at most **2 name lines**
  of at most **40 characters** each (configurable in one place). Lines break only between names,
  after the joining comma or "and" (e.g. "Meg Northwood and" / "Chris Northwood").
- **NM-5** _(Decision; RM p14 "A Smith" is acceptable)_ If full names don't fit, every name on the
  item switches to initials: one initial per word of the first name, then the surname and suffix
  ("Mary Jane Smith" → "M J Smith", "Anne-Marie Jones" → "A Jones").
- **NM-6** _(Decision)_ If initials still don't fit, the group is split into several items.
  Electors are packed in order, each item taking as many as fit with **full names**, so as few
  people as possible are reduced to initials. If one elector doesn't fit on their own with their
  full name, their item uses initials (NM-5). These items are of type "Household (split)".
- **NM-7** _(Decision)_ A single elector whose name can't fit even as initials (pathologically
  long) still gets an item: their name is wrapped between words, and the item is listed in "needs
  attention" for a manual check. Names are never truncated.

## Salutation

- **SA-1** _(Decision)_ The salutation is "Hello " followed by the electors' names, joined as in
  NM-3: "Hello Meg", "Hello Meg and Chris", "Hello Meg, Chris and Sam".
- **SA-2** _(Decision)_ Each elector's name is their preferred name if the export has a preferred
  name column and it's filled in, otherwise their first name.
- **SA-3** _(Decision)_ A name already used in the salutation (case-insensitive) isn't repeated:
  John Smith Sr and John Smith Jr get "Hello John".
- **SA-4** _(Decision)_ The salutation lists the electors on that item only, so split households
  and shared houses each get their own.

## Output

- **OUT-1** _(Decision)_ The printer file is a CSV (RFC 4180 quoting, CRLF line endings, UTF-8
  with a byte-order mark so Excel shows accented names correctly) with these columns:
  `Addressee`, `Name Line 1`, `Name Line 2`, `Salutation`, `Address Line 1`, `Address Line 2`,
  `Address Line 3`, `Town`, `Postcode`, `Electors`, `Type`.
- **OUT-2** _(Decision)_ Blank address lines are closed up, so there are no gaps in the printed
  address.
- **OUT-3** _(Decision)_ `Type` is one of `Single`, `Household`, `Household (split)` or
  `Shared house`. `Electors` is the number of people named on the item.
- **OUT-4** _(Decision)_ Rows are sorted by postcode, then address (natural order, so "2 High St"
  comes before "10 High St"), then addressee.
- **OUT-5** _(Decision)_ A "needs attention" CSV lists every record left out or flagged, with the
  reason and enough name and address detail to fix it in Connect.
- **OUT-6** _(Decision)_ A plain-text summary gives counts: people read, duplicates removed, people
  left out (by reason), letters produced (by type), and the date.

## Protecting the output

- **PW-1** _(Decision)_ The output is only offered as an AES-256 encrypted zip containing
  `addresses-for-printer.csv`, `summary.txt` and (if not empty) `needs-attention.csv`.
- **PW-2** _(Decision)_ The password is 4 words drawn uniformly at random from the EFF large
  diceware word list (7,776 words, about 52 bits), using `crypto.getRandomValues` with rejection
  sampling. Words are lowercase and hyphen-separated. The four hyphenated words and a short list
  of words that would look awkward in a political context (e.g. "riot", "reform", "voter") are
  left out; see `src/core/password/password.ts`.
- **PW-3** _(Decision)_ The password is shown on screen once and never stored. The user is told to
  send it separately from the file.
