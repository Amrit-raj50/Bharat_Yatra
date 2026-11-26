import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const SCHEMA_V1_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS CityCluster (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Station (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    cityClusterId TEXT REFERENCES CityCluster(id)
  );

  CREATE TABLE IF NOT EXISTS Train (
    number TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    runningDays INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS TrainStop (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainNumber TEXT NOT NULL REFERENCES Train(number) ON DELETE CASCADE,
    stationCode TEXT NOT NULL REFERENCES Station(code) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    arrivalMinutes INTEGER,
    departureMinutes INTEGER,
    dayOffset INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_train_stop_station
    ON TrainStop(stationCode);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_train_stop_train_seq
    ON TrainStop(trainNumber, sequence);

  CREATE TABLE IF NOT EXISTS StationTransfer (
    fromStationCode TEXT NOT NULL REFERENCES Station(code) ON DELETE CASCADE,
    toStationCode TEXT NOT NULL REFERENCES Station(code) ON DELETE CASCADE,
    typicalMinutes INTEGER NOT NULL,
    modeNote TEXT NOT NULL,
    source TEXT NOT NULL,
    lastVerified TEXT NOT NULL,
    PRIMARY KEY (fromStationCode, toStationCode)
  );

  CREATE TABLE IF NOT EXISTS DataMetadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

export function openBackendDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec(SCHEMA_V1_SQL);
  db.exec('PRAGMA user_version = 1;');
  return db;
}

export function getBackendStats(db) {
  const stations = db.prepare('SELECT COUNT(*) AS c FROM Station').get().c;
  const trains = db.prepare('SELECT COUNT(*) AS c FROM Train').get().c;
  const stops = db.prepare('SELECT COUNT(*) AS c FROM TrainStop').get().c;
  const clusters = db.prepare('SELECT COUNT(*) AS c FROM CityCluster').get().c;
  const transfers = db.prepare('SELECT COUNT(*) AS c FROM StationTransfer').get().c;
  return { stations, trains, stops, clusters, transfers };
}

export function getBackendMeta(db) {
  const rows = db
    .prepare("SELECT key, value FROM DataMetadata WHERE key IN ('datasetKind', 'dataVersion', 'lastUpdated')")
    .all();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    datasetKind: map.get('datasetKind') ?? 'SAMPLE',
    dataVersion: map.get('dataVersion') ?? 'unknown',
    lastUpdated: map.get('lastUpdated') ?? 'unknown',
  };
}

export function importPayloadIntoBackendDb(db, payload, options = {}) {
  const datasetKind = options.kind ?? 'IMPORTED';
  const dataVersion =
    options.version ?? payload.meta?.dataVersion ?? new Date().toISOString().slice(0, 10);
  const lastUpdated =
    options.date ?? payload.meta?.lastUpdated ?? new Date().toISOString().slice(0, 10);

  const clusters = payload.cityClusters ?? [];
  const transfers = payload.stationTransfers ?? [];

  db.exec('BEGIN TRANSACTION;');
  try {
    db.exec(`
      DELETE FROM TrainStop;
      DELETE FROM StationTransfer;
      DELETE FROM Train;
      DELETE FROM Station;
      DELETE FROM CityCluster;
    `);

    const insertCluster = db.prepare('INSERT INTO CityCluster (id, name) VALUES (?, ?)');
    for (const c of clusters) {
      insertCluster.run(c.id, c.name);
    }

    const insertStation = db.prepare(
      'INSERT INTO Station (code, name, city, lat, lng, cityClusterId) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const s of payload.stations) {
      insertStation.run(s.code, s.name, s.city, s.lat, s.lng, s.cityClusterId ?? null);
    }

    const insertTrain = db.prepare('INSERT INTO Train (number, name, runningDays) VALUES (?, ?, ?)');
    for (const t of payload.trains) {
      insertTrain.run(t.number, t.name, t.runningDays);
    }

    const insertStop = db.prepare(
      'INSERT INTO TrainStop (trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const st of payload.trainStops) {
      insertStop.run(
        st.trainNumber,
        st.stationCode,
        st.sequence,
        st.arrivalMinutes ?? null,
        st.departureMinutes ?? null,
        st.dayOffset ?? 0
      );
    }

    const insertTransfer = db.prepare(
      'INSERT INTO StationTransfer (fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const tr of transfers) {
      insertTransfer.run(
        tr.fromStationCode,
        tr.toStationCode,
        tr.typicalMinutes,
        tr.modeNote ?? '',
        tr.source ?? 'imported',
        tr.lastVerified ?? lastUpdated
      );
    }

    const upsertMeta = db.prepare('INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?)');
    upsertMeta.run('datasetKind', datasetKind);
    upsertMeta.run('dataVersion', dataVersion);
    upsertMeta.run('lastUpdated', lastUpdated);

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  return {
    stations: payload.stations.length,
    trains: payload.trains.length,
    stops: payload.trainStops.length,
    clusters: clusters.length,
    transfers: transfers.length,
    datasetKind,
    dataVersion,
    lastUpdated,
  };
}

export function exportTimetablePayload(db) {
  const meta = getBackendMeta(db);
  const cityClusters = db.prepare('SELECT id, name FROM CityCluster ORDER BY id ASC').all();
  const stations = db
    .prepare('SELECT code, name, city, lat, lng, cityClusterId FROM Station ORDER BY code ASC')
    .all();
  const trains = db
    .prepare('SELECT number, name, runningDays FROM Train ORDER BY number ASC')
    .all();
  const trainStops = db
    .prepare(
      'SELECT trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset FROM TrainStop ORDER BY trainNumber ASC, sequence ASC'
    )
    .all();
  const stationTransfers = db
    .prepare(
      'SELECT fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified FROM StationTransfer ORDER BY fromStationCode ASC, toStationCode ASC'
    )
    .all();

  return {
    meta,
    cityClusters,
    stations,
    trains,
    trainStops,
    stationTransfers,
  };
}
