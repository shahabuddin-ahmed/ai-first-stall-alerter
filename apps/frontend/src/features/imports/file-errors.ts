import { ApiError } from '@/lib/api';

interface FileErrorInfo {
  when: string;
  fix: string;
}

// The codes the backend uses when it rejects a whole file
export const FILE_ERRORS: Record<string, FileErrorInfo> = {
  FILE_TOO_LARGE: { when: 'Over 5 MB', fix: 'Split the file and import each part.' },
  UNSUPPORTED_FILE: { when: 'Not a .csv file', fix: 'Save the sheet as CSV and import it again.' },
  INVALID_ENCODING: { when: 'Not UTF-8 text', fix: 'Save the file as CSV UTF-8 and try again.' },
  EMPTY_FILE: { when: 'No rows, or header only', fix: 'Add at least one candidate row below the header.' },
  TOO_MANY_ROWS: { when: 'More than 10,000 rows', fix: 'Import at most 10,000 rows at a time.' },
  MISSING_HEADERS: {
    when: 'A required column is missing',
    fix: 'Add the missing columns to the header row (names must match exactly), save as CSV (UTF-8), and import again.'
  },
  DUPLICATE_HEADERS: {
    when: 'A column appears twice, or a header is blank',
    fix: 'Give every column one unique, non-blank name.'
  },
  INVALID_CSV: {
    when: 'Cannot be parsed (for example an unclosed quote)',
    fix: 'Fix the line shown, then save as CSV again.'
  },
  VALUE_TOO_LONG: { when: 'A value is longer than its column allows', fix: 'Shorten the values shown.' }
};

export function isFileError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code in FILE_ERRORS;
}
