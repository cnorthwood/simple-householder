# Plan

Simple Householder turns a Connect export into one item of addressed candidate mail per household,
with every elector named in full as Royal Mail requires. The result goes to a printer (typically
Election Workshop) or into an Affinity mail merge.

## Principles

- **One job, done simply.** Volunteers aren't data specialists. Options are opinionated presets
  with plain-English explanations, not raw knobs.
- **Data never leaves the computer.** The app is static and browser-only, with no backend. The
  built page's Content Security Policy sets `connect-src 'none'`, and an e2e test checks that no
  network requests are made.
- **Idiot-proof.** The wizard walks people through the Connect export. The output is only ever
  offered as a password-protected zip, because campaigners must not email raw voter data.

## Delivery

- Hosted on GitHub Pages from the public repo `cnorthwood/simple-householder` (AGPL-3.0-or-later).
- Each deploy also publishes `simple-householder.html`, a single self-contained file that works
  offline from disk.
- Stack: Vite, TypeScript, Preact, Vitest, and Playwright (run in the official Docker image locally
  and in CI).
- Styling follows the Liberal Democrat brand guide's colours and type (Open Sans, bundled; Democrat
  Orange `#ff6400`; Liberty Navy `#072f5f`). No logo.

## Modes

- **General Election compatible householding:** Royal Mail candidate mail, everyone named in full.
- **Everyday exporting:** hand-delivered leaflets and letters. Names are grouped by surname
  ("Chris & Meg Northwood"), blank walks are filled in, and letters are sorted by walk then polling
  number. See EV-1 to EV-12 in [`rules.md`](rules.md).

## The wizard

0. **Choose a mode.**
1. **Export from Connect:** step-by-step instructions (build list → Export → Export Format
   "Standard Text" → Export As "Excel (.xls)" → My Export Files → download the .zip). The steps
   are defined as data, so we can expand them into a fuller walkthrough later.
2. **Choose your file:** drop or pick the `.zip` (or the file inside it). It's checked
   immediately, with plain-English errors.
3. **Check:** a summary ("4,210 people → 2,380 letters"), a preview of the output, records that
   need attention, and the opinionated options.
4. **Download:** a password-protected zip (ZipCrypto, so Windows can open it), protected by a four-word password shown on screen,
   with instructions to send the password separately.

## Decisions

| Topic                 | Decision                                                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Input format          | Connect "Standard Text" as "Excel (.xls)": a zip containing UTF-16 tab-separated text. Extra columns are ignored.                            |
| Household key         | The registered address (`AddressLine1–3`, `Post Town`, `Post Code`). `VAddressID` is per person, so it's ignored, as is the mailing address. |
| Names                 | First name + surname (+ suffix). No titles or middle names. Every elector is named; never collapsed.                                         |
| Name lines            | At most 2 lines (DL window envelope, A4 letter). Ladder: full names → initials → split across extra letters.                                 |
| Salutation            | "Hello Meg and Chris", using the preferred name if the export has one, otherwise the first name. Repeated first names appear once.           |
| Large shared houses   | 6 or more electors and 3 or more different surnames → everyone gets their own letter. Expected to be tuned.                                  |
| Connect IDs (VANIDs)  | Not included in the output.                                                                                                                  |
| Output                | Encrypted zip containing the printer CSV, a summary, and a list of records needing attention.                                                |
| Password              | 4 words from the EFF large diceware list, hyphen-separated (about 52 bits).                                                                  |
| Custom export formats | Out of scope for now. The parser is built around a column profile so another can be added later.                                             |

The detailed rules, with their sources, are in [`rules.md`](rules.md). The input format is in
[`connect-export.md`](connect-export.md).

## Build order

Each step is one commit, with rules and tests written first.

1. Read and validate the Connect export (zip, UTF-16 TSV, column profile), plus a synthetic
   fixture generator.
2. Householding, name formatting, name-line fitting and salutations.
3. Printer CSV, summary and needs-attention outputs.
4. Diceware password and password-protected zip.
5. Wizard UI with brand styling and Open Sans.
6. Full end-to-end test of the wizard with a synthetic export.

## Later

- Support the user's own custom Connect export format as a second column profile.
- A fuller, screenshot-led Connect walkthrough.
- Tune the shared-house threshold and the characters-per-line figure with real printer feedback.
