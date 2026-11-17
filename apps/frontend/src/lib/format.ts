const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const BYTES_PER_KB = 1024;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30;

// "2026-11-13" → "13 Nov 2026"
export function formatDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

// The day of a moment on the user's own clock, as YYYY-MM-DD (today by default)
export function localIsoDate(moment: string | Date = new Date()): string {
  return new Date(moment).toLocaleDateString('en-CA');
}

// "2026-10-10" + 5 → "2026-10-15"
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

// A wait in plain words: 11 → "11 days", 34 → "1 month", 95 → "3 months"
export function formatWait(days: number): string {
  if (days < DAYS_PER_MONTH) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  const months = Math.floor(days / DAYS_PER_MONTH);
  return months === 1 ? '1 month' : `${months} months`;
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
