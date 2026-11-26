/**
 * Timetable Model: Metadata, stats, export, and validated import operations (SQLite & MongoDB).
 */
import { isMongoDb } from '../db/mongo.mjs';
import {
  exportTimetablePayload,
  getBackendMeta,
  getBackendStats,
  importPayloadIntoBackendDb,
} from '../db/schema.mjs';
import { importPayloadIntoMongo } from '../ingest/import-to-mongo.mjs';

export async function getTimetableStatus(db) {
  if (isMongoDb(db)) {
    const [stations, trains, stops, clusters, transfers, metaRows] = await Promise.all([
      db.collection('stations').countDocuments(),
      db.collection('trains').countDocuments(),
      db.collection('trainStops').countDocuments(),
      db.collection('cityClusters').countDocuments(),
      db.collection('stationTransfers').countDocuments(),
      db.collection('dataMetadata').find({}, { projection: { _id: 0 } }).toArray(),
    ]);
    const map = new Map(metaRows.map((r) => [r.key, r.value]));
    return {
      meta: {
        datasetKind: map.get('datasetKind') ?? 'IMPORTED',
        dataVersion: map.get('dataVersion') ?? 'unknown',
        lastUpdated: map.get('lastUpdated') ?? 'unknown',
      },
      stats: { stations, trains, stops, clusters, transfers },
    };
  }

  return {
    meta: getBackendMeta(db),
    stats: getBackendStats(db),
  };
}

export async function getFullTimetable(db) {
  if (isMongoDb(db)) {
    const [status, cityClusters, stations, trains, trainStops, stationTransfers] = await Promise.all([
      getTimetableStatus(db),
      db.collection('cityClusters').find({}, { projection: { _id: 0 } }).sort({ id: 1 }).toArray(),
      db.collection('stations').find({}, { projection: { _id: 0 } }).sort({ code: 1 }).toArray(),
      db.collection('trains').find({}, { projection: { _id: 0 } }).sort({ number: 1 }).toArray(),
      db
        .collection('trainStops')
        .find({}, { projection: { _id: 0 } })
        .sort({ trainNumber: 1, sequence: 1 })
        .toArray(),
      db
        .collection('stationTransfers')
        .find({}, { projection: { _id: 0 } })
        .sort({ fromStationCode: 1, toStationCode: 1 })
        .toArray(),
    ]);

    return {
      meta: {
        dataVersion: status.meta.dataVersion,
        lastUpdated: status.meta.lastUpdated,
      },
      cityClusters,
      stations,
      trains,
      trainStops,
      stationTransfers,
    };
  }

  return exportTimetablePayload(db);
}

export function isValidTimetablePayload(payload) {
  return Boolean(
    payload &&
      Array.isArray(payload.stations) &&
      Array.isArray(payload.trains) &&
      Array.isArray(payload.trainStops)
  );
}

export async function importTimetable(db, payload) {
  if (isMongoDb(db)) {
    return importPayloadIntoMongo(db, payload, 'IMPORTED');
  }
  return importPayloadIntoBackendDb(db, payload, { kind: 'IMPORTED' });
}
