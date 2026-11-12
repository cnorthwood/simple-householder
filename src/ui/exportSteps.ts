/**
 * How to export from Connect, as data so it can grow into a fuller walkthrough (e.g. with
 * screenshots) without changing the wizard. Keep in sync with docs/connect-export.md.
 */
export interface ExportStep {
  title: string;
  detail?: string;
}

export const CONNECT_EXPORT_STEPS: readonly ExportStep[] = [
  {
    title: 'Build your list in Connect',
    detail:
      'Make sure it only includes people who can vote in this election. Royal Mail only delivers free candidate mail to eligible electors.',
  },
  { title: 'Click Export' },
  { title: 'Choose Export Format “Standard Text”' },
  { title: 'Choose Export As “Excel (.xls)”' },
  {
    title: 'Go to “My Export Files” and download the .zip',
    detail: 'Don’t open it or unzip it. Just bring it straight here.',
  },
];
