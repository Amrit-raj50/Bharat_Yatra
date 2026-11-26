#!/usr/bin/env node
/**
 * Bulk-imports full Indian Railways open datasets (DataMeet format:
 * stations.json, trains.json, schedules.json) into ConnectGuard's SQLite DB
 * and optionally exports a ConnectGuard JSON file.
 *
 * Usage:
 *   node backend/ingest/import-datameet.mjs \
 *     --stations path/to/stations.json \
 *     --trains path/to/trains.json \
 *     --schedules path/to/schedules.json \
 *     --out-db backend/data/connectguard.db \
 *     --version 2026.11-IN-FULL
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importPayloadIntoBackendDb, openBackendDb } from '../db/schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_CLUSTERS = [
  { id: 'DELHI_NCR', name: 'Delhi NCR' },
  { id: 'MUMBAI_MMR', name: 'Mumbai MMR' },
  { id: 'KOLKATA', name: 'Kolkata' },
  { id: 'CHENNAI', name: 'Chennai' },
  { id: 'BENGALURU', name: 'Bengaluru' },
  { id: 'HYDERABAD', name: 'Hyderabad' },
];

const STATION_CLUSTER_MAP = new Map([
  ['NDLS', 'DELHI_NCR'], ['NZM', 'DELHI_NCR'], ['ANVT', 'DELHI_NCR'], ['DLI', 'DELHI_NCR'], ['DEE', 'DELHI_NCR'],
  ['CSMT', 'MUMBAI_MMR'], ['CSTM', 'MUMBAI_MMR'], ['LTT', 'MUMBAI_MMR'], ['MMCT', 'MUMBAI_MMR'], ['BCT', 'MUMBAI_MMR'], ['BDTS', 'MUMBAI_MMR'], ['DR', 'MUMBAI_MMR'],
  ['HWH', 'KOLKATA'], ['SDAH', 'KOLKATA'], ['KOAA', 'KOLKATA'], ['SHM', 'KOLKATA'],
  ['MAS', 'CHENNAI'], ['MS', 'CHENNAI'], ['TBM', 'CHENNAI'],
  ['SBC', 'BENGALURU'], ['YPR', 'BENGALURU'], ['SMVB', 'BENGALURU'], ['KJM', 'BENGALURU'],
  ['SC', 'HYDERABAD'], ['HYB', 'HYDERABAD'], ['KCG', 'HYDERABAD'],
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--') && i + 1 < argv.length) {
      args[token.slice(2)] = argv[++i];
    }
  }
  return args;
}

export function parseTimeToMinutes(raw) {
  if (!raw || raw === 'None' || raw === 'Source' || raw === 'Destination' || raw === '--') {
    return null;
  }
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(raw).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function convertDataMeetToPayload({ stationsRaw, trainsRaw, schedulesRaw, version, date }) {
  const stationFeatures = Array.isArray(stationsRaw?.features)
    ? stationsRaw.features
    : Array.isArray(stationsRaw)
      ? stationsRaw
      : [];

  const stationsByCode = new Map();
  for (const item of stationFeatures) {
    const props = item.properties ?? item;
    const coords = item.geometry?.coordinates;
    const code = String(props.code || props.station_code || '').trim().toUpperCase();
    if (!code) continue;
    const name = String(props.name || props.station_name || code).trim();
    const city = String(props.city || props.zone || name).trim();
    const lng = Number(coords?.[0] ?? props.lng ?? props.lon ?? 0);
    const lat = Number(coords?.[1] ?? props.lat ?? 0);
    stationsByCode.set(code, {
      code,
      name,
      city,
      lat: Number.isFinite(lat) ? lat : 0,
      lng: Number.isFinite(lng) ? lng : 0,
      cityClusterId: STATION_CLUSTER_MAP.get(code) ?? null,
    });
  }

  const trainFeatures = Array.isArray(trainsRaw?.features)
    ? trainsRaw.features
    : Array.isArray(trainsRaw)
      ? trainsRaw
      : [];

  const trainsByNumber = new Map();
  for (const item of trainFeatures) {
    const props = item.properties ?? item;
    const number = String(props.number || props.train_number || '').trim();
    if (!number) continue;
    const name = String(props.name || props.train_name || `Train ${number}`).trim();
    const runningDays =
      Number.isInteger(props.runningDays) && props.runningDays >= 1 && props.runningDays <= 127
        ? props.runningDays
        : 127;
    trainsByNumber.set(number, { number, name, runningDays });
  }

  const scheduleRows = Array.isArray(schedulesRaw) ? schedulesRaw : [];
  const seqByTrain = new Map();
  const trainStops = [];

  for (const row of scheduleRows) {
    const trainNumber = String(row.train_number || row.trainNumber || '').trim();
    const stationCode = String(row.station_code || row.stationCode || '').trim().toUpperCase();
    if (!trainNumber || !stationCode) continue;

    if (!trainsByNumber.has(trainNumber)) {
      trainsByNumber.set(trainNumber, {
        number: trainNumber,
        name: String(row.train_name || `Train ${trainNumber}`).trim(),
        runningDays: 127,
      });
    }
    if (!stationsByCode.has(stationCode)) {
      stationsByCode.set(stationCode, {
        code: stationCode,
        name: String(row.station_name || stationCode).trim(),
        city: String(row.station_name || stationCode).trim(),
        lat: 0,
        lng: 0,
        cityClusterId: STATION_CLUSTER_MAP.get(stationCode) ?? null,
      });
    }

    const nextSeq = (seqByTrain.get(trainNumber) ?? 0) + 1;
    seqByTrain.set(trainNumber, nextSeq);

    const arrivalMinutes = parseTimeToMinutes(row.arrival ?? row.arrivalMinutes);
    const departureMinutes = parseTimeToMinutes(row.departure ?? row.departureMinutes);
    const rawDay = Number(row.day ?? 1);
    const dayOffset = Number.isInteger(rawDay) && rawDay >= 1 ? rawDay - 1 : 0;

    trainStops.push({
      trainNumber,
      stationCode,
      sequence: nextSeq,
      arrivalMinutes,
      departureMinutes,
      dayOffset,
    });
  }

  return {
    meta: {
      dataVersion: version || '2026.11-IN-FULL',
      lastUpdated: date || new Date().toISOString().slice(0, 10),
    },
    cityClusters: DEFAULT_CLUSTERS,
    stations: [...stationsByCode.values()],
    trains: [...trainsByNumber.values()],
    trainStops,
    stationTransfers: [],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.schedules) {
    console.error(
      'Usage: node backend/ingest/import-datameet.mjs --schedules schedules.json [--stations stations.json] [--trains trains.json] [--out-db backend/data/connectguard.db] [--out-json out.json]'
    );
    process.exit(1);
  }

  const stationsRaw = args.stations ? JSON.parse(fs.readFileSync(args.stations, 'utf8')) : [];
  const trainsRaw = args.trains ? JSON.parse(fs.readFileSync(args.trains, 'utf8')) : [];
  const schedulesRaw = JSON.parse(fs.readFileSync(args.schedules, 'utf8'));

  const payload = convertDataMeetToPayload({
    stationsRaw,
    trainsRaw,
    schedulesRaw,
    version: args.version,
    date: args.date,
  });

  if (args['out-json']) {
    fs.writeFileSync(args['out-json'], JSON.stringify(payload), 'utf8');
    console.log(`Exported ConnectGuard JSON to ${args['out-json']}`);
  }

  const dbPath = path.resolve(args['out-db'] || path.join(__dirname, '../data/connectguard.db'));
  const db = openBackendDb(dbPath);
  const result = importPayloadIntoBackendDb(db, payload, { kind: 'IMPORTED' });
  console.log('Imported into backend DB:', result);
}
