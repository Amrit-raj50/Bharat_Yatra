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
 */
export function rateConnection(
  layoverMinutes: number,
  transferMinutes: number | null
): BufferEvaluation {
  if (transferMinutes === null) {
    const rating: BufferRating =
      layoverMinutes < RATING_THRESHOLDS.UNKNOWN_TRANSFER_TIGHT_BELOW_MINUTES
        ? 'TIGHT'
        : 'TRANSFER_UNKNOWN';

    return {
      effectiveBufferMinutes: null,
      rating,
      unknownTransferTime: true,
    };
  }

  const effectiveBufferMinutes = layoverMinutes - transferMinutes;

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
