import type * as SQLiteType from 'expo-sqlite';
import { runMigrations, type SQLiteDatabaseLike } from './migrations';
import { seedSampleDatabaseIfEmpty } from './seedSample';

const DB_NAME = 'connectguard.db';

let dbInstance: SQLiteType.SQLiteDatabase | null = null;
let initialized = false;
let sqliteUnavailable = false;

export function getDatabase(): SQLiteType.SQLiteDatabase {
  if (sqliteUnavailable) {
    throw new Error('ExpoSQLite unavailable in this runtime');
  }
  if (!dbInstance) {
    try {
      // Check optional native module first so requireNativeModule never throws into LogBox
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { requireOptionalNativeModule } = require('expo-modules-core') as {
        requireOptionalNativeModule?: (name: string) => unknown;
      };
      if (requireOptionalNativeModule && !requireOptionalNativeModule('ExpoSQLite')) {
        sqliteUnavailable = true;
        throw new Error('ExpoSQLite unavailable in this runtime');
      }
    } catch (err) {
      if (sqliteUnavailable) {
        throw err;
      }
    }
    // Lazy-require so missing native ExpoSQLite doesn't crash route module loading
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require('expo-sqlite') as typeof SQLiteType;
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
