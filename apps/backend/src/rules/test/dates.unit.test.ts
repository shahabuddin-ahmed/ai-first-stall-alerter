import { daysBetween, parseIsoDate } from "../dates";

describe("parseIsoDate", () => {
    it.each(["2026-11-13", "2024-02-29", "0001-01-01", "9999-12-31"])("accepts the real date %s", (value) => {
        expect(parseIsoDate(value)).not.toBeNull();
    });

    it.each([
        ["2026-02-30", "day not in month"],
        ["2025-02-29", "not a leap year"],
        ["2026-13-01", "month 13"],
        ["0000-01-01", "year zero"],
        ["2026-1-05", "missing zero"],
        ["13/11/2026", "other format"],
        ["2026/11/05", "slashes"],
        ["2026-11-13T10:00", "time included"],
        ["٢٠٢٦-١١-١٣", "non-ASCII digits"],
        ["", "empty"],
    ])("rejects %s (%s)", (value) => {
        expect(parseIsoDate(value)).toBeNull();
    });
});

describe("daysBetween", () => {
    const days = (from: string, to: string) => daysBetween(parseIsoDate(from)!, parseIsoDate(to)!);

    it("is 0 on the same day", () => {
        expect(days("2026-11-13", "2026-11-13")).toBe(0);
    });

    it("counts whole calendar days", () => {
        expect(days("2026-10-10", "2026-11-13")).toBe(34);
    });

    it("is not affected by daylight saving changes", () => {
        expect(days("2026-03-28", "2026-03-30")).toBe(2); // EU change on 29 March
        expect(days("2026-10-31", "2026-11-02")).toBe(2); // US change on 1 November
    });

    it("works across leap days and years", () => {
        expect(days("2024-02-28", "2024-03-01")).toBe(2);
        expect(days("2025-12-31", "2026-01-01")).toBe(1);
    });
});
