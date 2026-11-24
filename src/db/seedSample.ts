import type {
  CityCluster,
  DatasetMeta,
  Station,
  StationTransfer,
  Train,
  TrainStop,
} from '@/domain/types';
import { WEEKDAY_BITS } from '@/domain/time';
import type { SQLiteDatabaseLike } from './migrations';

const DAILY =
  WEEKDAY_BITS.MON |
  WEEKDAY_BITS.TUE |
  WEEKDAY_BITS.WED |
  WEEKDAY_BITS.THU |
  WEEKDAY_BITS.FRI |
  WEEKDAY_BITS.SAT |
  WEEKDAY_BITS.SUN;

const MON_WED_FRI = WEEKDAY_BITS.MON | WEEKDAY_BITS.WED | WEEKDAY_BITS.FRI;
const TUE_THU_SAT = WEEKDAY_BITS.TUE | WEEKDAY_BITS.THU | WEEKDAY_BITS.SAT;

/**
 * SAMPLE DATASET ONLY.
 * All train numbers, schedules, and transfer durations below are fictional
 * placeholders marked SAMPLE so UI flows and tests can run offline.
 * Replace with a verified timetable dataset via scripts/import-timetable.mjs.
 */
export const SAMPLE_DATASET_META: DatasetMeta = {
  datasetKind: 'SAMPLE',
  dataVersion: '0.1.0-SAMPLE',
  lastUpdated: '2026-11-24',
};

export const SAMPLE_CITY_CLUSTERS: CityCluster[] = [
  { id: 'DELHI_NCR', name: 'Delhi NCR' },
  { id: 'MUMBAI_MMR', name: 'Mumbai MMR' },
];

export const SAMPLE_STATIONS: Station[] = [
  { code: 'LKO', name: 'Lucknow Charbagh (SAMPLE)', city: 'Lucknow', lat: 26.8318, lng: 80.9191, cityClusterId: null },
  { code: 'CNB', name: 'Kanpur Central (SAMPLE)', city: 'Kanpur', lat: 26.4539, lng: 80.3511, cityClusterId: null },
  { code: 'NDLS', name: 'New Delhi (SAMPLE)', city: 'Delhi', lat: 28.6419, lng: 77.2194, cityClusterId: 'DELHI_NCR' },
  { code: 'NZM', name: 'Hazrat Nizamuddin (SAMPLE)', city: 'Delhi', lat: 28.5889, lng: 77.2535, cityClusterId: 'DELHI_NCR' },
  { code: 'ANVT', name: 'Anand Vihar Terminal (SAMPLE)', city: 'Delhi', lat: 28.6486, lng: 77.3156, cityClusterId: 'DELHI_NCR' },
  { code: 'DLI', name: 'Old Delhi Junction (SAMPLE)', city: 'Delhi', lat: 28.6619, lng: 77.2274, cityClusterId: 'DELHI_NCR' },
  { code: 'JP', name: 'Jaipur Junction (SAMPLE)', city: 'Jaipur', lat: 26.9196, lng: 75.7878, cityClusterId: null },
  { code: 'ADI', name: 'Ahmedabad Junction (SAMPLE)', city: 'Ahmedabad', lat: 23.0265, lng: 72.6008, cityClusterId: null },
  { code: 'AGC', name: 'Agra Cantt (SAMPLE)', city: 'Agra', lat: 27.1583, lng: 77.9897, cityClusterId: null },
  { code: 'BPL', name: 'Bhopal Junction (SAMPLE)', city: 'Bhopal', lat: 23.2683, lng: 77.4131, cityClusterId: null },
  { code: 'CSMT', name: 'Mumbai CSMT (SAMPLE)', city: 'Mumbai', lat: 18.9398, lng: 72.8355, cityClusterId: 'MUMBAI_MMR' },
  { code: 'LTT', name: 'Lokmanya Tilak Terminus (SAMPLE)', city: 'Mumbai', lat: 19.0689, lng: 72.8919, cityClusterId: 'MUMBAI_MMR' },
  { code: 'PUNE', name: 'Pune Junction (SAMPLE)', city: 'Pune', lat: 18.5289, lng: 73.8744, cityClusterId: null },
  { code: 'PNBE', name: 'Patna Junction (SAMPLE)', city: 'Patna', lat: 25.6031, lng: 85.1376, cityClusterId: null },
];

export const SAMPLE_TRAINS: Train[] = [
  { number: '90101', name: 'SAMPLE Gomti-Delhi Morning', runningDays: DAILY },
  { number: '90102', name: 'SAMPLE Delhi-Jaipur Fast', runningDays: DAILY },
  { number: '90103', name: 'SAMPLE Nizamuddin-Jaipur Link', runningDays: DAILY },
  { number: '90104', name: 'SAMPLE Anand Vihar-Jaipur Special', runningDays: MON_WED_FRI },
  { number: '90105', name: 'SAMPLE Lucknow-Old Delhi Overnight', runningDays: DAILY },
  { number: '90106', name: 'SAMPLE Delhi-Mumbai Overnight', runningDays: DAILY },
  { number: '90107', name: 'SAMPLE Mumbai LTT-Pune Intercity', runningDays: DAILY },
  { number: '90108', name: 'SAMPLE Patna-Delhi Mail', runningDays: TUE_THU_SAT },
  { number: '90109', name: 'SAMPLE Bhopal-Delhi Express', runningDays: DAILY },
  { number: '90110', name: 'SAMPLE Delhi-Ahmedabad Overnight', runningDays: DAILY },
];

export const SAMPLE_TRAIN_STOPS: TrainStop[] = [
  // 90101: LKO (06:00) -> CNB (07:30/07:35) -> NDLS (13:30)
  { trainNumber: '90101', stationCode: 'LKO', sequence: 1, arrivalMinutes: null, departureMinutes: 6 * 60, dayOffset: 0 },
  { trainNumber: '90101', stationCode: 'CNB', sequence: 2, arrivalMinutes: 7 * 60 + 30, departureMinutes: 7 * 60 + 35, dayOffset: 0 },
  { trainNumber: '90101', stationCode: 'NDLS', sequence: 3, arrivalMinutes: 13 * 60 + 30, departureMinutes: null, dayOffset: 0 },

  // 90102: NDLS (14:10) -> JP (19:00) [Tight same-station 40m layover from 90101]
  { trainNumber: '90102', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: 14 * 60 + 10, dayOffset: 0 },
  { trainNumber: '90102', stationCode: 'JP', sequence: 2, arrivalMinutes: 19 * 60, departureMinutes: null, dayOffset: 0 },

  // 90103: NZM (16:30) -> JP (21:15) [Different station NDLS->NZM: 180m layover - 45m = 135m Comfortable]
  { trainNumber: '90103', stationCode: 'NZM', sequence: 1, arrivalMinutes: null, departureMinutes: 16 * 60 + 30, dayOffset: 0 },
  { trainNumber: '90103', stationCode: 'JP', sequence: 2, arrivalMinutes: 21 * 60 + 15, departureMinutes: null, dayOffset: 0 },

  // 90104: ANVT (15:30) -> JP (20:45) [Different station NDLS->ANVT: 120m layover - 55m = 65m OK; Mon/Wed/Fri]
  { trainNumber: '90104', stationCode: 'ANVT', sequence: 1, arrivalMinutes: null, departureMinutes: 15 * 60 + 30, dayOffset: 0 },
  { trainNumber: '90104', stationCode: 'JP', sequence: 2, arrivalMinutes: 20 * 60 + 45, departureMinutes: null, dayOffset: 0 },

  // 90105: LKO (22:00 day 0) -> CNB (23:30/23:40 day 0) -> DLI (07:00 day 1)
  // Connects at DLI -> ANVT (unknown transfer time if boarding 90104 at 15:30) or DLI -> NDLS -> ADI
  { trainNumber: '90105', stationCode: 'LKO', sequence: 1, arrivalMinutes: null, departureMinutes: 22 * 60, dayOffset: 0 },
  { trainNumber: '90105', stationCode: 'CNB', sequence: 2, arrivalMinutes: 23 * 60 + 30, departureMinutes: 23 * 60 + 40, dayOffset: 0 },
  { trainNumber: '90105', stationCode: 'DLI', sequence: 3, arrivalMinutes: 7 * 60, departureMinutes: null, dayOffset: 1 },

  // 90106: NDLS (17:00 day 0) -> AGC (19:30/19:35 day 0) -> BPL (02:00/02:10 day 1) -> CSMT (11:30 day 1)
  { trainNumber: '90106', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: 17 * 60, dayOffset: 0 },
  { trainNumber: '90106', stationCode: 'AGC', sequence: 2, arrivalMinutes: 19 * 60 + 30, departureMinutes: 19 * 60 + 35, dayOffset: 0 },
  { trainNumber: '90106', stationCode: 'BPL', sequence: 3, arrivalMinutes: 2 * 60, departureMinutes: 2 * 60 + 10, dayOffset: 1 },
  { trainNumber: '90106', stationCode: 'CSMT', sequence: 4, arrivalMinutes: 11 * 60 + 30, departureMinutes: null, dayOffset: 1 },

  // 90107: LTT (14:00) -> PUNE (17:30) [Mumbai cluster transfer CSMT->LTT: 150m layover - 55m = 95m OK]
  { trainNumber: '90107', stationCode: 'LTT', sequence: 1, arrivalMinutes: null, departureMinutes: 14 * 60, dayOffset: 0 },
  { trainNumber: '90107', stationCode: 'PUNE', sequence: 2, arrivalMinutes: 17 * 60 + 30, departureMinutes: null, dayOffset: 0 },

  // 90108: PNBE (20:00 day 0) -> CNB (04:30/04:40 day 1) -> NDLS (11:15 day 1)
  { trainNumber: '90108', stationCode: 'PNBE', sequence: 1, arrivalMinutes: null, departureMinutes: 20 * 60, dayOffset: 0 },
  { trainNumber: '90108', stationCode: 'CNB', sequence: 2, arrivalMinutes: 4 * 60 + 30, departureMinutes: 4 * 60 + 40, dayOffset: 1 },
  { trainNumber: '90108', stationCode: 'NDLS', sequence: 3, arrivalMinutes: 11 * 60 + 15, departureMinutes: null, dayOffset: 1 },

  // 90109: BPL (06:15) -> AGC (12:30/12:35) -> NZM (15:00)
  { trainNumber: '90109', stationCode: 'BPL', sequence: 1, arrivalMinutes: null, departureMinutes: 6 * 60 + 15, dayOffset: 0 },
  { trainNumber: '90109', stationCode: 'AGC', sequence: 2, arrivalMinutes: 12 * 60 + 30, departureMinutes: 12 * 60 + 35, dayOffset: 0 },
  { trainNumber: '90109', stationCode: 'NZM', sequence: 3, arrivalMinutes: 15 * 60, departureMinutes: null, dayOffset: 0 },

  // 90110: NDLS (23:50 day 0) -> JP (04:30/04:40 day 1) -> ADI (13:15 day 1) [Long wait if arriving 13:30]
  { trainNumber: '90110', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: 23 * 60 + 50, dayOffset: 0 },
  { trainNumber: '90110', stationCode: 'JP', sequence: 2, arrivalMinutes: 4 * 60 + 30, departureMinutes: 4 * 60 + 40, dayOffset: 1 },
  { trainNumber: '90110', stationCode: 'ADI', sequence: 3, arrivalMinutes: 13 * 60 + 15, departureMinutes: null, dayOffset: 1 },
];

export const SAMPLE_STATION_TRANSFERS: StationTransfer[] = [
  {
    fromStationCode: 'NDLS',
    toStationCode: 'NZM',
    typicalMinutes: 45,
    modeNote: 'Metro (Violet/Pink) or cab — SAMPLE estimate',
    source: 'manual-SAMPLE',
    lastVerified: 'SAMPLE-not-verified',
  },
  {
    fromStationCode: 'NZM',
    toStationCode: 'NDLS',
    typicalMinutes: 45,
    modeNote: 'Metro (Violet/Pink) or cab — SAMPLE estimate',
    source: 'manual-SAMPLE',
    lastVerified: 'SAMPLE-not-verified',
  },
  {
    fromStationCode: 'NDLS',
    toStationCode: 'ANVT',
    typicalMinutes: 55,
    modeNote: 'Metro (Blue Line) or cab — SAMPLE estimate',
    source: 'manual-SAMPLE',
    lastVerified: 'SAMPLE-not-verified',
  },
  {
    fromStationCode: 'ANVT',
    toStationCode: 'NDLS',
    typicalMinutes: 55,
    modeNote: 'Metro (Blue Line) or cab — SAMPLE estimate',
    source: 'manual-SAMPLE',
    lastVerified: 'SAMPLE-not-verified',
  },
  {
    fromStationCode: 'CSMT',
    toStationCode: 'LTT',
    typicalMinutes: 55,
    modeNote: 'Suburban Harbour/Central + auto or cab — SAMPLE estimate',
    source: 'manual-SAMPLE',
    lastVerified: 'SAMPLE-not-verified',
  },
  // Intentionally omit DLI <-> ANVT so the UI & tests can show "Transfer time unknown"
];

export function seedSampleDatabaseIfEmpty(db: SQLiteDatabaseLike): void {
  const countRow = db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM Station;');
  if ((countRow?.count ?? 0) > 0) {
    return;
  }

  db.execSync('BEGIN TRANSACTION;');
  try {
    for (const cluster of SAMPLE_CITY_CLUSTERS) {
      db.runSync('INSERT INTO CityCluster (id, name) VALUES (?, ?);', cluster.id, cluster.name);
    }

    for (const station of SAMPLE_STATIONS) {
      db.runSync(
        'INSERT INTO Station (code, name, city, lat, lng, cityClusterId) VALUES (?, ?, ?, ?, ?, ?);',
        station.code,
        station.name,
        station.city,
        station.lat,
        station.lng,
        station.cityClusterId
      );
    }

    for (const train of SAMPLE_TRAINS) {
      db.runSync(
        'INSERT INTO Train (number, name, runningDays) VALUES (?, ?, ?);',
        train.number,
        train.name,
        train.runningDays
      );
    }

    for (const stop of SAMPLE_TRAIN_STOPS) {
      db.runSync(
        `INSERT INTO TrainStop (trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset)
         VALUES (?, ?, ?, ?, ?, ?);`,
        stop.trainNumber,
        stop.stationCode,
        stop.sequence,
        stop.arrivalMinutes,
        stop.departureMinutes,
        stop.dayOffset
      );
    }

    for (const transfer of SAMPLE_STATION_TRANSFERS) {
      db.runSync(
        `INSERT INTO StationTransfer (fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified)
         VALUES (?, ?, ?, ?, ?, ?);`,
        transfer.fromStationCode,
        transfer.toStationCode,
        transfer.typicalMinutes,
        transfer.modeNote,
        transfer.source,
        transfer.lastVerified
      );
    }

    db.runSync(
      'INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);',
      'datasetKind',
      SAMPLE_DATASET_META.datasetKind
    );
    db.runSync(
      'INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);',
      'dataVersion',
      SAMPLE_DATASET_META.dataVersion
    );
    db.runSync(
      'INSERT OR REPLACE INTO DataMetadata (key, value) VALUES (?, ?);',
      'lastUpdated',
      SAMPLE_DATASET_META.lastUpdated
    );

    db.execSync('COMMIT;');
  } catch (error) {
    db.execSync('ROLLBACK;');
    throw error;
  }
}
