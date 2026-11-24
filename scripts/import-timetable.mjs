#!/usr/bin/env node
/**
 * Imports a timetable dataset (JSON or CSV directory) into a ConnectGuard SQLite database.
 * Uses Node.js built-in `node:sqlite` (Node >= 22.5 / 24).
 *
 * Usage:
 *   node scripts/import-timetable.mjs --json path/to/timetable.json --out connectguard.db
 *   node scripts/import-timetable.mjs --csv-dir path/to/csv --out connectguard.db --version 2026.11 --date 2026-11-24
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA_V1_SQL = `
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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--json' || token === '--csv-dir' || token === '--out' || token === '--version' || token === '--date') {
      args[token.slice(2)] = argv[++i];
    } else if (token === '--sample') {
      args.sample = true;
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    }
  }
  return args;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

function readCsvFile(filePath, required = true) {
  if (!fs.existsSync(filePath)) {
    if (required) {
      throw new Error(`Missing required CSV file: ${filePath}`);
    }
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    return row;
  });
}

function toNullableInt(val) {
  if (val === null || val === undefined || val === '') {
    return null;
  }
  const num = Number(val);
  if (!Number.isInteger(num)) {
    throw new Error(`Expected integer or empty value, got: ${val}`);
  }
  return num;
}

function loadFromCsvDir(dirPath) {
  const cityClusters = readCsvFile(path.join(dirPath, 'city_clusters.csv'), false).map((r) => ({
    id: r.id,
    name: r.name,
  }));

  const stations = readCsvFile(path.join(dirPath, 'stations.csv'), true).map((r) => ({
    code: String(r.code).toUpperCase(),
    name: r.name,
    city: r.city,
    lat: Number(r.lat),
    lng: Number(r.lng),
    cityClusterId: r.cityClusterId ? String(r.cityClusterId) : null,
  }));

  const trains = readCsvFile(path.join(dirPath, 'trains.csv'), true).map((r) => ({
    number: String(r.number),
    name: r.name,
    runningDays: Number(r.runningDays),
  }));

  const trainStops = readCsvFile(path.join(dirPath, 'train_stops.csv'), true).map((r) => ({
    trainNumber: String(r.trainNumber),
    stationCode: String(r.stationCode).toUpperCase(),
    sequence: Number(r.sequence),
    arrivalMinutes: toNullableInt(r.arrivalMinutes),
    departureMinutes: toNullableInt(r.departureMinutes),
    dayOffset: Number(r.dayOffset || 0),
  }));

  const stationTransfers = readCsvFile(path.join(dirPath, 'station_transfers.csv'), false).map((r) => ({
    fromStationCode: String(r.fromStationCode).toUpperCase(),
    toStationCode: String(r.toStationCode).toUpperCase(),
    typicalMinutes: Number(r.typicalMinutes),
    modeNote: r.modeNote,
    source: r.source || 'manual',
    lastVerified: r.lastVerified || '',
  }));

  return { cityClusters, stations, trains, trainStops, stationTransfers };
}

function loadFromJson(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return {
    meta: raw.meta ?? {},
    cityClusters: raw.cityClusters ?? [],
    stations: (raw.stations ?? []).map((s) => ({
      ...s,
      code: String(s.code).toUpperCase(),
      cityClusterId: s.cityClusterId ?? null,
    })),
    trains: raw.trains ?? [],
    trainStops: (raw.trainStops ?? []).map((st) => ({
      ...st,
      stationCode: String(st.stationCode).toUpperCase(),
      arrivalMinutes: st.arrivalMinutes ?? null,
      departureMinutes: st.departureMinutes ?? null,
      dayOffset: st.dayOffset ?? 0,
    })),
    stationTransfers: (raw.stationTransfers ?? []).map((tr) => ({
      ...tr,
      fromStationCode: String(tr.fromStationCode).toUpperCase(),
      toStationCode: String(tr.toStationCode).toUpperCase(),
    })),
  };
}

function validateDataset(data) {
  if (!Array.isArray(data.stations) || data.stations.length === 0) {
    throw new Error('Dataset must contain at least one station.');
  }
  if (!Array.isArray(data.trains) || data.trains.length === 0) {
    throw new Error('Dataset must contain at least one train.');
  }
  if (!Array.isArray(data.trainStops) || data.trainStops.length === 0) {
    throw new Error('Dataset must contain at least one train stop.');
  }
  for (const train of data.trains) {
    if (!Number.isInteger(train.runningDays) || train.runningDays < 1 || train.runningDays > 127) {
      throw new Error(`Invalid runningDays bitmask (${train.runningDays}) on train ${train.number}. Expected 1..127.`);
    }
  }
}

function writeSqliteDatabase(outPath, data, meta) {
  if (fs.existsSync(outPath)) {
    fs.unlinkSync(outPath);
  }
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });

  const db = new DatabaseSync(outPath);
  try {
    db.exec(SCHEMA_V1_SQL);
    db.exec('PRAGMA user_version = 1;');
    db.exec('BEGIN TRANSACTION;');

    const insertCluster = db.prepare('INSERT INTO CityCluster (id, name) VALUES (?, ?);');
    for (const c of data.cityClusters) {
      insertCluster.run(c.id, c.name);
    }

    const insertStation = db.prepare(
      'INSERT INTO Station (code, name, city, lat, lng, cityClusterId) VALUES (?, ?, ?, ?, ?, ?);'
    );
    for (const s of data.stations) {
      insertStation.run(s.code, s.name, s.city, s.lat, s.lng, s.cityClusterId);
    }

    const insertTrain = db.prepare('INSERT INTO Train (number, name, runningDays) VALUES (?, ?, ?);');
    for (const t of data.trains) {
      insertTrain.run(t.number, t.name, t.runningDays);
    }

    const insertStop = db.prepare(
      'INSERT INTO TrainStop (trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset) VALUES (?, ?, ?, ?, ?, ?);'
    );
    for (const st of data.trainStops) {
      insertStop.run(
        st.trainNumber,
        st.stationCode,
        st.sequence,
        st.arrivalMinutes,
        st.departureMinutes,
        st.dayOffset
      );
    }

    const insertTransfer = db.prepare(
      'INSERT INTO StationTransfer (fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified) VALUES (?, ?, ?, ?, ?, ?);'
    );
    for (const tr of data.stationTransfers) {
      insertTransfer.run(
        tr.fromStationCode,
        tr.toStationCode,
        tr.typicalMinutes,
        tr.modeNote,
        tr.source,
        tr.lastVerified
      );
    }

    const insertMeta = db.prepare('INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);');
    insertMeta.run('datasetKind', meta.datasetKind);
    insertMeta.run('dataVersion', meta.dataVersion);
    insertMeta.run('lastUpdated', meta.lastUpdated);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  } finally {
    db.close();
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || (!args.json && !args['csv-dir'])) {
    console.log(
      'Usage:\n' +
        '  node scripts/import-timetable.mjs --json <timetable.json> [--out connectguard.db] [--version <ver>] [--date <YYYY-MM-DD>]\n' +
        '  node scripts/import-timetable.mjs --csv-dir <dir> [--out connectguard.db] [--version <ver>] [--date <YYYY-MM-DD>]'
    );
    process.exit(args.help ? 0 : 1);
  }

  const data = args.json ? loadFromJson(args.json) : loadFromCsvDir(args['csv-dir']);
  validateDataset(data);

  const outPath = args.out ?? 'connectguard.db';
  const today = new Date().toISOString().slice(0, 10);
  const meta = {
    datasetKind: args.sample ? 'SAMPLE' : 'IMPORTED',
    dataVersion: args.version ?? data.meta?.dataVersion ?? '1.0.0',
    lastUpdated: args.date ?? data.meta?.lastUpdated ?? today,
  };

  writeSqliteDatabase(outPath, data, meta);
  console.log(
    `Imported ${data.stations.length} stations, ${data.trains.length} trains, ${data.trainStops.length} stops, ${data.stationTransfers.length} transfers -> ${outPath} (${meta.datasetKind}, v${meta.dataVersion}, ${meta.lastUpdated})`
  );
}

main();
