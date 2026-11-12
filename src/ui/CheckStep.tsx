import { useState } from 'preact/hooks';
import {
  SHARED_HOUSE_MIN_ELECTORS,
  SHARED_HOUSE_MIN_SURNAMES,
  type HouseholdOptions,
  type HouseholdResult,
  type MailItem,
} from '../core/household';
import { addressLines, collapse, sortByWalk, sortItems, summarise } from '../core/output';
import type { ParsedExport } from '../core/parseExport';

interface Props {
  parsed: ParsedExport;
  result: HouseholdResult;
  options: HouseholdOptions;
  onOptionsChange: (options: HouseholdOptions) => void;
  onBack: () => void;
  onNext: () => void;
}

const PREVIEW_LIMIT = 50;
const n = (value: number) => value.toLocaleString('en-GB');
const count = (value: number, one: string, many: string) =>
  `${n(value)} ${value === 1 ? one : many}`;

type Filter = 'all' | 'Household' | 'Household (split)' | 'Shared house' | 'initials' | 'family';
const FILTERS: { id: Filter; label: string; test: (i: MailItem) => boolean }[] = [
  { id: 'all', label: 'All letters', test: () => true },
  { id: 'Household', label: 'Households', test: (i) => i.type === 'Household' },
  {
    id: 'Household (split)',
    label: 'Split households',
    test: (i) => i.type === 'Household (split)',
  },
  { id: 'Shared house', label: 'Shared houses', test: (i) => i.type === 'Shared house' },
  { id: 'initials', label: 'Using initials', test: (i) => i.usesInitials },
  { id: 'family', label: 'Using “The … Family”', test: (i) => i.usesFamilyName },
];

export function CheckStep({ parsed, result, options, onOptionsChange, onBack, onNext }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const summary = summarise(parsed, result);
  const leftOut = Object.values(summary.leftOut).reduce((a, b) => a + b, 0);
  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const everyday = options.mode === 'everyday';
  const filters = FILTERS.filter((f) => everyday || f.id !== 'family');
  const shown = (everyday ? sortByWalk(result.items) : sortItems(result.items)).filter((i) =>
    activeFilter?.test(i),
  );

  return (
    <section>
      <h2 tabIndex={-1}>Check your letters</h2>

      <div class="stats" aria-hidden="true">
        <div class="stat">
          <span class="stat-value">{n(summary.peopleIncluded)}</span>
          <span class="stat-label">people</span>
        </div>
        <div class="stat stat-arrow">→</div>
        <div class="stat stat-highlight">
          <span class="stat-value">{n(summary.letters)}</span>
          <span class="stat-label">letters</span>
        </div>
      </div>
      <p class="sr-only" aria-live="polite">
        {n(summary.peopleIncluded)} people will get {n(summary.letters)} letters.
      </p>
      <ul class="facts">
        {everyday && (
          <li>
            Names are shortened, so these letters{' '}
            <strong>can’t be sent as Royal Mail candidate mail</strong>. They’re sorted by walk,
            then polling number.
          </li>
        )}
        {summary.walksGuessed > 0 && (
          <li>
            {count(summary.walksGuessed, 'person had', 'people had')} no walk in Connect, so we’ve
            put them in the walk of their neighbours on the register.
          </li>
        )}
        {summary.lettersWithFamilyName > 0 && (
          <li>
            {count(summary.lettersWithFamilyName, 'letter is', 'letters are')} addressed to “The …
            Family” because everyone’s names wouldn’t fit.
          </li>
        )}
        {summary.duplicatesRemoved > 0 && (
          <li>
            {count(summary.duplicatesRemoved, 'duplicate row was', 'duplicate rows were')} removed
            from the export.
          </li>
        )}
        {(summary.lettersByType['Shared house'] ?? 0) > 0 && (
          <li>
            {count(summary.lettersByType['Shared house'] ?? 0, 'letter is', 'letters are')} for
            people in large shared houses.
          </li>
        )}
        {(summary.lettersByType['Household (split)'] ?? 0) > 0 && (
          <li>
            {count(summary.lettersByType['Household (split)'] ?? 0, 'letter is', 'letters are')} for
            households with too many names to fit in the envelope window, so they’ve been split.
          </li>
        )}
        {summary.lettersWithInitials > 0 && (
          <li>
            {count(summary.lettersWithInitials, 'letter uses', 'letters use')} initials (like “M
            Northwood”) to fit everyone in the envelope window.
            {everyday ? '' : ' Royal Mail accepts this.'}
          </li>
        )}
      </ul>

      <h3>Options</h3>
      <label class="option">
        <input
          type="checkbox"
          checked={options.separateSharedHouses}
          onChange={(e) =>
            onOptionsChange({ ...options, separateSharedHouses: e.currentTarget.checked })
          }
        />
        <span>
          <strong>Give everyone in a large shared house their own letter</strong> (recommended)
          <br />
          Where {SHARED_HOUSE_MIN_ELECTORS} or more people with {SHARED_HOUSE_MIN_SURNAMES} or more
          different surnames live at one address, it’s probably a shared house or HMO rather than a
          family, so we send each person their own letter.
        </span>
      </label>

      {result.attention.length > 0 && (
        <>
          <h3>Needs attention ({n(result.attention.length)})</h3>
          <p>
            {leftOut > 0
              ? `${n(leftOut)} people can’t be sent a letter because their record is incomplete. `
              : ''}
            This list is included in your download so you can fix these records in Connect.
          </p>
          <div class="table-wrap" tabIndex={0} role="region" aria-label="Records needing attention">
            <table>
              <thead>
                <tr>
                  <th scope="col">Problem</th>
                  <th scope="col">Name</th>
                  <th scope="col">Address</th>
                  <th scope="col">What we did</th>
                </tr>
              </thead>
              <tbody>
                {result.attention.slice(0, PREVIEW_LIMIT).map((a) => (
                  <tr key={a.elector.row}>
                    <td>{a.reason}</td>
                    <td>{[a.elector.firstName, a.elector.lastName].filter(Boolean).join(' ')}</td>
                    <td>
                      {[...addressLines(a.elector.address), a.elector.address.postcode]
                        .filter(Boolean)
                        .join(', ')}
                    </td>
                    <td>{a.excluded ? 'Left out' : 'Included – please check'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>Preview</h3>
      <label class="filter">
        Show{' '}
        <select value={filter} onChange={(e) => setFilter(e.currentTarget.value as Filter)}>
          {filters.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <p class="muted" aria-live="polite">
        {shown.length > PREVIEW_LIMIT
          ? `Showing the first ${PREVIEW_LIMIT} of ${n(shown.length)} letters.`
          : `${n(shown.length)} letters.`}
      </p>
      <div class="table-wrap" tabIndex={0} role="region" aria-label="Preview of letters">
        <table class="preview">
          <thead>
            <tr>
              <th scope="col">Envelope</th>
              <th scope="col">Salutation</th>
              {everyday && <th scope="col">Walk</th>}
              <th scope="col">Type</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, PREVIEW_LIMIT).map((item) => (
              <tr key={`${item.electors[0]?.row}`}>
                <td>
                  <address class="envelope">
                    {item.nameLines.map((l) => (
                      <span class="name-line" key={l}>
                        {l}
                      </span>
                    ))}
                    {[...addressLines(item.address), item.address.town, item.address.postcode]
                      .filter(Boolean)
                      .map((l) => (
                        <span key={l}>{l}</span>
                      ))}
                  </address>
                </td>
                <td>{item.salutation}</td>
                {everyday && <td>{collapse(item.electors.map((e) => e.walk))}</td>}
                <td>{item.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.items.length === 0 && (
        <p class="error">There’s nobody we can send a letter to. Please check your export.</p>
      )}
      <div class="actions">
        <button type="button" class="secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" class="primary" onClick={onNext} disabled={result.items.length === 0}>
          Create my download
        </button>
      </div>
    </section>
  );
}
