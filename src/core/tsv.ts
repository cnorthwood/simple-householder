/** Collapse runs of whitespace (JS `\s` includes non-breaking spaces) and trim (IN-5). */
export function cleanValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Undo Excel text protection (`="…"`) and simple CSV-style quoting (IN-3). */
export function unwrapField(raw: string): string {
  const value = raw.trim();
  const excel = /^="(.*)"$/s.exec(value);
  if (excel) return excel[1] ?? '';
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"');
  }
  return value;
}

/** Split tab-separated text into rows of cleaned fields, skipping blank rows (IN-3, IN-5). */
export function parseTsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split('\t').map((field) => cleanValue(unwrapField(field))));
}
