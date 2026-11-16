const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const BYTES_PER_KB = 1024;

// "2026-11-13" → "13 Nov 2026"
export function formatDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

// Today on the user's own clock, as YYYY-MM-DD
export function todayIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function formatFileSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} B`;
  }
  if (bytes < BYTES_PER_KB * BYTES_PER_KB) {
    return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
  }
  return `${(bytes / BYTES_PER_KB / BYTES_PER_KB).toFixed(1)} MB`;
}
