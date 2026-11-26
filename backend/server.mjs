#!/usr/bin/env node
/**
 * ConnectGuard Backend HTTP API Server Entrypoint (MVC architecture, MongoDB + SQLite fallback).
 *
 * Endpoints:
 *   GET  /health                          -> Service status, dataset metadata, DB counts
 *   GET  /api/timetable                   -> Full ConnectGuard JSON timetable for mobile app sync
 *   GET  /api/stations?q=...              -> Search stations by code, name, or city
 *   GET  /api/connections?from=&to=&date= -> Server-side 1-stop connection search
 *   POST /api/timetable/import            -> Validate & import a new JSON timetable
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackendServer } from './app.mjs';
import { connectMongo, loadBackendEnv } from './db/mongo.mjs';
import { getBackendStats, openBackendDb } from './db/schema.mjs';
import { seedBackendDatabaseIfEmpty } from './db/seedDefault.mjs';
import { getTimetableStatus } from './models/timetableModel.mjs';

export { createBackendServer };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadBackendEnv();
const PORT = Number(process.env.PORT || 4000);
const DB_PATH = path.resolve(
  process.env.CONNECTGUARD_DB || path.join(__dirname, 'data/connectguard.db')
);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let db;
  if (process.env.MONGO_URI) {
    const conn = await connectMongo(process.env.MONGO_URI);
    db = conn.db;
    const { stats } = await getTimetableStatus(db);
    const server = createBackendServer(db);
    server.listen(PORT, () => {
      console.log(
        `ConnectGuard backend (MongoDB) listening on http://localhost:${PORT} (${stats.stations} stations, ${stats.trains} trains, ${stats.stops} stops)`
      );
    });
  } else {
    db = openBackendDb(DB_PATH);
    seedBackendDatabaseIfEmpty(db);
    const server = createBackendServer(db);
    server.listen(PORT, () => {
      const stats = getBackendStats(db);
      console.log(
        `ConnectGuard backend (SQLite) listening on http://localhost:${PORT} (${stats.stations} stations, ${stats.trains} trains, ${stats.stops} stops)`
      );
    });
  }
}
