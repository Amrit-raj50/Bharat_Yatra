import type {
  CityCluster,
  DatasetKind,
  Station,
  StationTransfer,
  Train,
  TrainStop,
} from '@/domain/types';
import type { SQLiteDatabaseLike } from './migrations';
import {
  SAMPLE_CITY_CLUSTERS,
  SAMPLE_DATASET_META,
  SAMPLE_STATIONS,
  SAMPLE_STATION_TRANSFERS,
  SAMPLE_TRAINS,
  SAMPLE_TRAIN_STOPS,
} from './seedSample';

export interface TimetablePayload {
  meta?: {
    dataVersion?: string;
    lastUpdated?: string;
  };
  cityClusters?: CityCluster[];
  stations: Station[];
  trains: Train[];
  trainStops: TrainStop[];
  stationTransfers?: StationTransfer[];
}

export interface ImportResult {
  stations: number;
  trains: number;
  stops: number;
  clusters: number;
  transfers: number;
  dataVersion: string;
  lastUpdated: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateTimetablePayload(raw: unknown): TimetablePayload {
  if (!isObject(raw)) {
    throw new Error('Timetable JSON must be an object.');
  }

  if (!Array.isArray(raw.stations) || raw.stations.length === 0) {
    throw new Error('Timetable JSON must include a non-empty "stations" array.');
  }
  if (!Array.isArray(raw.trains) || raw.trains.length === 0) {
    throw new Error('Timetable JSON must include a non-empty "trains" array.');
  }
  if (!Array.isArray(raw.trainStops) || raw.trainStops.length === 0) {
    throw new Error('Timetable JSON must include a non-empty "trainStops" array.');
  }

  const clusterIds = new Set<string>();
  const cityClusters: CityCluster[] = [];
  if (raw.cityClusters !== undefined) {
    if (!Array.isArray(raw.cityClusters)) {
      throw new Error('"cityClusters" must be an array.');
    }
    for (const c of raw.cityClusters) {
      if (!isObject(c) || !isNonEmptyString(c.id) || !isNonEmptyString(c.name)) {
        throw new Error('Each cityCluster must have non-empty "id" and "name".');
      }
      const id = c.id.trim();
      clusterIds.add(id);
      cityClusters.push({ id, name: c.name.trim() });
    }
  }

  const stationCodes = new Set<string>();
  const stations: Station[] = [];
  for (const s of raw.stations) {
    if (
      !isObject(s) ||
      !isNonEmptyString(s.code) ||
      !isNonEmptyString(s.name) ||
      !isNonEmptyString(s.city) ||
      !isFiniteNumber(s.lat) ||
      !isFiniteNumber(s.lng)
    ) {
      throw new Error('Each station must have code, name, city, lat, and lng.');
    }
    const code = s.code.trim().toUpperCase();
    const clusterId = isNonEmptyString(s.cityClusterId) ? s.cityClusterId.trim() : null;
    if (clusterId && !clusterIds.has(clusterId)) {
      throw new Error(`Station ${code} references unknown cityClusterId "${clusterId}".`);
    }
    stationCodes.add(code);
    stations.push({
      code,
      name: s.name.trim(),
      city: s.city.trim(),
      lat: s.lat,
      lng: s.lng,
      cityClusterId: clusterId,
    });
  }

  const trainNumbers = new Set<string>();
  const trains: Train[] = [];
  for (const tr of raw.trains) {
    if (
      !isObject(tr) ||
      !isNonEmptyString(tr.number) ||
      !isNonEmptyString(tr.name) ||
      !Number.isInteger(tr.runningDays) ||
      (tr.runningDays as number) < 1 ||
      (tr.runningDays as number) > 127
    ) {
      throw new Error('Each train must have number, name, and integer runningDays (1..127).');
    }
    const number = tr.number.trim();
    trainNumbers.add(number);
    trains.push({
      number,
      name: tr.name.trim(),
      runningDays: tr.runningDays as number,
    });
  }

  const trainStops: TrainStop[] = [];
  for (const st of raw.trainStops) {
    if (
      !isObject(st) ||
      !isNonEmptyString(st.trainNumber) ||
      !isNonEmptyString(st.stationCode) ||
      !Number.isInteger(st.sequence) ||
      (st.sequence as number) < 1
    ) {
      throw new Error('Each trainStop must have trainNumber, stationCode, and sequence >= 1.');
    }
    const trainNumber = st.trainNumber.trim();
    const stationCode = st.stationCode.trim().toUpperCase();
    if (!trainNumbers.has(trainNumber)) {
      throw new Error(`trainStop references unknown trainNumber "${trainNumber}".`);
    }
    if (!stationCodes.has(stationCode)) {
      throw new Error(`trainStop references unknown stationCode "${stationCode}".`);
    }

    const arrivalMinutes =
      st.arrivalMinutes === null || st.arrivalMinutes === undefined
        ? null
        : Number(st.arrivalMinutes);
    const departureMinutes =
      st.departureMinutes === null || st.departureMinutes === undefined
        ? null
        : Number(st.departureMinutes);

    if (
      arrivalMinutes !== null &&
      (!Number.isInteger(arrivalMinutes) || arrivalMinutes < 0 || arrivalMinutes >= 1440)
    ) {
      throw new Error(`Invalid arrivalMinutes (${st.arrivalMinutes}) for ${trainNumber}/${stationCode}.`);
    }
    if (
      departureMinutes !== null &&
      (!Number.isInteger(departureMinutes) || departureMinutes < 0 || departureMinutes >= 1440)
    ) {
      throw new Error(
        `Invalid departureMinutes (${st.departureMinutes}) for ${trainNumber}/${stationCode}.`
      );
    }

    const dayOffset = st.dayOffset === undefined ? 0 : Number(st.dayOffset);
    if (!Number.isInteger(dayOffset) || dayOffset < 0) {
      throw new Error(`Invalid dayOffset (${st.dayOffset}) for ${trainNumber}/${stationCode}.`);
    }

    trainStops.push({
      trainNumber,
      stationCode,
      sequence: st.sequence as number,
      arrivalMinutes,
      departureMinutes,
      dayOffset,
    });
  }

  const stationTransfers: StationTransfer[] = [];
  if (raw.stationTransfers !== undefined) {
    if (!Array.isArray(raw.stationTransfers)) {
      throw new Error('"stationTransfers" must be an array.');
    }
    for (const tr of raw.stationTransfers) {
      if (
        !isObject(tr) ||
        !isNonEmptyString(tr.fromStationCode) ||
        !isNonEmptyString(tr.toStationCode) ||
        !Number.isInteger(tr.typicalMinutes) ||
        (tr.typicalMinutes as number) < 0
      ) {
        throw new Error(
          'Each stationTransfer must have fromStationCode, toStationCode, and typicalMinutes >= 0.'
        );
      }
      const fromCode = tr.fromStationCode.trim().toUpperCase();
      const toCode = tr.toStationCode.trim().toUpperCase();
      if (!stationCodes.has(fromCode) || !stationCodes.has(toCode)) {
        throw new Error(`stationTransfer references unknown station (${fromCode} -> ${toCode}).`);
      }
      stationTransfers.push({
        fromStationCode: fromCode,
        toStationCode: toCode,
        typicalMinutes: tr.typicalMinutes as number,
        modeNote: isNonEmptyString(tr.modeNote) ? tr.modeNote.trim() : '',
        source: isNonEmptyString(tr.source) ? tr.source.trim() : 'imported',
        lastVerified: isNonEmptyString(tr.lastVerified) ? tr.lastVerified.trim() : 'unknown',
      });
    }
  }

  const meta = isObject(raw.meta)
    ? {
        dataVersion: isNonEmptyString(raw.meta.dataVersion) ? raw.meta.dataVersion.trim() : undefined,
        lastUpdated: isNonEmptyString(raw.meta.lastUpdated) ? raw.meta.lastUpdated.trim() : undefined,
      }
    : undefined;

  return {
    meta,
    cityClusters,
    stations,
    trains,
    trainStops,
    stationTransfers,
  };
}

export function importTimetableIntoDb(
  db: SQLiteDatabaseLike,
  payload: TimetablePayload,
  options?: { version?: string; date?: string; kind?: DatasetKind }
): ImportResult {
  const datasetKind: DatasetKind = options?.kind ?? 'IMPORTED';
  const dataVersion =
    options?.version ?? payload.meta?.dataVersion ?? new Date().toISOString().slice(0, 10);
  const lastUpdated =
    options?.date ?? payload.meta?.lastUpdated ?? new Date().toISOString().slice(0, 10);

  const clusters = payload.cityClusters ?? [];
  const transfers = payload.stationTransfers ?? [];

  db.execSync('BEGIN TRANSACTION;');
  try {
    db.execSync(`
      DELETE FROM TrainStop;
      DELETE FROM StationTransfer;
      DELETE FROM Train;
      DELETE FROM Station;
      DELETE FROM CityCluster;
    `);

    for (const cluster of clusters) {
      db.runSync('INSERT INTO CityCluster (id, name) VALUES (?, ?);', cluster.id, cluster.name);
    }

    for (const station of payload.stations) {
      db.runSync(
        'INSERT INTO Station (code, name, city, lat, lng, cityClusterId) VALUES (?, ?, ?, ?, ?, ?);',
        station.code,
        station.name,
        station.city,
        station.lat,
        station.lng,
        station.cityClusterId
      );
    }

    for (const train of payload.trains) {
      db.runSync(
        'INSERT INTO Train (number, name, runningDays) VALUES (?, ?, ?);',
        train.number,
        train.name,
        train.runningDays
      );
    }

    for (const stop of payload.trainStops) {
      db.runSync(
        'INSERT INTO TrainStop (trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset) VALUES (?, ?, ?, ?, ?, ?);',
        stop.trainNumber,
        stop.stationCode,
        stop.sequence,
        stop.arrivalMinutes,
        stop.departureMinutes,
        stop.dayOffset
      );
    }

    for (const transfer of transfers) {
      db.runSync(
        'INSERT INTO StationTransfer (fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified) VALUES (?, ?, ?, ?, ?, ?);',
        transfer.fromStationCode,
        transfer.toStationCode,
        transfer.typicalMinutes,
        transfer.modeNote,
        transfer.source,
        transfer.lastVerified
      );
    }

    db.runSync(
      'INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);',
      'datasetKind',
      datasetKind
    );
    db.runSync(
      'INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);',
      'dataVersion',
      dataVersion
    );
    db.runSync(
      'INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);',
      'lastUpdated',
      lastUpdated
    );

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }

  return {
    stations: payload.stations.length,
    trains: payload.trains.length,
    stops: payload.trainStops.length,
    clusters: clusters.length,
    transfers: transfers.length,
    dataVersion,
    lastUpdated,
  };
}

export function resetToBuiltInDataset(db: SQLiteDatabaseLike): ImportResult {
  return importTimetableIntoDb(
    db,
    {
      meta: {
        dataVersion: SAMPLE_DATASET_META.dataVersion,
        lastUpdated: SAMPLE_DATASET_META.lastUpdated,
      },
      cityClusters: SAMPLE_CITY_CLUSTERS,
      stations: SAMPLE_STATIONS,
      trains: SAMPLE_TRAINS,
      trainStops: SAMPLE_TRAIN_STOPS,
      stationTransfers: SAMPLE_STATION_TRANSFERS,
    },
    {
      kind: SAMPLE_DATASET_META.datasetKind,
      version: SAMPLE_DATASET_META.dataVersion,
      date: SAMPLE_DATASET_META.lastUpdated,
    }
  );
}
