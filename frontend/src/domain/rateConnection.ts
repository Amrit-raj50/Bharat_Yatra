import { RATING_THRESHOLDS } from '@/config/ratingThresholds';
import type { BufferRating } from './types';

export interface BufferEvaluation {
  effectiveBufferMinutes: number | null;
  rating: BufferRating;
  unknownTransferTime: boolean;
}

/**
 * Computes a schedule-based buffer rating estimate.
 * Never produces probabilities; when transferMinutes is unknown for a station
 * change, rating is capped so it is never COMFORTABLE.
 *
 * @param extraBufferMinutes Optional passenger-configured extra buffer (e.g., family/luggage).
 */
export function rateConnection(
  layoverMinutes: number,
  transferMinutes: number | null,
  extraBufferMinutes = 0
): BufferEvaluation {
  const safeExtra = Math.max(0, extraBufferMinutes);

  if (transferMinutes === null) {
    const rating: BufferRating =
      layoverMinutes < RATING_THRESHOLDS.UNKNOWN_TRANSFER_TIGHT_BELOW_MINUTES + safeExtra
        ? 'TIGHT'
        : 'TRANSFER_UNKNOWN';

    return {
      effectiveBufferMinutes: null,
      rating,
      unknownTransferTime: true,
    };
  }

  const effectiveBufferMinutes = layoverMinutes - transferMinutes - safeExtra;

  let rating: BufferRating;
  if (effectiveBufferMinutes < RATING_THRESHOLDS.TIGHT_MAX_EXCLUSIVE_MINUTES) {
    rating = 'TIGHT';
  } else if (effectiveBufferMinutes < RATING_THRESHOLDS.OK_MAX_EXCLUSIVE_MINUTES) {
    rating = 'OK';
  } else if (effectiveBufferMinutes <= RATING_THRESHOLDS.COMFORTABLE_MAX_INCLUSIVE_MINUTES) {
    rating = 'COMFORTABLE';
  } else {
    rating = 'TOO_LONG';
  }

  return {
    effectiveBufferMinutes,
    rating,
    unknownTransferTime: false,
  };
}

/**
 * Returns true if the transfer/layover window overlaps late-night hours
 * (23:00–05:00 IST), when local transit options are sparser.
 */
export function isLateNightTransferWindow(
  leg1ArrivalMinutes: number,
  leg2DepartureMinutes: number,
  layoverMinutes: number
): boolean {
  const start = RATING_THRESHOLDS.LATE_NIGHT_START_MINUTES;
  const end = RATING_THRESHOLDS.LATE_NIGHT_END_MINUTES;

  const inNightWindow = (minutes: number): boolean => minutes >= start || minutes < end;

  if (inNightWindow(leg1ArrivalMinutes) || inNightWindow(leg2DepartureMinutes)) {
    return true;
  }

  // If arrival clock time is after departure clock time, the layover crosses midnight (00:00-05:00).
  if (leg1ArrivalMinutes > leg2DepartureMinutes) {
    return true;
  }

  // A layover >= 18h spans through the entire overnight window regardless of start clock.
  return layoverMinutes >= 18 * 60;
}
