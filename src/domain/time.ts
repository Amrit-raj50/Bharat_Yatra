export const MINUTES_PER_DAY = 1440;

export const WEEKDAY_BITS = {
  MON: 1 << 0,
  TUE: 1 << 1,
  WED: 1 << 2,
  THU: 1 << 3,
  FRI: 1 << 4,
  SAT: 1 << 5,
  SUN: 1 << 6,
} as const;

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDateUtc(isoDate: string): Date {
  const match = ISO_DATE_RE.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid ISO date (expected YYYY-MM-DD): ${isoDate}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${isoDate}`);
  }
  return date;
}

export function formatIsoDateUtc(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIsoDate(isoDate: string, deltaDays: number): string {
  const date = parseIsoDateUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return formatIsoDateUtc(date);
}

/**
 * Returns the WEEKDAY_BITS bit for a YYYY-MM-DD date in IST.
 * JS Date.getUTCDay(): 0 = Sun, 1 = Mon ... 6 = Sat.
 */
export function getWeekdayBit(isoDate: string): number {
  const utcDay = parseIsoDateUtc(isoDate).getUTCDay();
  if (utcDay === 0) {
    return WEEKDAY_BITS.SUN;
  }
  return 1 << (utcDay - 1);
}

/**
 * Checks whether a train runs when boarded at a stop with `boardingStopDayOffset`
 * on `boardingIsoDate`. The runningDays bitmask is evaluated against the train's
 * origin departure date (`boardingIsoDate - boardingStopDayOffset`).
 */
export function doesTrainRunForBoardingDate(
  runningDays: number,
  boardingIsoDate: string,
  boardingStopDayOffset: number
): boolean {
  const originDate = addDaysIsoDate(boardingIsoDate, -boardingStopDayOffset);
  return (runningDays & getWeekdayBit(originDate)) !== 0;
}

export function formatClockMinutes(minutesFromMidnight: number): string {
  const normalized = ((minutesFromMidnight % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function splitDuration(totalMinutes: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.round(totalMinutes));
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

export function getTodayIsoDateLocal(): string {
  const now = new Date();
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
