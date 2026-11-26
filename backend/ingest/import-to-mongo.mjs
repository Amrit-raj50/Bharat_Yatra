#!/usr/bin/env node
/**
 * Imports the ConnectGuard SQLite dataset (or default timetable) into MongoDB.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectMongo } from '../db/mongo.mjs';
import { exportTimetablePayload, openBackendDb } from '../db/schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.resolve(__dirname, '../data/connectguard.db');

async function insertInBatches(collection, docs, batchSize = 10000) {
  if (!docs || docs.length === 0) {
    return;
  }
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    await collection.insertMany(batch, { ordered: false });
  }
}

export async function importPayloadIntoMongo(db, payload, kind = 'IMPORTED') {
  const dataVersion = payload.meta?.dataVersion ?? new Date().toISOString().slice(0, 10);
  const lastUpdated = payload.meta?.lastUpdated ?? new Date().toISOString().slice(0, 10);

  const clusters = payload.cityClusters ?? [];
  const transfers = payload.stationTransfers ?? [];

  await Promise.all([
    db.collection('trainStops').deleteMany({}),
    db.collection('stationTransfers').deleteMany({}),
    db.collection('trains').deleteMany({}),
    db.collection('stations').deleteMany({}),
    db.collection('cityClusters').deleteMany({}),
  ]);

  await insertInBatches(db.collection('cityClusters'), clusters);
  await insertInBatches(db.collection('stations'), payload.stations);
  await insertInBatches(db.collection('trains'), payload.trains);
  await insertInBatches(db.collection('trainStops'), payload.trainStops, 10000);
  await insertInBatches(db.collection('stationTransfers'), transfers);

  const metaDocs = [
    { key: 'datasetKind', value: kind },
    { key: 'dataVersion', value: dataVersion },
    { key: 'lastUpdated', value: lastUpdated },
  ];
  for (const m of metaDocs) {
    await db
      .collection('dataMetadata')
      .updateOne({ key: m.key }, { $set: m }, { upsert: true });
  }

  return {
    stations: payload.stations.length,
    trains: payload.trains.length,
    stops: payload.trainStops.length,
    clusters: clusters.length,
    transfers: transfers.length,
    datasetKind: kind,
    dataVersion,
    lastUpdated,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dbPath = path.resolve(process.env.CONNECTGUARD_DB || DEFAULT_DB_PATH);
  const sqliteDb = openBackendDb(dbPath);
  const payload = exportTimetablePayload(sqliteDb);
  sqliteDb.close();

  const { client, db } = await connectMongo();
  try {
    console.log(
      `Uploading ${payload.stations.length} stations, ${payload.trains.length} trains, ${payload.trainStops.length} stops to MongoDB...`
    );
    const result = await importPayloadIntoMongo(db, payload, payload.meta?.datasetKind || 'IMPORTED');
    console.log('Uploaded to MongoDB:', result);
  } finally {
    await client.close();
  }
}
