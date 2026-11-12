import { useState } from 'preact/hooks';
import type { Mode } from '../core/types';

const MODES: { id: Mode; title: string; description: string }[] = [
  {
    id: 'everyday',
    title: 'Everyday exporting',
    description:
      'For leaflets and letters you deliver yourselves. Names are shortened (“Chris & Meg Northwood”) and letters are sorted by walk, then polling number.',
  },
  {
    id: 'general-election',
    title: 'General Election compatible householding',
    description:
      'For candidate mail delivered by Royal Mail. Everyone is named in full, as Royal Mail requires: “Chris Northwood and Meg Northwood”.',
  },
];

export function ModeStep({ mode, onNext }: { mode: Mode; onNext: (mode: Mode) => void }) {
  const [choice, setChoice] = useState<Mode>(mode);
  return (
    <section>
      <h2 tabIndex={-1}>What are you making?</h2>
      <fieldset class="modes">
        <legend class="sr-only">Choose a mode</legend>
        {MODES.map((m) => (
          <label class="option" key={m.id}>
            <input
              type="radio"
              name="mode"
              value={m.id}
              checked={choice === m.id}
              onChange={() => setChoice(m.id)}
            />
            <span>
              <strong>{m.title}</strong>
              <br />
              {m.description}
            </span>
          </label>
        ))}
      </fieldset>
      <div class="actions">
        <button type="button" class="primary" onClick={() => onNext(choice)}>
          Continue
        </button>
      </div>
    </section>
  );
}
