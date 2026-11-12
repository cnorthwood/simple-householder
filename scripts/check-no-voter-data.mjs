#!/usr/bin/env node
/**
 * Guard against committing real voter data.
 *
 * Usage:
 *   node scripts/check-no-voter-data.mjs           # check every tracked file (CI)
 *   node scripts/check-no-voter-data.mjs --staged  # check staged files (pre-commit hook)
 *
 * Rules:
 *  1. Data-file types (.csv/.tsv/.txt/.xls/.xlsx/.zip) may only live under fixtures/.
 *  2. Nothing may be named like a Connect export (e.g. "StandardText2026...").
 *  3. Nothing outside fixtures/ may be UTF-16 text (the encoding Connect exports use).
 *  4. Files under fixtures/ must be synthetic: any email address must use a reserved
 *     example domain (example.com/.org/.net, *.example, *.test, *.invalid).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const staged = process.argv.includes('--staged');

function git(args, opts = {}) {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, ...opts });
}

const files = (
  staged
    ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
    : git(['ls-files', '-z'])
)
  .toString('utf8')
  .split('\0')
  .filter(Boolean);

// Staged mode reads exactly what will be committed (the index); otherwise the working tree.
function contentOf(path) {
  return staged ? git(['show', `:${path}`], { stdio: 'pipe' }) : readFileSync(path);
}

const DATA_EXTENSIONS = new Set(['.csv', '.tsv', '.txt', '.xls', '.xlsx', '.zip']);
const EXPORT_NAME = /standardtext\d|voterfile|connect[-_ ]?export.*\.(zip|xls|txt|csv)$/i;
const EMAIL = /[A-Z0-9._%+-]+@([A-Z0-9-]+\.)+[A-Z]{2,}/gi;
const SAFE_EMAIL_DOMAIN = /@(example\.(com|org|net)|([a-z0-9-]+\.)*(example|test|invalid))$/i;

const problems = [];

for (const path of files) {
  const inFixtures = path.startsWith('fixtures/');
  const ext = extname(path).toLowerCase();

  if (DATA_EXTENSIONS.has(ext) && !inFixtures) {
    problems.push(`${path}: data files (${ext}) may only be committed under fixtures/`);
  }
  if (EXPORT_NAME.test(path)) {
    problems.push(`${path}: looks like a real Connect export by its name`);
  }

  let buf;
  try {
    buf = contentOf(path);
  } catch {
    continue; // deleted or unreadable; nothing to leak
  }
  const head = buf.subarray(0, 2);
  const isUtf16 = (head[0] === 0xff && head[1] === 0xfe) || (head[0] === 0xfe && head[1] === 0xff);
  if (isUtf16 && !inFixtures) {
    problems.push(`${path}: UTF-16 text outside fixtures/ (Connect exports use UTF-16)`);
  }

  if (inFixtures) {
    const text = isUtf16 ? buf.toString('utf16le') : buf.toString('utf8');
    for (const match of text.match(EMAIL) ?? []) {
      if (!SAFE_EMAIL_DOMAIN.test(match)) {
        problems.push(
          `${path}: contains a non-example email address (${match}); fixtures must be synthetic`,
        );
        break;
      }
    }
  }
}

if (problems.length > 0) {
  console.error('\n✖ Possible voter data detected. Refusing to continue:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    '\nReal Connect exports must never be committed. Keep them in private/ (gitignored).\n',
  );
  process.exit(1);
}
console.log(`✓ No voter data found in ${files.length} ${staged ? 'staged' : 'tracked'} file(s).`);
