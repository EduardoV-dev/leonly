export const DISPLAY_NAME_MAX_LENGTH = 50;
export const SPACE_NAME_MAX_LENGTH = 100;

export function isFutureDate(date: Date) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return date > today;
}
