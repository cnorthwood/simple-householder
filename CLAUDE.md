# Simple Householder

A browser-only tool for Liberal Democrat campaigners. It takes a voter list exported from
**Connect** (the party's NGP VAN instance) and **households** it: one item of addressed candidate
mail per address, with **every elector named in full** as Royal Mail's election mail rules require
(e.g. "Meg Northwood and Chris Northwood", never "Meg & Chris Northwood" or "The Residents").
The output is a file for a commercial printer (typically Election Workshop) or an Affinity mail
merge.

Audience: volunteer campaigners, not data specialists. The tool does one job, and its options are
**opinionated presets with plain-English explanations**, not raw knobs.

## Hard rules

1. **Never commit voter data.** Real exports contain personal data. They live in `private/`
   (gitignored) and must never be copied into `src/`, `fixtures/`, `docs/`, tests, commit messages
   or PR text. `scripts/check-no-voter-data.mjs` runs on pre-commit and in CI. Never bypass it
   (no `--no-verify`).
2. **Fixtures are synthetic.** Invent names and addresses. Use `example.com`-style emails and
   made-up phone numbers. Never derive fixtures from a real export, even "anonymised".
3. **No network access at runtime.** No `fetch`, analytics, CDN scripts, web fonts or remote
   images. The built page ships a CSP with `connect-src 'none'`, and an e2e test checks that no
   requests leave the page. Everything is bundled.
4. **The core is pure.** `src/core/` is plain TypeScript with no DOM, Preact or I/O (ESLint enforces
   this). Parsing, householding and output formatting live there and are unit tested. `src/ui/`
   only wires the core to the screen.
5. **Rules are documented before they are coded.** Every addressing or householding behaviour is
   written in `docs/rules.md` (with its source: a Royal Mail guide page or a recorded project
   decision) and covered by a table-driven test. If code and the doc disagree, stop and ask.

## Layout

- `src/core/`: parsing Connect exports, householding, name formatting, output writers (pure, tested)
- `src/ui/`: Preact wizard (export instructions → options → review and download)
- `e2e/`: Playwright tests, including the no-network check
- `fixtures/`: synthetic test data only
- `docs/`: `plan.md` (agreed plan), `rules.md` (addressing rules spec), `connect-export.md`
  (input format)
- `scripts/`: repo tooling (voter-data guard)
- `private/`: gitignored; real exports and reference PDFs. Don't read it unless the user asks.

## Commands

- `npm run dev`: dev server (no CSP in dev; it's injected at build)
- `npm test`: unit tests (Vitest)
- `npm run e2e`: build, serve, and run the Playwright tests inside the official Playwright Docker
  image (tag derived from `package-lock.json`). Needs Docker. `npm run e2e:local` runs them on the
  host instead.
- `npm run check`: data guard + typecheck + lint + format check + unit tests (run before committing)
- `npm run build`: build to `dist/` (GitHub Pages)
- `npm run build:single`: build a single offline HTML file to `dist-single/`

A PostToolUse hook (`.claude/hooks/post-edit-check.sh`) typechecks and runs unit tests after
every `.ts`/`.tsx` edit. Fix failures before moving on.

## Conventions

- TypeScript strict mode. Prefer small pure functions and explicit types at module boundaries.
- Write tests as tables of `input → expected` cases so the rules are easy to read.
- UI copy is British English, plain and friendly, and written for a non-technical volunteer.
- Commit messages are imperative and explain _why_.
