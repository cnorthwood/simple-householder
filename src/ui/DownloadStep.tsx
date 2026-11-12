import { useEffect, useMemo, useState } from 'preact/hooks';
import { buildDownload } from '../core/download';
import type { HouseholdOptions, HouseholdResult } from '../core/household';
import type { ParsedExport } from '../core/parseExport';
import { generatePassword } from '../core/password/password';

interface Props {
  parsed: ParsedExport;
  result: HouseholdResult;
  options: HouseholdOptions;
  onBack: () => void;
  onStartAgain: () => void;
}

export function DownloadStep({ parsed, result, options, onBack, onStartAgain }: Props) {
  // A fresh password each time this step is shown; never stored (PW-3).
  const password = useMemo(() => generatePassword(), []);
  const [download, setDownload] = useState<{ url: string; fileName: string } | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    buildDownload(parsed, result, options, password)
      .then(({ blob, fileName }) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setDownload({ url, fileName });
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [parsed, result, options, password]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section>
      <h2 tabIndex={-1}>Download your letters</h2>
      <p>
        Your file is protected with this password. <strong>Write it down or copy it now</strong>. We
        don’t keep a copy, so you won’t be able to see it again.
      </p>
      <div class="password-box">
        <code class="password" data-testid="password">
          {password}
        </code>
        <button type="button" class="secondary" onClick={() => void copy()}>
          Copy password
        </button>
        <span role="status">{copied ? 'Copied' : ''}</span>
      </div>

      <div class="actions" aria-live="polite">
        {download ? (
          <a class="button primary" href={download.url} download={download.fileName}>
            Download {download.fileName}
          </a>
        ) : error ? (
          <p class="error" role="alert">
            Sorry, something went wrong creating your download. Please try again.
          </p>
        ) : (
          <p>Preparing your download…</p>
        )}
      </div>

      <h3>What to do next</h3>
      <ol class="instructions">
        <li>
          <strong>Email the .zip file to your printer.</strong>
          <p>Never email the addresses unprotected.</p>
        </li>
        <li>
          <strong>Send the password separately</strong>
          <p>Use a text message or a phone call, not the same email as the file.</p>
        </li>
        <li>
          <strong>Delete the files from your computer once they’ve been sent.</strong>
          <p>That includes the export you downloaded from Connect.</p>
        </li>
      </ol>
      <p class="muted">
        To open the file yourself (for example, for a mail merge in Affinity), double-click it and
        enter the password when asked. Inside you’ll find <code>addresses-for-printer.csv</code>, a{' '}
        <code>summary.txt</code> and, if anything needs fixing, <code>needs-attention.csv</code>.
      </p>

      <div class="actions">
        <button type="button" class="secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" class="secondary" onClick={onStartAgain}>
          Start again with a new file
        </button>
      </div>
    </section>
  );
}
