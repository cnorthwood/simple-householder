# Simple Householder

Turn a Connect export into one letter per household, with every elector named in full, as Royal
Mail's candidate mail rules require. The output is ready for your printer.

Your file is processed entirely in your browser and is never uploaded anywhere. The page's
security policy blocks it from making any network connections at all.

## Development

Requires Node 22+, and Docker for the end-to-end tests.

```sh
npm install
npm run dev
npm run check   # before committing
npm run e2e     # end-to-end tests, in Docker
```

See `CLAUDE.md` for project rules and `docs/` for the plan and specification.

**Never commit real voter data.** Keep exports in `private/` (gitignored).

## Credits

- Passwords use the [EFF Large Wordlist](https://www.eff.org/dice) by the Electronic Frontier
  Foundation, licensed under [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).

- Typeset in [Open Sans](https://fonts.google.com/specimen/Open+Sans), licensed under the SIL Open
  Font License 1.1, bundled via [Fontsource](https://fontsource.org/).
- Styled after the [Liberal Democrat brand guide](https://www.libdems.org.uk/brand).

## Licence

Copyright © 2026 Chris Northwood and contributors.

Simple Householder is free software: you can redistribute it and/or modify it under the terms of
the GNU Affero General Public License as published by the Free Software Foundation, either version
3 of the License, or (at your option) any later version. See [LICENSE](LICENSE).
