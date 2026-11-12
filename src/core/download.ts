import type { HouseholdOptions, HouseholdResult } from './household';
import { addressesCsv, attentionCsv, summarise, summaryText } from './output';
import type { ParsedExport } from './parseExport';
import { createEncryptedZip } from './zip';

export const PRINTER_FILE = 'addresses-for-printer.csv';
export const EVERYDAY_FILE = 'addresses-by-walk.csv';
export const ATTENTION_FILE = 'needs-attention.csv';
export const SUMMARY_FILE = 'summary.txt';

/** The files that go in the zip (PW-1). The attention list is only included if non-empty. */
export function downloadFiles(
  parsed: ParsedExport,
  result: HouseholdResult,
  options: HouseholdOptions,
  date: Date,
): { name: string; content: string }[] {
  const summary = summaryText(summarise(parsed, result), {
    fileName: parsed.fileName,
    date,
    separateSharedHouses: options.separateSharedHouses,
    mode: options.mode,
  });
  return [
    {
      name: options.mode === 'everyday' ? EVERYDAY_FILE : PRINTER_FILE,
      content: addressesCsv(result.items, options.mode, parsed.extraColumns),
    },
    { name: SUMMARY_FILE, content: summary },
    ...(result.attention.length > 0
      ? [{ name: ATTENTION_FILE, content: attentionCsv(result) }]
      : []),
  ];
}

export function downloadFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `householded-addresses-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`;
}

/** Build the password-protected zip offered to the user (PW-1). */
export async function buildDownload(
  parsed: ParsedExport,
  result: HouseholdResult,
  options: HouseholdOptions,
  password: string,
  date = new Date(),
): Promise<{ blob: Blob; fileName: string }> {
  const blob = await createEncryptedZip(downloadFiles(parsed, result, options, date), password);
  return { blob, fileName: downloadFileName(date) };
}
