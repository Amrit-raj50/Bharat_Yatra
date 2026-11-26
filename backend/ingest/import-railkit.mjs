#!/usr/bin/env node
/**
 * Fetches real Indian Railways schedules and station coordinates using the
 * official `railkit` SDK and loads them into ConnectGuard's backend SQLite DB.
 *
 * Usage:
 *   $env:RAILKIT_API_KEY="railkit_..."
 *   node backend/ingest/import-railkit.mjs [--limit 80] [--hubs NDLS,CSMT,HWH,MAS,SBC,SC]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configure, getTrainInfo, liveAtStation } from 'railkit';
import { importPayloadIntoBackendDb, openBackendDb } from '../db/schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SEED_JSON = path.resolve(__dirname, '../data/default-timetable.json');
const DEFAULT_DB_PATH = path.resolve(__dirname, '../data/connectguard.db');

const DEFAULT_HUBS = [
  'NDLS', 'NZM', 'ANVT', 'CSMT', 'LTT', 'MMCT',
  'HWH', 'SDAH', 'MAS', 'SBC', 'SC', 'LKO',
  'PNBE', 'JP', 'ADI', 'BPL', 'NGP', 'PUNE',
];

const SEED_TRUNK_TRAINS = [
  '12951', '12952', '12953', '12954', '12301', '12302', '12309', '12310',
  '12313', '12314', '12423', '12424', '12419', '12420', '12229', '12230',
  '12001', '12002', '12003', '12004', '12015', '12016', '12957', '12958',
  '12621', '12622', '12625', '12626', '22691', '22692', '12723', '12724',
  '12839', '12840', '12841', '12842', '12860', '12859', '12123', '12124',
  '11301', '11302', '12009', '12010', '12261', '12262', '12433', '12434',
  '22435', '22436', '12007', '12008', '12677', '12678', '12759', '12760',
];

const STATION_CLUSTER_MAP = new Map([
  ['NDLS', 'DELHI_NCR'], ['NZM', 'DELHI_NCR'], ['ANVT', 'DELHI_NCR'], ['DLI', 'DELHI_NCR'], ['DEE', 'DELHI_NCR'],
  ['CSMT', 'MUMBAI_MMR'], ['CSTM', 'MUMBAI_MMR'], ['LTT', 'MUMBAI_MMR'], ['MMCT', 'MUMBAI_MMR'], ['BDTS', 'MUMBAI_MMR'], ['DR', 'MUMBAI_MMR'], ['BVI', 'MUMBAI_MMR'],
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

export function parseRunningDaysBits(raw) {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 127) {
    return raw;
  }
  const str = String(raw || '').trim();
  if (/^[01]{7}$/.test(str)) {
    let mask = 0;
    for (let i = 0; i < 7; i++) {
      if (str[i] === '1') {
        mask |= 1 << i;
      }
    }
    return mask > 0 ? mask : 127;
  }
  return 127;
}

export function parseRailKitTime(raw) {
  if (!raw || raw === '--' || raw === 'SRC' || raw === 'DST' || raw === 'None') {
    return null;
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(raw).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function titleCase(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

async function discoverTrainNumbers(hubs, limit) {
  const trainNos = new Set(SEED_TRUNK_TRAINS);

  for (const hub of hubs) {
    if (trainNos.size >= limit) break;
    try {
      const res = await liveAtStation(hub, 8);
      const list = res?.data?.trains ?? [];
      for (const item of list) {
        const type = String(item.trainType || '').toUpperCase();
        if (type === 'EMU' || type === 'MEMU' || type === 'DEMU' || type === 'SUBURBAN') {
          continue;
        }
        if (item.trainNo) {
          trainNos.add(String(item.trainNo).trim());
        }
        if (trainNos.size >= limit) break;
      }
    } catch (err) {
      console.warn(`liveAtStation(${hub}) skipped:`, err instanceof Error ? err.message : String(err));
    }
  }

  return [...trainNos].slice(0, limit);
}

async function run() {
  const apiKey = process.env.RAILKIT_API_KEY;
  if (!apiKey) {
    console.error('Error: RAILKIT_API_KEY environment variable is required.');
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const limit = Math.max(1, Number(args.limit || 75));
  const hubs = args.hubs
    ? args.hubs.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    : DEFAULT_HUBS;

  configure(apiKey);

  const seed = fs.existsSync(DEFAULT_SEED_JSON)
    ? JSON.parse(fs.readFileSync(DEFAULT_SEED_JSON, 'utf8'))
    : { cityClusters: [], stationTransfers: [] };

  const stationsMap = new Map();
  const trainsList = [];
  const trainStops = [];

  const trainNumbers = args.trains
    ? args.trains.split(',').map((s) => s.trim()).filter(Boolean)
    : await discoverTrainNumbers(hubs, limit);

  console.log(`Fetching schedules for ${trainNumbers.length} trains from RailKit...`);

  let successCount = 0;
  let failCount = 0;

  // Fetch in small batches of 5 to respect rate limits
  for (let i = 0; i < trainNumbers.length; i += 5) {
    const batch = trainNumbers.slice(i, i + 5);
    const settled = await Promise.allSettled(batch.map((no) => getTrainInfo(no)));

    for (let j = 0; j < settled.length; j++) {
      const outcome = settled[j];
      const trainNo = batch[j];
      if (outcome.status !== 'fulfilled' || !outcome.value?.success || !outcome.value?.data?.trainInfo) {
        failCount++;
        continue;
      }

      const { trainInfo, route } = outcome.value.data;
      if (!Array.isArray(route) || route.length < 2) {
        failCount++;
        continue;
      }

      const number = String(trainInfo.train_no || trainNo).trim();
      const name = titleCase(trainInfo.train_name || `Train ${number}`);
      const runningDays = parseRunningDaysBits(trainInfo.running_days);

      trainsList.push({ number, name, runningDays });

      for (let idx = 0; idx < route.length; idx++) {
        const stop = route[idx];
        const code = String(stop.stnCode || '').trim().toUpperCase();
        if (!code) continue;

        const stnName = titleCase(stop.stnName || code);
        const lat = Number(stop.coordinates?.latitude ?? 0);
        const lng = Number(stop.coordinates?.longitude ?? 0);

        if (!stationsMap.has(code)) {
          stationsMap.set(code, {
            code,
            name: stnName,
            city: stnName.replace(/\s+(Jn|Junction|Terminus|Terminal|Cantt|Central|City)$/i, '').trim() || stnName,
            lat: Number.isFinite(lat) ? lat : 0,
            lng: Number.isFinite(lng) ? lng : 0,
            cityClusterId: STATION_CLUSTER_MAP.get(code) ?? null,
          });
        }

        const arrivalMinutes = idx === 0 ? null : parseRailKitTime(stop.arrival);
        const departureMinutes = idx === route.length - 1 ? null : parseRailKitTime(stop.departure);
        const rawDay = Number(stop.day ?? 1);
        const dayOffset = Number.isInteger(rawDay) && rawDay >= 1 ? rawDay - 1 : 0;

        trainStops.push({
          trainNumber: number,
          stationCode: code,
          sequence: idx + 1,
          arrivalMinutes,
          departureMinutes,
          dayOffset,
        });
      }

      successCount++;
    }
  }

  if (trainsList.length === 0) {
    console.error(`No trains could be imported (${failCount} failed).`);
    process.exit(1);
  }

  const validTransfers = (seed.stationTransfers || []).filter(
    (tr) => stationsMap.has(tr.fromStationCode) && stationsMap.has(tr.toStationCode)
  );

  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    meta: {
      dataVersion: `${today.slice(0, 7).replace('-', '.')}-RAILKIT`,
      lastUpdated: today,
    },
    cityClusters: seed.cityClusters || [],
    stations: [...stationsMap.values()],
    trains: trainsList,
    trainStops,
    stationTransfers: validTransfers,
  };

  const dbPath = path.resolve(args['out-db'] || DEFAULT_DB_PATH);
  const db = openBackendDb(dbPath);
  const result = importPayloadIntoBackendDb(db, payload, { kind: 'IMPORTED' });
  db.close();

  console.log(`RailKit ingestion complete (${successCount} trains ok, ${failCount} skipped):`, result);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((err) => {
    console.error('Fatal error during RailKit ingestion:', err);
    process.exit(1);
  });
}
