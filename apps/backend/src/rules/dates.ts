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
