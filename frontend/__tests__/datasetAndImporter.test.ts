import { validateTimetablePayload } from '@/db/importer';
import {
  SAMPLE_CITY_CLUSTERS,
  SAMPLE_STATIONS,
  SAMPLE_STATION_TRANSFERS,
  SAMPLE_TRAINS,
  SAMPLE_TRAIN_STOPS,
} from '@/db/seedSample';
import { searchConnections } from '@/domain/searchConnections';
import type {
  CityCluster,
  Station,
  StationTransfer,
  TimetableRepository,
  Train,
  TrainStop,
} from '@/domain/types';

function createSampleRepo(): TimetableRepository {
  const clusters = new Map<string, CityCluster>(SAMPLE_CITY_CLUSTERS.map((c) => [c.id, c]));
  const stations = new Map<string, Station>(SAMPLE_STATIONS.map((s) => [s.code, s]));
  const trains = new Map<string, Train>(SAMPLE_TRAINS.map((t) => [t.number, t]));
  const transfers = new Map<string, StationTransfer>(
    SAMPLE_STATION_TRANSFERS.map((tr) => [`${tr.fromStationCode}->${tr.toStationCode}`, tr])
  );

  return {
    getStationByCode: (code) => stations.get(code) ?? null,
    getStationsInCluster: (clusterId) =>
      SAMPLE_STATIONS.filter((s) => s.cityClusterId === clusterId),
    getCityClusterById: (clusterId) => clusters.get(clusterId) ?? null,
    getStopsAtStation: (stationCode) =>
      SAMPLE_TRAIN_STOPS.filter((s) => s.stationCode === stationCode),
    getTrainByNumber: (trainNumber) => trains.get(trainNumber) ?? null,
    getStopsForTrain: (trainNumber) =>
      SAMPLE_TRAIN_STOPS.filter((s) => s.trainNumber === trainNumber).sort(
        (a, b) => a.sequence - b.sequence
      ),
    getTransfer: (fromCode, toCode) => transfers.get(`${fromCode}->${toCode}`) ?? null,
  };
}

describe('Built-in Indian Railways dataset integrity', () => {
  test('all stops, transfers, and cluster references are valid', () => {
    const clusterIds = new Set(SAMPLE_CITY_CLUSTERS.map((c) => c.id));
    const stationCodes = new Set(SAMPLE_STATIONS.map((s) => s.code));
    const trainNumbers = new Set(SAMPLE_TRAINS.map((t) => t.number));

    expect(SAMPLE_STATIONS.length).toBeGreaterThanOrEqual(40);
    expect(SAMPLE_TRAINS.length).toBeGreaterThanOrEqual(40);

    for (const s of SAMPLE_STATIONS) {
      if (s.cityClusterId) {
        expect(clusterIds.has(s.cityClusterId)).toBe(true);
      }
    }

    for (const tr of SAMPLE_TRAINS) {
      expect(Number.isInteger(tr.runningDays)).toBe(true);
      expect(tr.runningDays).toBeGreaterThanOrEqual(1);
      expect(tr.runningDays).toBeLessThanOrEqual(127);
    }

    for (const stop of SAMPLE_TRAIN_STOPS) {
      expect(trainNumbers.has(stop.trainNumber)).toBe(true);
      expect(stationCodes.has(stop.stationCode)).toBe(true);
      if (stop.arrivalMinutes !== null) {
        expect(stop.arrivalMinutes).toBeGreaterThanOrEqual(0);
        expect(stop.arrivalMinutes).toBeLessThan(1440);
      }
      if (stop.departureMinutes !== null) {
        expect(stop.departureMinutes).toBeGreaterThanOrEqual(0);
        expect(stop.departureMinutes).toBeLessThan(1440);
      }
    }

    for (const transfer of SAMPLE_STATION_TRANSFERS) {
      expect(stationCodes.has(transfer.fromStationCode)).toBe(true);
      expect(stationCodes.has(transfer.toStationCode)).toBe(true);
      expect(transfer.typicalMinutes).toBeGreaterThan(0);
    }
  });

  test('finds 1-stop connections across major Pan-India corridors', () => {
    const repo = createSampleRepo();
    const monday = '2026-11-23';

    expect(
      searchConnections(repo, { sourceCode: 'LKO', destinationCode: 'JP', travelDate: monday }).length
    ).toBeGreaterThan(0);
    expect(
      searchConnections(repo, { sourceCode: 'NDLS', destinationCode: 'PUNE', travelDate: monday })
        .length
    ).toBeGreaterThan(0);
    expect(
      searchConnections(repo, { sourceCode: 'PNBE', destinationCode: 'SBC', travelDate: monday })
        .length
    ).toBeGreaterThan(0);
    expect(
      searchConnections(repo, { sourceCode: 'HWH', destinationCode: 'MAS', travelDate: monday }).length
    ).toBeGreaterThan(0);
    expect(
      searchConnections(repo, { sourceCode: 'ADI', destinationCode: 'GHY', travelDate: monday }).length
    ).toBeGreaterThan(0);
  });
});

describe('validateTimetablePayload', () => {
  test('accepts valid timetable JSON and normalizes station codes', () => {
    const parsed = validateTimetablePayload({
      meta: { dataVersion: '2026.12', lastUpdated: '2026-11-25' },
      cityClusters: [{ id: 'DEL', name: 'Delhi' }],
      stations: [
        { code: 'ndls', name: 'New Delhi', city: 'Delhi', lat: 28.6, lng: 77.2, cityClusterId: 'DEL' },
        { code: 'jp', name: 'Jaipur', city: 'Jaipur', lat: 26.9, lng: 75.7, cityClusterId: null },
      ],
      trains: [{ number: '12015', name: 'Ajmer Shatabdi', runningDays: 127 }],
      trainStops: [
        { trainNumber: '12015', stationCode: 'ndls', sequence: 1, arrivalMinutes: null, departureMinutes: 370, dayOffset: 0 },
        { trainNumber: '12015', stationCode: 'jp', sequence: 2, arrivalMinutes: 640, departureMinutes: null, dayOffset: 0 },
      ],
    });

    expect(parsed.stations[0]?.code).toBe('NDLS');
    expect(parsed.trainStops[1]?.stationCode).toBe('JP');
  });

  test('rejects invalid runningDays or unknown stationCode', () => {
    expect(() =>
      validateTimetablePayload({
        stations: [{ code: 'NDLS', name: 'New Delhi', city: 'Delhi', lat: 28.6, lng: 77.2 }],
        trains: [{ number: '12015', name: 'Ajmer Shatabdi', runningDays: 200 }],
        trainStops: [
          { trainNumber: '12015', stationCode: 'NDLS', sequence: 1, departureMinutes: 370 },
        ],
      })
    ).toThrow(/runningDays/i);

    expect(() =>
      validateTimetablePayload({
        stations: [{ code: 'NDLS', name: 'New Delhi', city: 'Delhi', lat: 28.6, lng: 77.2 }],
        trains: [{ number: '12015', name: 'Ajmer Shatabdi', runningDays: 127 }],
        trainStops: [
          { trainNumber: '12015', stationCode: 'UNKNOWN', sequence: 1, departureMinutes: 370 },
        ],
      })
    ).toThrow(/stationCode/i);
  });
});
