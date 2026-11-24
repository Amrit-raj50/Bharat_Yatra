import type { TFunction } from 'i18next';
import { splitDuration } from '@/domain/time';

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
