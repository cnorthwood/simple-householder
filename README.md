# Simple Householder

Turn a Connect export into one letter per household, with every elector named in full, as Royal
Mail's candidate mail rules require. The output is ready for your printer.

Your file is processed entirely in your browser and is never uploaded anywhere. The page's
security policy blocks it from making any network connections at all.

## Development

Requires Node 22+.

```sh
npm install
npx playwright install chromium   # first time only, for e2e tests
npm run dev
npm run check                     # before committing
```

See `CLAUDE.md` for project rules and `docs/` for the plan and specification.

**Never commit real voter data.** Keep exports in `private/` (gitignored).
