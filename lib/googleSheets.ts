import 'server-only';
import Papa from 'papaparse';
import { OPTION_KEYS, type FullQuestion, type OptionKey, type SanitizedQuestion } from './types';

export const REQUIRED_COLUMNS = [
  'question',
  'option1',
  'option2',
  'option3',
  'option4',
  'correct_option',
  'note',
] as const;

type SheetRow = Record<(typeof REQUIRED_COLUMNS)[number], string>;

export class SheetError extends Error {}

/** Extracts the spreadsheet id from any standard Google Sheets URL (or a bare id). */
export function extractSheetId(sheetUrl: string): string | null {
  const trimmed = sheetUrl.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{25,}$/.test(trimmed)) return trimmed;
  return null;
}

/** Keeps the tab the admin linked to (gid), if any. */
function extractGid(sheetUrl: string): string | null {
  const match = sheetUrl.match(/[#?&]gid=(\d+)/);
  return match ? match[1] : null;
}

export function buildCsvExportUrl(sheetUrl: string): string {
  const id = extractSheetId(sheetUrl);
  if (!id) throw new SheetError('That does not look like a Google Sheets URL.');
  const gid = extractGid(sheetUrl);
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
}

/**
 * Resolves the sheet's correct_option cell to an option key. Accepts
 * "option2", "Option 2", "2", "B", or the exact text of the correct option.
 */
export function normaliseCorrectOption(raw: string, options: readonly string[]): OptionKey | null {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const optionMatch = value.match(/^option\s*([1-4])$/);
  if (optionMatch) return `option${optionMatch[1]}` as OptionKey;

  if (/^[1-4]$/.test(value)) return `option${value}` as OptionKey;

  const letterIndex = ['a', 'b', 'c', 'd'].indexOf(value);
  if (letterIndex >= 0) return OPTION_KEYS[letterIndex];

  const textIndex = options.findIndex((o) => o.trim().toLowerCase() === value);
  if (textIndex >= 0) return OPTION_KEYS[textIndex];

  return null;
}

async function fetchSheetRows(sheetUrl: string): Promise<SheetRow[]> {
  const exportUrl = buildCsvExportUrl(sheetUrl);

  let res: Response;
  try {
    res = await fetch(exportUrl, { cache: 'no-store', redirect: 'follow' });
  } catch {
    throw new SheetError('Could not reach Google Sheets. Check your network and try again.');
  }

  // A private sheet redirects to Google's HTML sign-in page instead of CSV.
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok || contentType.includes('text/html')) {
    throw new SheetError(
      'The Google Sheet is not publicly accessible. Set sharing to "Anyone with the link can view".',
    );
  }

  const csv = await res.text();
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new SheetError(`The sheet is missing required column(s): ${missing.join(', ')}.`);
  }

  return parsed.data
    .map((row) => {
      const clean = {} as SheetRow;
      for (const col of REQUIRED_COLUMNS) clean[col] = (row[col] ?? '').toString().trim();
      return clean;
    })
    .filter((row) => row.question.length > 0);
}

/**
 * SERVER ONLY. Returns every column including correct_option and note.
 * Use for grading and the post-exam answer review; never send it to a live exam.
 */
export async function getFullSheetData(sheetUrl: string): Promise<FullQuestion[]> {
  const rows = await fetchSheetRows(sheetUrl);
  return rows.map((row, i) => {
    const options: [string, string, string, string] = [
      row.option1,
      row.option2,
      row.option3,
      row.option4,
    ];
    return {
      index: i + 1,
      question: row.question,
      options,
      correct_option: row.correct_option,
      correct_key: normaliseCorrectOption(row.correct_option, options),
      note: row.note,
    };
  });
}

/**
 * Safe for the candidate's browser: correct_option and note are stripped
 * before the data ever leaves the server.
 */
export async function getSanitizedQuestions(sheetUrl: string): Promise<SanitizedQuestion[]> {
  const rows = await fetchSheetRows(sheetUrl);
  return rows.map((row, i) => ({
    index: i + 1,
    question: row.question,
    options: [row.option1, row.option2, row.option3, row.option4],
  }));
}

/** Validation used when an admin creates an exam. */
export async function validateSheet(sheetUrl: string): Promise<{ questionCount: number }> {
  const questions = await getFullSheetData(sheetUrl);
  if (questions.length === 0) {
    throw new SheetError('The sheet has the right columns but contains no questions.');
  }

  const emptyOptions = questions.filter((q) => q.options.some((o) => !o)).map((q) => q.index);
  if (emptyOptions.length > 0) {
    throw new SheetError(
      `Question(s) ${emptyOptions.join(', ')} are missing one or more of the 4 options.`,
    );
  }

  const badAnswers = questions.filter((q) => !q.correct_key).map((q) => q.index);
  if (badAnswers.length > 0) {
    throw new SheetError(
      `Question(s) ${badAnswers.join(', ')} have an unrecognised correct_option. ` +
        'Use option1-option4, 1-4, A-D, or the exact option text.',
    );
  }

  return { questionCount: questions.length };
}
