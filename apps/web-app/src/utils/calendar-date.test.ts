import { describe, expect, it } from "vitest";
import {
  getCalendarDateInTimeZone,
  getInclusiveCalendarDayCount,
  parseCalendarDate,
} from "./calendar-date";

describe("calendar-date", () => {
  it.each([
    ["2026-07-23", "2026-07-23", 1],
    ["2026-07-22", "2026-07-23", 2],
    ["2020-01-01", "2026-07-23", 2_396],
    ["2026-01-31", "2026-02-01", 2],
    ["2025-12-31", "2026-01-01", 2],
    ["2024-02-28", "2024-03-01", 3],
    ["2024-03-09", "2024-03-11", 3],
  ])("counts %s through %s inclusively", (startDate, today, expected) => {
    expect(getInclusiveCalendarDayCount(startDate, parseCalendarDate(today) ?? undefined)).toBe(
      expected,
    );
  });

  it.each([null, undefined, "", "2026-7-03", "2026-02-29", "2026-02-30", "not-a-date"])(
    "rejects unavailable value %s",
    (value) => {
      expect(parseCalendarDate(value)).toBeNull();
      expect(getInclusiveCalendarDayCount(value, new Date(2026, 6, 23))).toBeNull();
    },
  );

  it("rejects future dates", () => {
    expect(getInclusiveCalendarDayCount("2026-07-24", new Date(2026, 6, 23))).toBeNull();
  });

  it("gets today's date across UTC offsets", () => {
    const now = new Date("2026-07-23T01:00:00Z");

    expect(getCalendarDateInTimeZone("America/Los_Angeles", now)).toBe("2026-07-22");
    expect(getCalendarDateInTimeZone("Asia/Tokyo", now)).toBe("2026-07-23");
    expect(getCalendarDateInTimeZone("Not/A_Timezone", now)).toBeNull();
  });
});
