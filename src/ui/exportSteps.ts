import type { Mode } from '../core/types';

/**
 * How to export from Connect, as data so it can grow into a fuller walkthrough (e.g. with
 * screenshots) without changing the wizard. Keep in sync with docs/connect-export.md.
 */
export interface ExportStep {
  title: string;
  detail?: string;
}

const BUILD_LIST: ExportStep = { title: 'Build your list in Connect' };
const DOWNLOAD: ExportStep[] = [
  { title: 'Choose Export As “Excel (.xls)”' },
  {
    title: 'Go to “My Export Files” and download the .zip',
    detail: 'Don’t open it or unzip it. Just bring it straight here.',
  },
];

export const EXPORT_STEPS: Readonly<Record<Mode, readonly ExportStep[]>> = {
  'general-election': [
    {
      ...BUILD_LIST,
      detail:
        'Make sure it only includes people who can vote in this election. Royal Mail only delivers free candidate mail to eligible electors.',
    },
    { title: 'Click Export' },
    { title: 'Choose Export Format “Standard Text”' },
    ...DOWNLOAD,
  ],
  everyday: [
    BUILD_LIST,
    {
      title: 'Click Export',
      detail:
        'If you’ve saved the everyday export format before, choose it as the Export Format and skip to “Choose Export As”.',
    },
    { title: 'Choose Export Format “Standard Text”, then click “Customize export”' },
    {
      title:
        'Change the fields to export to: Voter File VANID, Name, Postal Address, Voting Address (Concatenated), Default Walk and Polling Number',
      detail: 'You can add other fields too. They’ll be kept in your file.',
    },
    {
      title: 'If you like, choose “Save as new export format”',
      detail: 'Next time you can pick it as the Export Format instead of customising again.',
    },
    ...DOWNLOAD,
  ],
};
