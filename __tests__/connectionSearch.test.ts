import { RATING_THRESHOLDS } from '@/config/ratingThresholds';
import { rateConnection } from '@/domain/rateConnection';
import { searchConnections } from '@/domain/searchConnections';
import { WEEKDAY_BITS } from '@/domain/time';
import type {
  CityCluster,
  Station,
  StationTransfer,
  TimetableRepository,
  Train,
  TrainStop,
} from '@/domain/types';

class InMemoryTimetableRepository implements TimetableRepository {
  private readonly stations = new Map<string, Station>();
  private readonly clusters = new Map<string, CityCluster>();
  private readonly trains = new Map<string, Train>();
  private readonly stops: TrainStop[] = [];
  private readonly transfers = new Map<string, StationTransfer>();

  constructor(data: {
    clusters?: CityCluster[];
    stations: Station[];
    trains: Train[];
    stops: TrainStop[];
    transfers?: StationTransfer[];
  }) {
    for (const c of data.clusters ?? []) {
      this.clusters.set(c.id, c);
    }
    for (const s of data.stations) {
      this.stations.set(s.code, s);
    }
    for (const t of data.trains) {
      this.trains.set(t.number, t);
    }
    this.stops.push(...data.stops);
    for (const tr of data.transfers ?? []) {
      this.transfers.set(`${tr.fromStationCode}->${tr.toStationCode}`, tr);
    }
  }

  getStationByCode(code: string): Station | null {
    return this.stations.get(code) ?? null;
  }

  getStationsInCluster(clusterId: string): Station[] {
    return [...this.stations.values()].filter((s) => s.cityClusterId === clusterId);
  }

  getCityClusterById(clusterId: string): CityCluster | null {
    return this.clusters.get(clusterId) ?? null;
  }

  getStopsAtStation(stationCode: string): TrainStop[] {
    return this.stops.filter((s) => s.stationCode === stationCode);
  }

  getTrainByNumber(trainNumber: string): Train | null {
    return this.trains.get(trainNumber) ?? null;
  }

  getStopsForTrain(trainNumber: string): TrainStop[] {
    return this.stops
      .filter((s) => s.trainNumber === trainNumber)
      .sort((a, b) => a.sequence - b.sequence);
  }

  getTransfer(fromCode: string, toCode: string): StationTransfer | null {
    return this.transfers.get(`${fromCode}->${toCode}`) ?? null;
  }
}

const DAILY =
  WEEKDAY_BITS.MON |
  WEEKDAY_BITS.TUE |
  WEEKDAY_BITS.WED |
  WEEKDAY_BITS.THU |
  WEEKDAY_BITS.FRI |
  WEEKDAY_BITS.SAT |
  WEEKDAY_BITS.SUN;

const CLUSTERS: CityCluster[] = [{ id: 'DELHI', name: 'Delhi' }];

const STATIONS: Station[] = [
  { code: 'AAA', name: 'Origin City', city: 'Origin', lat: 26.8, lng: 80.9, cityClusterId: null },
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', lat: 28.64, lng: 77.22, cityClusterId: 'DELHI' },
  { code: 'NZM', name: 'Nizamuddin', city: 'Delhi', lat: 28.59, lng: 77.25, cityClusterId: 'DELHI' },
  { code: 'ANVT', name: 'Anand Vihar', city: 'Delhi', lat: 28.65, lng: 77.31, cityClusterId: 'DELHI' },
  { code: 'BBB', name: 'Intermediate Town', city: 'Mid', lat: 27.1, lng: 78.0, cityClusterId: null },
  { code: 'ZZZ', name: 'Dest City', city: 'Dest', lat: 26.9, lng: 75.8, cityClusterId: null },
];

describe('rateConnection', () => {
  test('flags rating thresholds as to-be-validated assumptions', () => {
    expect(RATING_THRESHOLDS.ASSUMPTION_STATUS).toBe('to be validated with real passenger data');
  });

  test('rates Tight, OK, Comfortable, Too long using effective buffer', () => {
    expect(rateConnection(40, 0).rating).toBe('TIGHT');
    expect(rateConnection(60, 20).rating).toBe('TIGHT'); // buffer = 40 < 45
    expect(rateConnection(45, 0).rating).toBe('OK');
    expect(rateConnection(165, 45).rating).toBe('COMFORTABLE'); // buffer = 120
    expect(rateConnection(600, 45).rating).toBe('TOO_LONG'); // buffer = 555 > 480
  });

  test('never rates unknown transfer time as Comfortable', () => {
    expect(rateConnection(60, null)).toEqual({
      effectiveBufferMinutes: null,
      rating: 'TIGHT',
      unknownTransferTime: true,
    });
    expect(rateConnection(240, null)).toEqual({
      effectiveBufferMinutes: null,
      rating: 'TRANSFER_UNKNOWN',
      unknownTransferTime: true,
    });
  });
});

describe('searchConnections', () => {
  test('1. same-station transfer: computes 0 transfer time, sorts by total time, never hides Tight', () => {
    const repo = new InMemoryTimetableRepository({
      clusters: CLUSTERS,
      stations: STATIONS,
      trains: [
        { number: 'T1', name: 'Leg1 Express', runningDays: DAILY },
        { number: 'T2_TIGHT', name: 'Leg2 Tight', runningDays: DAILY },
        { number: 'T2_COMF', name: 'Leg2 Comfortable', runningDays: DAILY },
      ],
      stops: [
        { trainNumber: 'T1', stationCode: 'AAA', sequence: 1, arrivalMinutes: null, departureMinutes: 8 * 60, dayOffset: 0 },
        { trainNumber: 'T1', stationCode: 'BBB', sequence: 2, arrivalMinutes: 12 * 60, departureMinutes: null, dayOffset: 0 },

        // Departs 12:30 -> 30m layover -> TIGHT, shorter total journey
        { trainNumber: 'T2_TIGHT', stationCode: 'BBB', sequence: 1, arrivalMinutes: null, departureMinutes: 12 * 60 + 30, dayOffset: 0 },
        { trainNumber: 'T2_TIGHT', stationCode: 'ZZZ', sequence: 2, arrivalMinutes: 16 * 60, departureMinutes: null, dayOffset: 0 },

        // Departs 14:30 -> 150m layover -> COMFORTABLE, longer total journey
        { trainNumber: 'T2_COMF', stationCode: 'BBB', sequence: 1, arrivalMinutes: null, departureMinutes: 14 * 60 + 30, dayOffset: 0 },
        { trainNumber: 'T2_COMF', stationCode: 'ZZZ', sequence: 2, arrivalMinutes: 18 * 60, departureMinutes: null, dayOffset: 0 },
      ],
    });

    const results = searchConnections(repo, {
      sourceCode: 'AAA',
      destinationCode: 'ZZZ',
      travelDate: '2026-11-25', // Wednesday
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.leg2.trainNumber).toBe('T2_TIGHT');
    expect(results[0]!.rating).toBe('TIGHT');
    expect(results[0]!.isStationChange).toBe(false);
    expect(results[0]!.transferMinutes).toBe(0);
    expect(results[0]!.effectiveBufferMinutes).toBe(30);
    expect(results[0]!.totalJourneyMinutes).toBe(8 * 60);
    expect(results[0]!.ratingIsEstimate).toBe(true);

    expect(results[1]!.leg2.trainNumber).toBe('T2_COMF');
    expect(results[1]!.rating).toBe('COMFORTABLE');
    expect(results[1]!.totalJourneyMinutes).toBe(10 * 60);
  });

  test('2. different-station transfer in same cityCluster uses StationTransfer minutes', () => {
    const repo = new InMemoryTimetableRepository({
      clusters: CLUSTERS,
      stations: STATIONS,
      trains: [
        { number: 'T1', name: 'Into NDLS', runningDays: DAILY },
        { number: 'T2_TOO_SOON', name: 'Too soon from NZM', runningDays: DAILY },
        { number: 'T2_OK', name: 'Feasible from NZM', runningDays: DAILY },
      ],
      stops: [
        { trainNumber: 'T1', stationCode: 'AAA', sequence: 1, arrivalMinutes: null, departureMinutes: 6 * 60, dayOffset: 0 },
        { trainNumber: 'T1', stationCode: 'NDLS', sequence: 2, arrivalMinutes: 12 * 60, departureMinutes: null, dayOffset: 0 },

        // Departs NZM at 12:30 -> only 30m layover, less than 45m transfer -> filtered out
        { trainNumber: 'T2_TOO_SOON', stationCode: 'NZM', sequence: 1, arrivalMinutes: null, departureMinutes: 12 * 60 + 30, dayOffset: 0 },
        { trainNumber: 'T2_TOO_SOON', stationCode: 'ZZZ', sequence: 2, arrivalMinutes: 16 * 60, departureMinutes: null, dayOffset: 0 },

        // Departs NZM at 13:45 -> 105m layover - 45m transfer = 60m buffer -> OK
        { trainNumber: 'T2_OK', stationCode: 'NZM', sequence: 1, arrivalMinutes: null, departureMinutes: 13 * 60 + 45, dayOffset: 0 },
        { trainNumber: 'T2_OK', stationCode: 'ZZZ', sequence: 2, arrivalMinutes: 18 * 60, departureMinutes: null, dayOffset: 0 },
      ],
      transfers: [
        {
          fromStationCode: 'NDLS',
          toStationCode: 'NZM',
          typicalMinutes: 45,
          modeNote: 'Metro or cab',
          source: 'manual',
          lastVerified: '2026-11-24',
        },
      ],
    });

    const results = searchConnections(repo, {
      sourceCode: 'AAA',
      destinationCode: 'ZZZ',
      travelDate: '2026-11-25',
    });

    expect(results).toHaveLength(1);
    const opt = results[0]!;
    expect(opt.isStationChange).toBe(true);
    expect(opt.hubClusterName).toBe('Delhi');
    expect(opt.layoverMinutes).toBe(105);
    expect(opt.transferMinutes).toBe(45);
    expect(opt.effectiveBufferMinutes).toBe(60);
    expect(opt.rating).toBe('OK');
    expect(opt.transferInfo?.modeNote).toBe('Metro or cab');
  });

  test('3. overnight trains crossing midnight (both legs and midnight layover)', () => {
    const repo = new InMemoryTimetableRepository({
      clusters: CLUSTERS,
      stations: STATIONS,
      trains: [
        { number: 'T_NIGHT1', name: 'Overnight Leg 1', runningDays: DAILY },
        { number: 'T_NIGHT2', name: 'Early Morning Leg 2', runningDays: DAILY },
      ],
      stops: [
        // Departs AAA 21:00 day 0, arrives BBB 23:30 day 0
        { trainNumber: 'T_NIGHT1', stationCode: 'AAA', sequence: 1, arrivalMinutes: null, departureMinutes: 21 * 60, dayOffset: 0 },
        { trainNumber: 'T_NIGHT1', stationCode: 'BBB', sequence: 2, arrivalMinutes: 23 * 60 + 30, departureMinutes: null, dayOffset: 0 },

        // Departs BBB 01:30 day 0 (next calendar day relative to T_NIGHT1!), arrives ZZZ 06:00 day 1
        { trainNumber: 'T_NIGHT2', stationCode: 'BBB', sequence: 1, arrivalMinutes: null, departureMinutes: 1 * 60 + 30, dayOffset: 0 },
        { trainNumber: 'T_NIGHT2', stationCode: 'ZZZ', sequence: 2, arrivalMinutes: 6 * 60, dayOffset: 1, departureMinutes: null },
      ],
    });

    const results = searchConnections(repo, {
      sourceCode: 'AAA',
      destinationCode: 'ZZZ',
      travelDate: '2026-11-25',
    });

    expect(results).toHaveLength(1);
    const opt = results[0]!;
    expect(opt.leg1.departureIsoDate).toBe('2026-11-25');
    expect(opt.leg1.arrivalIsoDate).toBe('2026-11-25');
    expect(opt.leg2.departureIsoDate).toBe('2026-11-26');
    expect(opt.leg2.arrivalIsoDate).toBe('2026-11-27');
    expect(opt.layoverMinutes).toBe(120); // 23:30 -> 01:30 next day
    expect(opt.rating).toBe('COMFORTABLE');
    expect(opt.totalJourneyMinutes).toBe(33 * 60); // 25 Nov 21:00 -> 27 Nov 06:00
  });

  test('4. days-of-week filtering respects origin dayOffset when boarding mid-route', () => {
    const repo = new InMemoryTimetableRepository({
      clusters: CLUSTERS,
      stations: STATIONS,
      trains: [
        // Originates on Tuesday only, reaches AAA on dayOffset = 1 (Wednesday!)
        { number: 'T_TUE_ORIG', name: 'Tue Origin Overnight', runningDays: WEEKDAY_BITS.TUE },
        // Runs Thursday only at BBB
        { number: 'T_THU_ONLY', name: 'Thu Connector', runningDays: WEEKDAY_BITS.THU },
      ],
      stops: [
        { trainNumber: 'T_TUE_ORIG', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: 20 * 60, dayOffset: 0 },
        { trainNumber: 'T_TUE_ORIG', stationCode: 'AAA', sequence: 2, arrivalMinutes: 2 * 60, departureMinutes: 2 * 60 + 15, dayOffset: 1 },
        { trainNumber: 'T_TUE_ORIG', stationCode: 'BBB', sequence: 3, arrivalMinutes: 23 * 60, departureMinutes: null, dayOffset: 1 },

        { trainNumber: 'T_THU_ONLY', stationCode: 'BBB', sequence: 1, arrivalMinutes: null, departureMinutes: 1 * 60, dayOffset: 0 },
        { trainNumber: 'T_THU_ONLY', stationCode: 'ZZZ', sequence: 2, arrivalMinutes: 5 * 60, departureMinutes: null, dayOffset: 0 },
      ],
    });

    // 2026-11-25 is Wednesday: T_TUE_ORIG originated Tuesday (valid!), arrives BBB Wed 23:00,
    // catches T_THU_ONLY on Thursday 2026-11-26 01:00 (valid!)
    const wedResults = searchConnections(repo, {
      sourceCode: 'AAA',
      destinationCode: 'ZZZ',
      travelDate: '2026-11-25',
    });
    expect(wedResults).toHaveLength(1);
    expect(wedResults[0]!.leg2.departureIsoDate).toBe('2026-11-26');

    // 2026-11-24 is Tuesday: T_TUE_ORIG would have originated Monday (invalid!)
    const tueResults = searchConnections(repo, {
      sourceCode: 'AAA',
      destinationCode: 'ZZZ',
      travelDate: '2026-11-24',
    });
    expect(tueResults).toHaveLength(0);
  });

  test('5. no-result case returns empty array cleanly', () => {
    const repo = new InMemoryTimetableRepository({
      clusters: CLUSTERS,
      stations: STATIONS,
      trains: [{ number: 'T1', name: 'Dead End', runningDays: DAILY }],
      stops: [
        { trainNumber: 'T1', stationCode: 'AAA', sequence: 1, arrivalMinutes: null, departureMinutes: 600, dayOffset: 0 },
        { trainNumber: 'T1', stationCode: 'BBB', sequence: 2, arrivalMinutes: 700, departureMinutes: null, dayOffset: 0 },
      ],
    });

    expect(
      searchConnections(repo, { sourceCode: 'AAA', destinationCode: 'ZZZ', travelDate: '2026-11-25' })
    ).toEqual([]);
    expect(
      searchConnections(repo, { sourceCode: 'AAA', destinationCode: 'AAA', travelDate: '2026-11-25' })
    ).toEqual([]);
  });

  test('6. unknown transfer time marks unknownTransferTime=true and never rates Comfortable', () => {
    const repo = new InMemoryTimetableRepository({
      clusters: CLUSTERS,
      stations: STATIONS,
      trains: [
        { number: 'T1', name: 'Into NDLS', runningDays: DAILY },
        { number: 'T2', name: 'Out of ANVT', runningDays: DAILY },
      ],
      stops: [
        { trainNumber: 'T1', stationCode: 'AAA', sequence: 1, arrivalMinutes: null, departureMinutes: 6 * 60, dayOffset: 0 },
        { trainNumber: 'T1', stationCode: 'NDLS', sequence: 2, arrivalMinutes: 10 * 60, departureMinutes: null, dayOffset: 0 },

        // 4h layover from NDLS to ANVT, with NO StationTransfer entry
        { trainNumber: 'T2', stationCode: 'ANVT', sequence: 1, arrivalMinutes: null, departureMinutes: 14 * 60, dayOffset: 0 },
        { trainNumber: 'T2', stationCode: 'ZZZ', sequence: 2, arrivalMinutes: 19 * 60, departureMinutes: null, dayOffset: 0 },
      ],
      transfers: [],
    });

    const results = searchConnections(repo, {
      sourceCode: 'AAA',
      destinationCode: 'ZZZ',
      travelDate: '2026-11-25',
    });

    expect(results).toHaveLength(1);
    const opt = results[0]!;
    expect(opt.isStationChange).toBe(true);
    expect(opt.unknownTransferTime).toBe(true);
    expect(opt.transferMinutes).toBeNull();
    expect(opt.effectiveBufferMinutes).toBeNull();
    expect(opt.rating).toBe('TRANSFER_UNKNOWN');
    expect(opt.rating).not.toBe('COMFORTABLE');
  });
});
