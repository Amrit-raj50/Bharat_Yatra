import * as SQLite from 'expo-sqlite';
import { runMigrations, type SQLiteDatabaseLike } from './migrations';
import { seedSampleDatabaseIfEmpty } from './seedSample';

const DB_NAME = 'connectguard.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initialized = false;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  if (!initialized) {
    initializeDatabase(dbInstance);
    initialized = true;
  }
  return dbInstance;
}

export function initializeDatabase(db: SQLiteDatabaseLike): void {
  runMigrations(db);
  seedSampleDatabaseIfEmpty(db);
}
