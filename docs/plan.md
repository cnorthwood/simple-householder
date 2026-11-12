# Plan

_To be agreed after reviewing the Royal Mail candidate mail guide and a real Connect "Standard
Text" export._

Agreed so far:

- **Delivery:** a static, browser-only web app on GitHub Pages, plus a single-file offline HTML
  build. No backend. A CSP with `connect-src 'none'` guarantees data can't leave the browser.
- **Stack:** Vite, TypeScript, Preact, Vitest, Playwright, GitHub Actions.
- **Large shared houses (default):** don't household addresses with **6 or more electors and 3 or
  more different surnames**. Each elector there gets their own item. Expected to be tuned.
- **Output consumer:** a commercial printer (Election Workshop), and optionally an Affinity
  mail merge.
