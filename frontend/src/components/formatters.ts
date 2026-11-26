import type { TFunction } from 'i18next';
import { splitDuration, WEEKDAY_BITS } from '@/domain/time';

export function formatDurationLocalized(totalMinutes: number, t: TFunction): string {
  const { hours, minutes } = splitDuration(totalMinutes);
  if (hours === 0) {
    return t('common.minutesOnly', { minutes });
  }
  return t('common.hoursMinutes', { hours, minutes });
}

export function formatIsoDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) {
    return isoDate;
  }
  const dt = new Date(Date.UTC(y, m - 1, d));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[dt.getUTCDay()] ?? '';
  const monthName = months[dt.getUTCMonth()] ?? '';
  return `${dayName}, ${String(d).padStart(2, '0')} ${monthName} ${y}`;
}

const ORDERED_DAYS: { bit: number; key: string }[] = [
  { bit: WEEKDAY_BITS.MON, key: 'mon' },
  { bit: WEEKDAY_BITS.TUE, key: 'tue' },
  { bit: WEEKDAY_BITS.WED, key: 'wed' },
  { bit: WEEKDAY_BITS.THU, key: 'thu' },
  { bit: WEEKDAY_BITS.FRI, key: 'fri' },
  { bit: WEEKDAY_BITS.SAT, key: 'sat' },
  { bit: WEEKDAY_BITS.SUN, key: 'sun' },
];

export function formatRunningDays(runningDays: number, t: TFunction): string {
  if ((runningDays & 127) === 127) {
    return t('common.daily');
  }
  const labels = ORDERED_DAYS.filter((d) => (runningDays & d.bit) !== 0).map((d) =>
    t(`weekdays.${d.key}`)
  );
  return labels.join(', ');
}
