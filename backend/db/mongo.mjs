import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadBackendEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

export function isMongoDb(db) {
  return Boolean(db && typeof db.collection === 'function');
}

export async function connectMongo(uriOverride) {
  loadBackendEnv();
  const uri = uriOverride || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  await ensureMongoIndexes(db);
  return { client, db };
}

export async function ensureMongoIndexes(db) {
  await Promise.all([
    db.collection('cityClusters').createIndex({ id: 1 }, { unique: true }),
    db.collection('stations').createIndex({ code: 1 }, { unique: true }),
    db.collection('stations').createIndex({ cityClusterId: 1 }),
    db.collection('trains').createIndex({ number: 1 }, { unique: true }),
    db.collection('trainStops').createIndex({ stationCode: 1 }),
    db.collection('trainStops').createIndex({ trainNumber: 1, sequence: 1 }, { unique: true }),
    db.collection('stationTransfers').createIndex(
      { fromStationCode: 1, toStationCode: 1 },
      { unique: true }
    ),
    db.collection('dataMetadata').createIndex({ key: 1 }, { unique: true }),
  ]);
}
