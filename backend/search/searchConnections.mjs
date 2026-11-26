const MINUTES_PER_DAY = 1440;

const RATING_THRESHOLDS = {
  TIGHT_MAX_EXCLUSIVE_MINUTES: 45,
  OK_MAX_EXCLUSIVE_MINUTES: 120,
  COMFORTABLE_MAX_INCLUSIVE_MINUTES: 480,
  UNKNOWN_TRANSFER_TIGHT_BELOW_MINUTES: 90,
  MAX_SEARCH_LAYOVER_MINUTES: 24 * 60,
  LATE_NIGHT_START_MINUTES: 23 * 60,
  LATE_NIGHT_END_MINUTES: 5 * 60,
};

function parseIsoDateUtc(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) {
    throw new Error(`Invalid ISO date (expected YYYY-MM-DD): ${isoDate}`);
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function addDaysIsoDate(isoDate, deltaDays) {
  const dt = parseIsoDateUtc(isoDate);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y = String(dt.getUTCFullYear()).padStart(4, '0');
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekdayBit(isoDate) {
  const utcDay = parseIsoDateUtc(isoDate).getUTCDay();
  return utcDay === 0 ? 1 << 6 : 1 << (utcDay - 1);
}

function doesTrainRunForBoardingDate(runningDays, boardingIsoDate, boardingStopDayOffset) {
  const originDate = addDaysIsoDate(boardingIsoDate, -boardingStopDayOffset);
  return (runningDays & getWeekdayBit(originDate)) !== 0;
}

export function rateConnection(layoverMinutes, transferMinutes, extraBufferMinutes = 0) {
  const safeExtra = Math.max(0, Number(extraBufferMinutes) || 0);
  if (transferMinutes === null) {
    return {
      effectiveBufferMinutes: null,
      rating:
        layoverMinutes < RATING_THRESHOLDS.UNKNOWN_TRANSFER_TIGHT_BELOW_MINUTES + safeExtra
          ? 'TIGHT'
          : 'TRANSFER_UNKNOWN',
      unknownTransferTime: true,
    };
  }
  const effectiveBufferMinutes = layoverMinutes - transferMinutes - safeExtra;
  let rating;
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

export function isLateNightTransferWindow(leg1ArrivalMinutes, leg2DepartureMinutes, layoverMinutes) {
  const inNight = (m) =>
    m >= RATING_THRESHOLDS.LATE_NIGHT_START_MINUTES || m < RATING_THRESHOLDS.LATE_NIGHT_END_MINUTES;
  if (inNight(leg1ArrivalMinutes) || inNight(leg2DepartureMinutes)) {
    return true;
  }
  if (leg1ArrivalMinutes > leg2DepartureMinutes) {
    return true;
  }
  return layoverMinutes >= 18 * 60;
}

export function searchConnectionsInDb(
  db,
  { sourceCode, destinationCode, travelDate, extraBufferMinutes = 0 }
) {
  const from = sourceCode.trim().toUpperCase();
  const to = destinationCode.trim().toUpperCase();
  if (!from || !to || from === to) {
    return [];
  }

  const getStation = db.prepare(
    'SELECT code, name, city, lat, lng, cityClusterId FROM Station WHERE code = ?'
  );
  const sourceStation = getStation.get(from);
  const destStation = getStation.get(to);
  if (!sourceStation || !destStation) {
    return [];
  }

  const getStopsAtStation = db.prepare(
    'SELECT id, trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset FROM TrainStop WHERE stationCode = ?'
  );
  const getTrain = db.prepare('SELECT number, name, runningDays FROM Train WHERE number = ?');
  const getStopsForTrain = db.prepare(
    'SELECT id, trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset FROM TrainStop WHERE trainNumber = ? ORDER BY sequence ASC'
  );
  const getCluster = db.prepare('SELECT id, name FROM CityCluster WHERE id = ?');
  const getClusterStations = db.prepare(
    'SELECT code, name, city, lat, lng, cityClusterId FROM Station WHERE cityClusterId = ? ORDER BY code ASC'
  );
  const getTransfer = db.prepare(
    'SELECT fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified FROM StationTransfer WHERE fromStationCode = ? AND toStationCode = ?'
  );

  const destStopsByTrain = new Map();
  for (const stop of getStopsAtStation.all(destStation.code)) {
    if (stop.arrivalMinutes !== null) {
      destStopsByTrain.set(stop.trainNumber, stop);
    }
  }
  if (destStopsByTrain.size === 0) {
    return [];
  }

  const results = [];
  for (const leg1OriginStop of getStopsAtStation.all(sourceStation.code)) {
    if (leg1OriginStop.departureMinutes === null) continue;
    const train1 = getTrain.get(leg1OriginStop.trainNumber);
    if (!train1) continue;
    if (!doesTrainRunForBoardingDate(train1.runningDays, travelDate, leg1OriginStop.dayOffset)) {
      continue;
    }

    const leg1DepAbs = leg1OriginStop.departureMinutes;
    const train1Stops = getStopsForTrain.all(train1.number);

    for (const hubArrivalStop of train1Stops) {
      if (
        hubArrivalStop.sequence <= leg1OriginStop.sequence ||
        hubArrivalStop.arrivalMinutes === null ||
        hubArrivalStop.stationCode === sourceStation.code ||
        hubArrivalStop.stationCode === destStation.code
      ) {
        continue;
      }

      const hub1 = getStation.get(hubArrivalStop.stationCode);
      if (!hub1) continue;

      const leg1ArrRelDays = hubArrivalStop.dayOffset - leg1OriginStop.dayOffset;
      const leg1ArrAbs = leg1ArrRelDays * MINUTES_PER_DAY + hubArrivalStop.arrivalMinutes;
      const hubCluster = hub1.cityClusterId ? getCluster.get(hub1.cityClusterId) : null;
      const candidateHub2Stations = hub1.cityClusterId
        ? getClusterStations.all(hub1.cityClusterId)
        : [hub1];

      for (const hub2 of candidateHub2Stations) {
        if (hub2.code === sourceStation.code || hub2.code === destStation.code) continue;

        const isStationChange = hub1.code !== hub2.code;
        const transferInfo = isStationChange ? getTransfer.get(hub1.code, hub2.code) : null;
        const transferMinutes = isStationChange
          ? transferInfo
            ? transferInfo.typicalMinutes
            : null
          : 0;

        const minLeg2DepAbs = leg1ArrAbs + (transferMinutes ?? 0);
        const maxLeg2DepAbs = leg1ArrAbs + RATING_THRESHOLDS.MAX_SEARCH_LAYOVER_MINUTES;

        for (const leg2BoardStop of getStopsAtStation.all(hub2.code)) {
          if (leg2BoardStop.departureMinutes === null) continue;
          if (leg2BoardStop.trainNumber === train1.number) continue;

          const leg2DestStop = destStopsByTrain.get(leg2BoardStop.trainNumber);
          if (
            !leg2DestStop ||
            leg2DestStop.sequence <= leg2BoardStop.sequence ||
            leg2DestStop.arrivalMinutes === null
          ) {
            continue;
          }

          const train2 = getTrain.get(leg2BoardStop.trainNumber);
          if (!train2) continue;

          const depMin = leg2BoardStop.departureMinutes;
          const minBoardRelDay = Math.ceil((minLeg2DepAbs - depMin) / MINUTES_PER_DAY);
          const maxBoardRelDay = Math.floor((maxLeg2DepAbs - depMin) / MINUTES_PER_DAY);

          for (let boardRelDay = minBoardRelDay; boardRelDay <= maxBoardRelDay; boardRelDay++) {
            const leg2BoardIsoDate = addDaysIsoDate(travelDate, boardRelDay);
            if (!doesTrainRunForBoardingDate(train2.runningDays, leg2BoardIsoDate, leg2BoardStop.dayOffset)) {
              continue;
            }

            const leg2DepAbs = boardRelDay * MINUTES_PER_DAY + depMin;
            const layoverMinutes = leg2DepAbs - leg1ArrAbs;
            if (layoverMinutes < 0 || layoverMinutes > RATING_THRESHOLDS.MAX_SEARCH_LAYOVER_MINUTES) {
              continue;
            }

            const leg2ArrRelDays = boardRelDay + (leg2DestStop.dayOffset - leg2BoardStop.dayOffset);
            const leg2ArrAbs = leg2ArrRelDays * MINUTES_PER_DAY + leg2DestStop.arrivalMinutes;
            const totalJourneyMinutes = leg2ArrAbs - leg1DepAbs;
            const evaluation = rateConnection(layoverMinutes, transferMinutes, extraBufferMinutes);
            const isLateNightTransfer = isLateNightTransferWindow(
              hubArrivalStop.arrivalMinutes,
              depMin,
              layoverMinutes
            );

            const id = [train1.number, hub1.code, hub2.code, train2.number, leg2BoardIsoDate].join('_');

            results.push({
              id,
              leg1: {
                trainNumber: train1.number,
                trainName: train1.name,
                runningDays: train1.runningDays,
                boardStation: sourceStation,
                alightStation: hub1,
                boardStop: leg1OriginStop,
                alightStop: hubArrivalStop,
                departureIsoDate: travelDate,
                departureMinutesFromMidnight: leg1OriginStop.departureMinutes,
                arrivalIsoDate: addDaysIsoDate(travelDate, leg1ArrRelDays),
                arrivalMinutesFromMidnight: hubArrivalStop.arrivalMinutes,
                durationMinutes: leg1ArrAbs - leg1DepAbs,
              },
              leg2: {
                trainNumber: train2.number,
                trainName: train2.name,
                runningDays: train2.runningDays,
                boardStation: hub2,
                alightStation: destStation,
                boardStop: leg2BoardStop,
                alightStop: leg2DestStop,
                departureIsoDate: leg2BoardIsoDate,
                departureMinutesFromMidnight: leg2BoardStop.departureMinutes,
                arrivalIsoDate: addDaysIsoDate(
                  leg2BoardIsoDate,
                  leg2DestStop.dayOffset - leg2BoardStop.dayOffset
                ),
                arrivalMinutesFromMidnight: leg2DestStop.arrivalMinutes,
                durationMinutes: leg2ArrAbs - leg2DepAbs,
              },
              hubClusterName: hubCluster?.name ?? null,
              isStationChange,
              layoverMinutes,
              transferMinutes,
              transferInfo: transferInfo ?? null,
              effectiveBufferMinutes: evaluation.effectiveBufferMinutes,
              totalJourneyMinutes,
              rating: evaluation.rating,
              ratingIsEstimate: true,
              unknownTransferTime: evaluation.unknownTransferTime,
              isLateNightTransfer,
            });
          }
        }
      }
    }
  }

  results.sort((a, b) => {
    if (a.totalJourneyMinutes !== b.totalJourneyMinutes) {
      return a.totalJourneyMinutes - b.totalJourneyMinutes;
    }
    if (a.layoverMinutes !== b.layoverMinutes) {
      return a.layoverMinutes - b.layoverMinutes;
    }
    return a.id.localeCompare(b.id);
  });

  return results;
}
