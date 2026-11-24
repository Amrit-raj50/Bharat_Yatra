export interface SQLiteRunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SQLiteDatabaseLike {
  execSync(source: string): void;
  runSync(source: string, ...params: (string | number | null)[]): SQLiteRunResult;
  getFirstSync<T>(source: string, ...params: (string | number | null)[]): T | null;
  getAllSync<T>(source: string, ...params: (string | number | null)[]): T[];
}

export const LATEST_SCHEMA_VERSION = 1;

export const SCHEMA_V1_SQL = `
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

export function runMigrations(db: SQLiteDatabaseLike): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 1) {
    db.execSync(SCHEMA_V1_SQL);
    db.execSync(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION};`);
  }
}
