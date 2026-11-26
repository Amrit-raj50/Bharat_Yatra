import type {
  CityCluster,
  ConnectionOption,
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

  getDatabaseStats(): {
    stations: number;
    trains: number;
    stops: number;
    clusters: number;
    transfers: number;
  } {
    const stations = this.db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM Station;')?.c ?? 0;
    const trains = this.db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM Train;')?.c ?? 0;
    const stops = this.db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM TrainStop;')?.c ?? 0;
    const clusters =
      this.db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM CityCluster;')?.c ?? 0;
    const transfers =
      this.db.getFirstSync<{ c: number }>('SELECT COUNT(*) AS c FROM StationTransfer;')?.c ?? 0;
    return { stations, trains, stops, clusters, transfers };
  }

  /**
   * Dynamically derives popular 1-stop route pairs from the loaded timetable
   * by finding distinct origin/destination stations connected through a hub.
   */
  getSuggestedRoutes(limit = 6): { fromCode: string; toCode: string; label: string }[] {
    const rows = this.db.getAllSync<{ fromCode: string; toCode: string }>(
      `SELECT DISTINCT
         s1.stationCode AS fromCode,
         s2.stationCode AS toCode
       FROM TrainStop s1
       JOIN TrainStop hub1
         ON hub1.trainNumber = s1.trainNumber
        AND hub1.sequence > s1.sequence
        AND hub1.arrivalMinutes IS NOT NULL
       JOIN TrainStop hub2
         ON hub2.stationCode = hub1.stationCode
        AND hub2.trainNumber != s1.trainNumber
        AND hub2.departureMinutes IS NOT NULL
       JOIN TrainStop s2
         ON s2.trainNumber = hub2.trainNumber
        AND s2.sequence > hub2.sequence
        AND s2.arrivalMinutes IS NOT NULL
       WHERE s1.departureMinutes IS NOT NULL
         AND s1.stationCode != s2.stationCode
         AND s1.stationCode != hub1.stationCode
         AND s2.stationCode != hub1.stationCode
       LIMIT ?;`,
      limit * 4
    );

    const seen = new Set<string>();
    const routes: { fromCode: string; toCode: string; label: string }[] = [];
    for (const r of rows) {
      const key = `${r.fromCode}->${r.toCode}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      routes.push({
        fromCode: r.fromCode,
        toCode: r.toCode,
        label: `${r.fromCode} → ${r.toCode}`,
      });
      if (routes.length >= limit) {
        break;
      }
    }
    return routes;
  }

  getRecentSearches(): { fromCode: string; toCode: string }[] {
    const raw = this.getPreference('recentSearches');
    if (!raw) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (item): item is { fromCode: string; toCode: string } =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).fromCode === 'string' &&
          typeof (item as Record<string, unknown>).toCode === 'string'
      );
    } catch {
      return [];
    }
  }

  addRecentSearch(fromCode: string, toCode: string, maxItems = 5): void {
    const existing = this.getRecentSearches().filter(
      (item) => !(item.fromCode === fromCode && item.toCode === toCode)
    );
    const updated = [{ fromCode, toCode }, ...existing].slice(0, maxItems);
    this.setPreference('recentSearches', JSON.stringify(updated));
  }

  getSavedConnections(): ConnectionOption[] {
    const raw = this.getPreference('saved_connections');
    if (!raw) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (item): item is ConnectionOption =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).id === 'string' &&
          typeof (item as Record<string, unknown>).leg1 === 'object' &&
          typeof (item as Record<string, unknown>).leg2 === 'object'
      );
    } catch {
      return [];
    }
  }

  setSavedConnections(items: ConnectionOption[]): void {
    this.setPreference('saved_connections', JSON.stringify(items));
  }
}
