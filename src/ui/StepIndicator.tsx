export type StepId = 'mode' | 'export' | 'file' | 'check' | 'download';

export const STEPS: { id: StepId; label: string }[] = [
  { id: 'mode', label: 'Choose a mode' },
  { id: 'export', label: 'Export from Connect' },
  { id: 'file', label: 'Choose your file' },
  { id: 'check', label: 'Check' },
  { id: 'download', label: 'Download' },
];

export function StepIndicator({ current }: { current: StepId }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Progress">
      <ol class="steps">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            class={i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''}
            aria-current={i === currentIndex ? 'step' : undefined}
          >
            <span class="step-number" aria-hidden="true">
              {i < currentIndex ? '✓' : i + 1}
            </span>
            <span class="step-label">{s.label}</span>
            {i < currentIndex && <span class="sr-only"> (done)</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
