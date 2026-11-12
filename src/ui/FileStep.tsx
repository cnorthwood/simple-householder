import { useState } from 'preact/hooks';
import { FriendlyError } from '../core/errors';
import { readExportFile, type ParsedExport } from '../core/parseExport';

interface Props {
  onBack: () => void;
  onLoaded: (parsed: ParsedExport) => void;
}

export function FileStep({ onBack, onLoaded }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const load = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onLoaded(await readExportFile(file.name, new Uint8Array(await file.arrayBuffer())));
    } catch (e) {
      setError(
        e instanceof FriendlyError
          ? e.message
          : 'Sorry, we couldn’t read that file. Please check it’s the .zip you downloaded from “My Export Files” in Connect.',
      );
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 tabIndex={-1}>Choose your file</h2>
      <p>Choose the .zip you downloaded from Connect. It stays on this computer.</p>
      <label
        class={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void load(e.dataTransfer?.files[0]);
        }}
      >
        <input
          type="file"
          accept=".zip,.xls,.txt,.tsv"
          disabled={busy}
          onChange={(e) => void load(e.currentTarget.files?.[0])}
        />
        <span class="dropzone-title">{busy ? 'Reading your file…' : 'Choose file'}</span>
        <span class="dropzone-hint">or drag and drop it here</span>
      </label>
      <div role="alert" aria-live="assertive">
        {error && <p class="error">{error}</p>}
      </div>
      <div class="actions">
        <button type="button" class="secondary" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}
