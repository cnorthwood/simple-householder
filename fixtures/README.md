# Fixtures

**Synthetic data only.** Every name, address, phone number and email here is invented. Emails must
use reserved example domains (`example.com`, `*.test`, …); the voter-data guard enforces this.
Never build fixtures from a real export, even an anonymised one.

- `synthetic-standard-text.tsv`: Connect "Standard Text", for General Election mode.
- `synthetic-everyday.tsv`: Standard Text customised for everyday mode, in the column layout
  Connect produces (EV-1). Rows are deliberately out of order. It covers a housemate with a walk
  (EV-6), a `/1` elector number between two walked neighbours, a tie between walks broken by
  street (EV-7), and a polling district with no walks (EV-8).
