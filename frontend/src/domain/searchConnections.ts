import { RATING_THRESHOLDS } from '@/config/ratingThresholds';
import { isLateNightTransferWindow, rateConnection } from './rateConnection';
import { addDaysIsoDate, doesTrainRunForBoardingDate, MINUTES_PER_DAY } from './time';
import type {
  ConnectionLeg,
  ConnectionOption,
  DirectTrainOption,
  Station,
  TimetableRepository,
  TrainStop,
} from './types';

export interface SearchConnectionsInput {
  sourceCode: string;
  destinationCode: string;
  /** Travel date (YYYY-MM-DD, IST) at source station. */
  travelDate: string;
  /** Optional extra buffer minutes (e.g. family/luggage profile). */
  extraBufferMinutes?: number;
}

function buildClusterLookup(repo: TimetableRepository, hub1: Station): Station[] {
  if (!hub1.cityClusterId) {
    return [hub1];
  }
  const clusterStations = repo.getStationsInCluster(hub1.cityClusterId);
  if (clusterStations.some((s) => s.code === hub1.code)) {
    return clusterStations;
  }
  return [hub1, ...clusterStations];
}

function buildLeg(
  trainNumber: string,
  trainName: string,
  runningDays: number,
  boardStation: Station,
  alightStation: Station,
  boardStop: TrainStop,
  alightStop: TrainStop,
  departureIsoDate: string,
  departureAbsMinutes: number,
  arrivalAbsMinutes: number
): ConnectionLeg {
  const arrivalDayDelta = alightStop.dayOffset - boardStop.dayOffset;
  return {
    trainNumber,
    trainName,
    runningDays,
    boardStation,
    alightStation,
    boardStop,
    alightStop,
    departureIsoDate,
    departureMinutesFromMidnight: boardStop.departureMinutes!,
    arrivalIsoDate: addDaysIsoDate(departureIsoDate, arrivalDayDelta),
    arrivalMinutesFromMidnight: alightStop.arrivalMinutes!,
    durationMinutes: arrivalAbsMinutes - departureAbsMinutes,
  };
}

/**
 * Finds 1-stop train-to-train connections between sourceCode and destinationCode
 * on travelDate (IST), supporting same-station and same-cityCluster transfers,
 * overnight day offsets, and Mon-Sun runningDays bitmasks.
 *
 * Results are sorted ascending by totalJourneyMinutes and never hide Tight options.
 */
export function searchConnections(
  repo: TimetableRepository,
  input: SearchConnectionsInput
): ConnectionOption[] {
  const sourceCode = input.sourceCode.trim().toUpperCase();
  const destinationCode = input.destinationCode.trim().toUpperCase();
  if (!sourceCode || !destinationCode || sourceCode === destinationCode) {
    return [];
  }

  const sourceStation = repo.getStationByCode(sourceCode);
  const destStation = repo.getStationByCode(destinationCode);
  if (!sourceStation || !destStation) {
    return [];
  }

  const destStopsByTrain = new Map<string, TrainStop>();
  for (const stop of repo.getStopsAtStation(destStation.code)) {
    if (stop.arrivalMinutes !== null) {
      destStopsByTrain.set(stop.trainNumber, stop);
    }
  }
  if (destStopsByTrain.size === 0) {
    return [];
  }

  const results: ConnectionOption[] = [];
  const sourceStops = repo.getStopsAtStation(sourceStation.code);

  for (const leg1OriginStop of sourceStops) {
    if (leg1OriginStop.departureMinutes === null) {
      continue;
    }

    const train1 = repo.getTrainByNumber(leg1OriginStop.trainNumber);
    if (!train1) {
      continue;
    }
    if (!doesTrainRunForBoardingDate(train1.runningDays, input.travelDate, leg1OriginStop.dayOffset)) {
      continue;
    }

    const leg1DepAbs = leg1OriginStop.departureMinutes;
    const train1Stops = repo.getStopsForTrain(train1.number);

    for (const hubArrivalStop of train1Stops) {
      if (
        hubArrivalStop.sequence <= leg1OriginStop.sequence ||
        hubArrivalStop.arrivalMinutes === null ||
        hubArrivalStop.stationCode === sourceStation.code ||
        hubArrivalStop.stationCode === destStation.code
      ) {
        continue;
      }

      const hub1 = repo.getStationByCode(hubArrivalStop.stationCode);
      if (!hub1) {
        continue;
      }

      const leg1ArrRelDays = hubArrivalStop.dayOffset - leg1OriginStop.dayOffset;
      const leg1ArrAbs = leg1ArrRelDays * MINUTES_PER_DAY + hubArrivalStop.arrivalMinutes;
      const hubCluster = hub1.cityClusterId ? repo.getCityClusterById(hub1.cityClusterId) : null;
      const candidateHub2Stations = buildClusterLookup(repo, hub1);

      for (const hub2 of candidateHub2Stations) {
        if (hub2.code === sourceStation.code || hub2.code === destStation.code) {
          continue;
        }

        const isStationChange = hub1.code !== hub2.code;
        const transferInfo = isStationChange ? repo.getTransfer(hub1.code, hub2.code) : null;
        const transferMinutes = isStationChange
          ? transferInfo
            ? transferInfo.typicalMinutes
            : null
          : 0;

        const minLeg2DepAbs = leg1ArrAbs + (transferMinutes ?? 0);
        const maxLeg2DepAbs = leg1ArrAbs + RATING_THRESHOLDS.MAX_SEARCH_LAYOVER_MINUTES;

        const hub2Stops = repo.getStopsAtStation(hub2.code);
        for (const leg2BoardStop of hub2Stops) {
          if (leg2BoardStop.departureMinutes === null) {
            continue;
          }
          if (leg2BoardStop.trainNumber === train1.number) {
            continue;
          }

          const leg2DestStop = destStopsByTrain.get(leg2BoardStop.trainNumber);
          if (
            !leg2DestStop ||
            leg2DestStop.sequence <= leg2BoardStop.sequence ||
            leg2DestStop.arrivalMinutes === null
          ) {
            continue;
          }

          const train2 = repo.getTrainByNumber(leg2BoardStop.trainNumber);
          if (!train2) {
            continue;
          }

          const depMin = leg2BoardStop.departureMinutes;
          const minBoardRelDay = Math.ceil((minLeg2DepAbs - depMin) / MINUTES_PER_DAY);
          const maxBoardRelDay = Math.floor((maxLeg2DepAbs - depMin) / MINUTES_PER_DAY);

          for (let boardRelDay = minBoardRelDay; boardRelDay <= maxBoardRelDay; boardRelDay++) {
            const leg2BoardIsoDate = addDaysIsoDate(input.travelDate, boardRelDay);
            if (
              !doesTrainRunForBoardingDate(
                train2.runningDays,
                leg2BoardIsoDate,
                leg2BoardStop.dayOffset
              )
            ) {
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

            const evaluation = rateConnection(
              layoverMinutes,
              transferMinutes,
              input.extraBufferMinutes ?? 0
            );
            const lateNight = isLateNightTransferWindow(
              hubArrivalStop.arrivalMinutes,
              depMin,
              layoverMinutes
            );

            const leg1 = buildLeg(
              train1.number,
              train1.name,
              train1.runningDays,
              sourceStation,
              hub1,
              leg1OriginStop,
              hubArrivalStop,
              input.travelDate,
              leg1DepAbs,
              leg1ArrAbs
            );

            const leg2 = buildLeg(
              train2.number,
              train2.name,
              train2.runningDays,
              hub2,
              destStation,
              leg2BoardStop,
              leg2DestStop,
              leg2BoardIsoDate,
              leg2DepAbs,
              leg2ArrAbs
            );

            const id = [
              train1.number,
              hub1.code,
              hub2.code,
              train2.number,
              leg2BoardIsoDate,
            ].join('_');

            results.push({
              id,
              leg1,
              leg2,
              hubClusterName: hubCluster?.name ?? null,
              isStationChange,
              layoverMinutes,
              transferMinutes,
              transferInfo,
              effectiveBufferMinutes: evaluation.effectiveBufferMinutes,
              totalJourneyMinutes,
              rating: evaluation.rating,
              ratingIsEstimate: true,
              unknownTransferTime: evaluation.unknownTransferTime,
              isLateNightTransfer: lateNight,
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

/**
 * Finds direct trains between sourceCode and destinationCode on travelDate (IST)
 * so passengers can compare 1-stop connections against direct alternatives.
 */
export function findDirectTrains(
  repo: TimetableRepository,
  input: Pick<SearchConnectionsInput, 'sourceCode' | 'destinationCode' | 'travelDate'>
): DirectTrainOption[] {
  const sourceCode = input.sourceCode.trim().toUpperCase();
  const destinationCode = input.destinationCode.trim().toUpperCase();
  if (!sourceCode || !destinationCode || sourceCode === destinationCode) {
    return [];
  }

  const destStopsByTrain = new Map<string, TrainStop>();
  for (const stop of repo.getStopsAtStation(destinationCode)) {
    if (stop.arrivalMinutes !== null) {
      destStopsByTrain.set(stop.trainNumber, stop);
    }
  }
  if (destStopsByTrain.size === 0) {
    return [];
  }

  const direct: DirectTrainOption[] = [];
  for (const boardStop of repo.getStopsAtStation(sourceCode)) {
    if (boardStop.departureMinutes === null) {
      continue;
    }
    const destStop = destStopsByTrain.get(boardStop.trainNumber);
    if (!destStop || destStop.sequence <= boardStop.sequence || destStop.arrivalMinutes === null) {
      continue;
    }

    const train = repo.getTrainByNumber(boardStop.trainNumber);
    if (!train) {
      continue;
    }
    if (!doesTrainRunForBoardingDate(train.runningDays, input.travelDate, boardStop.dayOffset)) {
      continue;
    }

    const arrivalDayDelta = destStop.dayOffset - boardStop.dayOffset;
    const durationMinutes =
      arrivalDayDelta * MINUTES_PER_DAY + destStop.arrivalMinutes - boardStop.departureMinutes;

    direct.push({
      trainNumber: train.number,
      trainName: train.name,
      runningDays: train.runningDays,
      departureIsoDate: input.travelDate,
      departureMinutesFromMidnight: boardStop.departureMinutes,
      arrivalIsoDate: addDaysIsoDate(input.travelDate, arrivalDayDelta),
      arrivalMinutesFromMidnight: destStop.arrivalMinutes,
      durationMinutes,
    });
  }

  direct.sort((a, b) => a.durationMinutes - b.durationMinutes);
  return direct;
}
