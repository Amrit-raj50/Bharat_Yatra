import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBackendStats, importPayloadIntoBackendDb } from './schema.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SEED_JSON = path.resolve(__dirname, '../data/default-timetable.json');

export function seedBackendDatabaseIfEmpty(db, seedFilePath = DEFAULT_SEED_JSON) {
  const stats = getBackendStats(db);
  if (stats.stations > 0) {
    return false;
  }
  if (!fs.existsSync(seedFilePath)) {
    return false;
  }
  const raw = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
  importPayloadIntoBackendDb(db, raw, {
    kind: raw.meta?.datasetKind ?? 'SAMPLE',
    version: raw.meta?.dataVersion ?? '2026.11-IN-REF',
    date: raw.meta?.lastUpdated ?? '2026-11-25',
  });
  return true;
}
