// Calendar dates as whole day numbers (days since 1970-01-01, UTC).
// Never `new Date("YYYY-MM-DD")`: day maths in UTC is exact, so time zones and daylight saving have no effect.
const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

// Returns the day number of a real YYYY-MM-DD date, or null (wrong format, or a date that does not exist).
export const parseIsoDate = (value: string): number | null => {
    const match = ISO_DATE.exec(value);
    if (!match) {
        return null;
    }
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (year < 1) {
        return null;
    }

    // setUTCFullYear (not Date.UTC) so years 1-99 are not moved to 1900-1999.
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return null; // e.g. 2026-02-30 rolled over into March
    }
    return Math.round(date.getTime() / MS_PER_DAY);
};

export const daysBetween = (fromDay: number, toDay: number): number => toDay - fromDay;

// Day number → "YYYY-MM-DD" (years 1-9999).
export const toIsoDate = (dayNumber: number): string => {
    const date = new Date(dayNumber * MS_PER_DAY);
    const year = String(date.getUTCFullYear()).padStart(4, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// The UTC calendar day of a moment in time (milliseconds since 1970).
export const dayNumberOf = (epochMs: number): number => Math.floor(epochMs / MS_PER_DAY);
