import type {
  CityCluster,
  DatasetKind,
  DatasetMeta,
  Station,
  StationTransfer,
  TimetableRepository,
  Train,
  TrainStop,
} from '@/domain/types';
import type { SQLiteDatabaseLike } from './migrations';

export class SqliteTimetableRepository implements TimetableRepository {
  constructor(private readonly db: SQLiteDatabaseLike) {}

  searchStations(query: string, limit = 20): Station[] {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.db.getAllSync<Station>(
        'SELECT code, name, city, lat, lng, cityClusterId FROM Station ORDER BY code ASC LIMIT ?;',
        limit
      );
    }
    const pattern = `%${trimmed}%`;
    return this.db.getAllSync<Station>(
      `SELECT code, name, city, lat, lng, cityClusterId
       FROM Station
       WHERE code LIKE ? OR name LIKE ? OR city LIKE ?
       ORDER BY
         CASE WHEN UPPER(code) = UPPER(?) THEN 0
              WHEN UPPER(code) LIKE UPPER(?) THEN 1
              ELSE 2 END,
         code ASC
       LIMIT ?;`,
      pattern,
      pattern,
      pattern,
      trimmed,
      `${trimmed}%`,
      limit
    );
  }

  getStationByCode(code: string): Station | null {
    return this.db.getFirstSync<Station>(
      'SELECT code, name, city, lat, lng, cityClusterId FROM Station WHERE code = ?;',
      code.toUpperCase()
    );
  }

  getStationsInCluster(clusterId: string): Station[] {
    return this.db.getAllSync<Station>(
      'SELECT code, name, city, lat, lng, cityClusterId FROM Station WHERE cityClusterId = ? ORDER BY code ASC;',
      clusterId
    );
  }

  getCityClusterById(clusterId: string): CityCluster | null {
    return this.db.getFirstSync<CityCluster>(
      'SELECT id, name FROM CityCluster WHERE id = ?;',
      clusterId
    );
  }

  getStopsAtStation(stationCode: string): TrainStop[] {
    return this.db.getAllSync<TrainStop>(
      `SELECT id, trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset
       FROM TrainStop
       WHERE stationCode = ?;`,
      stationCode
    );
  }

  getTrainByNumber(trainNumber: string): Train | null {
    return this.db.getFirstSync<Train>(
      'SELECT number, name, runningDays FROM Train WHERE number = ?;',
      trainNumber
    );
  }

  getStopsForTrain(trainNumber: string): TrainStop[] {
    return this.db.getAllSync<TrainStop>(
      `SELECT id, trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset
       FROM TrainStop
       WHERE trainNumber = ?
       ORDER BY sequence ASC;`,
      trainNumber
    );
  }

  getTransfer(fromCode: string, toCode: string): StationTransfer | null {
    return this.db.getFirstSync<StationTransfer>(
      `SELECT fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified
       FROM StationTransfer
       WHERE fromStationCode = ? AND toStationCode = ?;`,
      fromCode,
      toCode
    );
  }

  getDatasetMeta(): DatasetMeta {
    const rows = this.db.getAllSync<{ key: string; value: string }>(
      "SELECT key, value FROM DataMetadata WHERE key IN ('datasetKind', 'dataVersion', 'lastUpdated');"
    );
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const kind = map.get('datasetKind') === 'IMPORTED' ? 'IMPORTED' : 'SAMPLE';
    return {
      datasetKind: kind as DatasetKind,
      dataVersion: map.get('dataVersion') ?? 'unknown',
      lastUpdated: map.get('lastUpdated') ?? 'unknown',
    };
  }

  getPreference(key: string): string | null {
    const row = this.db.getFirstSync<{ value: string }>(
      'SELECT value FROM DataMetadata WHERE key = ?;',
      key
    );
    return row?.value ?? null;
  }

  setPreference(key: string, value: string): void {
    this.db.runSync('INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);', key, value);
  }
}
