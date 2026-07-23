const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 86_400_000;

export function parseCalendarDate(value: string | null | undefined): Date | null {
  const match = value?.match(DATE_ONLY_PATTERN);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function getCalendarDateInTimeZone(timeZone: string, now = new Date()): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return null;
  }
}

export function getInclusiveCalendarDayCount(
  startDateValue: string | null | undefined,
  today = new Date(),
): number | null {
  const startDate = parseCalendarDate(startDateValue);

  if (!startDate) {
    return null;
  }

  const startDay = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  if (startDay > currentDay) {
    return null;
  }

  return (currentDay - startDay) / MILLISECONDS_PER_DAY + 1;
}
