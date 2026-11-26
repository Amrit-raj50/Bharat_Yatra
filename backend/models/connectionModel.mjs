/**
 * Connection Model: Server-side 1-stop connection search (SQLite & MongoDB).
 */
import { isMongoDb } from '../db/mongo.mjs';
import {
  isLateNightTransferWindow,
  rateConnection,
  searchConnectionsInDb,
} from '../search/searchConnections.mjs';

const MINUTES_PER_DAY = 1440;
const MAX_SEARCH_LAYOVER_MINUTES = 24 * 60;

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

async function searchConnectionsInMongo(
  db,
  { sourceCode, destinationCode, travelDate, extraBufferMinutes = 0 }
) {
  const from = sourceCode.trim().toUpperCase();
  const to = destinationCode.trim().toUpperCase();
  if (!from || !to || from === to) {
    return [];
  }

  const stationsCol = db.collection('stations');
  const stopsCol = db.collection('trainStops');
  const trainsCol = db.collection('trains');
  const clustersCol = db.collection('cityClusters');
  const transfersCol = db.collection('stationTransfers');

  const [sourceStation, destStation] = await Promise.all([
    stationsCol.findOne({ code: from }, { projection: { _id: 0 } }),
    stationsCol.findOne({ code: to }, { projection: { _id: 0 } }),
  ]);
  if (!sourceStation || !destStation) {
    return [];
  }

  const [destStops, sourceStops] = await Promise.all([
    stopsCol
      .find(
        { stationCode: destStation.code, arrivalMinutes: { $ne: null } },
        { projection: { _id: 0 } }
      )
      .toArray(),
    stopsCol
      .find(
        { stationCode: sourceStation.code, departureMinutes: { $ne: null } },
        { projection: { _id: 0 } }
      )
      .toArray(),
  ]);

  const destStopsByTrain = new Map();
  for (const s of destStops) {
    destStopsByTrain.set(s.trainNumber, s);
  }
  if (destStopsByTrain.size === 0 || sourceStops.length === 0) {
    return [];
  }

  const leg1TrainNums = [...new Set(sourceStops.map((s) => s.trainNumber))];
  const leg1Trains = await trainsCol
    .find({ number: { $in: leg1TrainNums } }, { projection: { _id: 0 } })
    .toArray();
  const train1ByNum = new Map(leg1Trains.map((t) => [t.number, t]));

  const runningLeg1Entries = [];
  for (const stop of sourceStops) {
    const t1 = train1ByNum.get(stop.trainNumber);
    if (t1 && doesTrainRunForBoardingDate(t1.runningDays, travelDate, stop.dayOffset)) {
      runningLeg1Entries.push({ stop, train1: t1 });
    }
  }
  if (runningLeg1Entries.length === 0) {
    return [];
  }

  const runningTrain1Nums = runningLeg1Entries.map((e) => e.train1.number);
  const allTrain1Stops = await stopsCol
    .find({ trainNumber: { $in: runningTrain1Nums } }, { projection: { _id: 0 } })
    .sort({ trainNumber: 1, sequence: 1 })
    .toArray();

  const stopsByTrain1 = new Map();
  const hub1Codes = new Set();
  for (const st of allTrain1Stops) {
    if (!stopsByTrain1.has(st.trainNumber)) {
      stopsByTrain1.set(st.trainNumber, []);
    }
    stopsByTrain1.get(st.trainNumber).push(st);
    if (
      st.arrivalMinutes !== null &&
      st.stationCode !== sourceStation.code &&
      st.stationCode !== destStation.code
    ) {
      hub1Codes.add(st.stationCode);
    }
  }

  const hub1Stations = await stationsCol
    .find({ code: { $in: [...hub1Codes] } }, { projection: { _id: 0 } })
    .toArray();
  const stationByCode = new Map(hub1Stations.map((s) => [s.code, s]));

  const clusterIds = [...new Set(hub1Stations.map((s) => s.cityClusterId).filter(Boolean))];
  const [clusters, clusterStations, transfers] = await Promise.all([
    clusterIds.length > 0
      ? clustersCol.find({ id: { $in: clusterIds } }, { projection: { _id: 0 } }).toArray()
      : [],
    clusterIds.length > 0
      ? stationsCol
          .find({ cityClusterId: { $in: clusterIds } }, { projection: { _id: 0 } })
          .toArray()
      : [],
    clusterIds.length > 0
      ? transfersCol.find({}, { projection: { _id: 0 } }).toArray()
      : [],
  ]);

  const clusterById = new Map(clusters.map((c) => [c.id, c]));
  const stationsByCluster = new Map();
  for (const cs of clusterStations) {
    stationByCode.set(cs.code, cs);
    if (!stationsByCluster.has(cs.cityClusterId)) {
      stationsByCluster.set(cs.cityClusterId, []);
    }
    stationsByCluster.get(cs.cityClusterId).push(cs);
  }
  const transferMap = new Map(
    transfers.map((tr) => [`${tr.fromStationCode}->${tr.toStationCode}`, tr])
  );

  const allHubCodes = [...new Set([...hub1Codes, ...clusterStations.map((s) => s.code)])].filter(
    (c) => c !== sourceStation.code && c !== destStation.code
  );
  if (allHubCodes.length === 0) {
    return [];
  }

  const leg2CandidateTrainNums = [...destStopsByTrain.keys()];
  const hub2Stops = await stopsCol
    .find(
      {
        stationCode: { $in: allHubCodes },
        departureMinutes: { $ne: null },
        trainNumber: { $in: leg2CandidateTrainNums },
      },
      { projection: { _id: 0 } }
    )
    .toArray();

  const hub2StopsByCode = new Map();
  const leg2TrainNums = new Set();
  for (const st of hub2Stops) {
    if (!hub2StopsByCode.has(st.stationCode)) {
      hub2StopsByCode.set(st.stationCode, []);
    }
    hub2StopsByCode.get(st.stationCode).push(st);
    leg2TrainNums.add(st.trainNumber);
  }

  const leg2Trains =
    leg2TrainNums.size > 0
      ? await trainsCol
          .find({ number: { $in: [...leg2TrainNums] } }, { projection: { _id: 0 } })
          .toArray()
      : [];
  const train2ByNum = new Map(leg2Trains.map((t) => [t.number, t]));

  const results = [];
  for (const { stop: leg1OriginStop, train1 } of runningLeg1Entries) {
    const leg1DepAbs = leg1OriginStop.departureMinutes;
    const train1Stops = stopsByTrain1.get(train1.number) ?? [];

    for (const hubArrivalStop of train1Stops) {
      if (
        hubArrivalStop.sequence <= leg1OriginStop.sequence ||
        hubArrivalStop.arrivalMinutes === null ||
        hubArrivalStop.stationCode === sourceStation.code ||
        hubArrivalStop.stationCode === destStation.code
      ) {
        continue;
      }

      const hub1 = stationByCode.get(hubArrivalStop.stationCode);
      if (!hub1) continue;

      const leg1ArrRelDays = hubArrivalStop.dayOffset - leg1OriginStop.dayOffset;
      const leg1ArrAbs = leg1ArrRelDays * MINUTES_PER_DAY + hubArrivalStop.arrivalMinutes;
      const hubCluster = hub1.cityClusterId ? clusterById.get(hub1.cityClusterId) : null;
      const candidateHub2Stations = hub1.cityClusterId
        ? stationsByCluster.get(hub1.cityClusterId) ?? [hub1]
        : [hub1];

      for (const hub2 of candidateHub2Stations) {
        if (hub2.code === sourceStation.code || hub2.code === destStation.code) continue;

        const isStationChange = hub1.code !== hub2.code;
        const transferInfo = isStationChange
          ? transferMap.get(`${hub1.code}->${hub2.code}`) ?? null
          : null;
        const transferMinutes = isStationChange
          ? transferInfo
            ? transferInfo.typicalMinutes
            : null
          : 0;

        const minLeg2DepAbs = leg1ArrAbs + (transferMinutes ?? 0);
        const maxLeg2DepAbs = leg1ArrAbs + MAX_SEARCH_LAYOVER_MINUTES;

        for (const leg2BoardStop of hub2StopsByCode.get(hub2.code) ?? []) {
          if (leg2BoardStop.trainNumber === train1.number) continue;
          const leg2DestStop = destStopsByTrain.get(leg2BoardStop.trainNumber);
          if (
            !leg2DestStop ||
            leg2DestStop.sequence <= leg2BoardStop.sequence ||
            leg2DestStop.arrivalMinutes === null
          ) {
            continue;
          }

          const train2 = train2ByNum.get(leg2BoardStop.trainNumber);
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
            if (layoverMinutes < 0 || layoverMinutes > MAX_SEARCH_LAYOVER_MINUTES) {
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

            const id = [train1.number, hub1.code, hub2.code, train2.number, leg2BoardIsoDate].join(
              '_'
            );

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
              transferInfo,
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

export async function findOneStopConnections(
  db,
  { sourceCode, destinationCode, travelDate, extraBufferMinutes = 0 }
) {
  if (isMongoDb(db)) {
    return searchConnectionsInMongo(db, {
      sourceCode,
      destinationCode,
      travelDate,
      extraBufferMinutes,
    });
  }
  return searchConnectionsInDb(db, {
    sourceCode,
    destinationCode,
    travelDate,
    extraBufferMinutes,
  });
}

export async function findDirectTrainsInDb(db, { sourceCode, destinationCode, travelDate }) {
  const from = sourceCode.trim().toUpperCase();
  const to = destinationCode.trim().toUpperCase();
  if (!from || !to || from === to) {
    return [];
  }

  let boardStops;
  let destStops;
  let trainsMap;

  if (isMongoDb(db)) {
    const stopsCol = db.collection('trainStops');
    const trainsCol = db.collection('trains');
    [boardStops, destStops] = await Promise.all([
      stopsCol
        .find({ stationCode: from, departureMinutes: { $ne: null } }, { projection: { _id: 0 } })
        .toArray(),
      stopsCol
        .find({ stationCode: to, arrivalMinutes: { $ne: null } }, { projection: { _id: 0 } })
        .toArray(),
    ]);
    const destNums = new Set(destStops.map((s) => s.trainNumber));
    const candidateNums = [...new Set(boardStops.map((s) => s.trainNumber).filter((n) => destNums.has(n)))];
    if (candidateNums.length === 0) return [];
    const trains = await trainsCol
      .find({ number: { $in: candidateNums } }, { projection: { _id: 0 } })
      .toArray();
    trainsMap = new Map(trains.map((t) => [t.number, t]));
  } else {
    boardStops = db
      .prepare(
        'SELECT id, trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset FROM TrainStop WHERE stationCode = ? AND departureMinutes IS NOT NULL'
      )
      .all(from);
    destStops = db
      .prepare(
        'SELECT id, trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset FROM TrainStop WHERE stationCode = ? AND arrivalMinutes IS NOT NULL'
      )
      .all(to);
    const getTrain = db.prepare('SELECT number, name, runningDays FROM Train WHERE number = ?');
    trainsMap = new Map();
    for (const s of boardStops) {
      if (!trainsMap.has(s.trainNumber)) {
        const t = getTrain.get(s.trainNumber);
        if (t) trainsMap.set(s.trainNumber, t);
      }
    }
  }

  const destByTrain = new Map(destStops.map((s) => [s.trainNumber, s]));
  const direct = [];
  for (const boardStop of boardStops) {
    const destStop = destByTrain.get(boardStop.trainNumber);
    if (!destStop || destStop.sequence <= boardStop.sequence) continue;
    const train = trainsMap.get(boardStop.trainNumber);
    if (!train || !doesTrainRunForBoardingDate(train.runningDays, travelDate, boardStop.dayOffset)) {
      continue;
    }
    const arrivalDayDelta = destStop.dayOffset - boardStop.dayOffset;
    direct.push({
      trainNumber: train.number,
      trainName: train.name,
      runningDays: train.runningDays,
      departureIsoDate: travelDate,
      departureMinutesFromMidnight: boardStop.departureMinutes,
      arrivalIsoDate: addDaysIsoDate(travelDate, arrivalDayDelta),
      arrivalMinutesFromMidnight: destStop.arrivalMinutes,
      durationMinutes:
        arrivalDayDelta * MINUTES_PER_DAY + destStop.arrivalMinutes - boardStop.departureMinutes,
    });
  }

  direct.sort((a, b) => a.durationMinutes - b.durationMinutes);
  return direct;
}
