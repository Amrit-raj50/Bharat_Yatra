/**
 * Buffer rating thresholds (in minutes of effective buffer = layover - transfer).
 *
 * IMPORTANT:
 * These default constants are initial engineering assumptions and are
 * flagged as: "to be validated with real passenger data".
 *
 * All ratings produced from these thresholds must be displayed in the UI
 * as schedule-based estimates, never probabilities.
 */
export const RATING_THRESHOLDS = {
  /** Flagged assumption — to be validated with real passenger data. */
  ASSUMPTION_STATUS: 'to be validated with real passenger data' as const,

  /**
   * Minimum effective buffer (minutes) to move out of "Tight" into "OK".
   * Below this value (and >= 0), the connection is rated TIGHT.
   */
  TIGHT_MAX_EXCLUSIVE_MINUTES: 45,

  /**
   * Minimum effective buffer (minutes) to move out of "OK" into "Comfortable".
   */
  OK_MAX_EXCLUSIVE_MINUTES: 120,

  /**
   * Maximum effective buffer (minutes) still considered "Comfortable".
   * Above this threshold, the connection is rated TOO_LONG (long/overnight wait).
   */
  COMFORTABLE_MAX_INCLUSIVE_MINUTES: 480,

  /**
   * When a station change occurs and no StationTransfer entry exists,
   * transferMinutes is unknown. If raw layover is below this threshold,
   * rate as TIGHT; otherwise cap at TRANSFER_UNKNOWN (never COMFORTABLE).
   */
  UNKNOWN_TRANSFER_TIGHT_BELOW_MINUTES: 90,

  /**
   * Upper cap on layover duration considered when searching for Leg 2 departures.
   */
  MAX_SEARCH_LAYOVER_MINUTES: 24 * 60,
} as const;
