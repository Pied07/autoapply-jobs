export const APPLICATION_COOLDOWN_DAYS = 30;
export const WEEKLY_HISTORY_RETENTION_DAYS = 7;

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSunday(date = new Date()) {
  return date.getDay() === 0;
}
