import { CONNECT_EXPORT_STEPS } from './exportSteps';

export function ExportStep({ onNext }: { onNext: () => void }) {
  return (
    <section>
      <h2 tabIndex={-1}>Export your list from Connect</h2>
      <ol class="instructions">
        {CONNECT_EXPORT_STEPS.map((s) => (
          <li key={s.title}>
            <strong>{s.title}</strong>
            {s.detail && <p>{s.detail}</p>}
          </li>
        ))}
      </ol>
      <div class="actions">
        <button type="button" class="primary" onClick={onNext}>
          I’ve got my .zip file
        </button>
      </div>
    </section>
  );
}
