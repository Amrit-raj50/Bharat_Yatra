export interface CityCluster {
  id: string;
  name: string;
}

export interface Station {
  code: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  cityClusterId: string | null;
}

export interface Train {
  number: string;
  name: string;
  /**
   * 7-bit weekday bitmask in IST:
   * bit 0 (1) = Monday ... bit 6 (64) = Sunday.
   */
  runningDays: number;
}

export interface TrainStop {
  id?: number;
  trainNumber: string;
  stationCode: string;
  sequence: number;
  /** Minutes from 00:00 IST (0..1439), null at origin stop. */
  arrivalMinutes: number | null;
  /** Minutes from 00:00 IST (0..1439), null at terminal stop. */
  departureMinutes: number | null;
  /** Days elapsed since the train's origin departure date (0 for origin day). */
  dayOffset: number;
}

export interface StationTransfer {
  fromStationCode: string;
  toStationCode: string;
  typicalMinutes: number;
  modeNote: string;
  source: string;
  lastVerified: string;
}

export type DatasetKind = 'SAMPLE' | 'IMPORTED';

export interface DatasetMeta {
  datasetKind: DatasetKind;
  dataVersion: string;
  lastUpdated: string;
}

export type BufferRating =
  | 'TIGHT'
  | 'OK'
  | 'COMFORTABLE'
  | 'TOO_LONG'
  | 'TRANSFER_UNKNOWN';

export interface ConnectionLeg {
  trainNumber: string;
  trainName: string;
  runningDays: number;
  boardStation: Station;
  alightStation: Station;
  boardStop: TrainStop;
  alightStop: TrainStop;
  /** YYYY-MM-DD in IST when passenger boards this leg */
  departureIsoDate: string;
  departureMinutesFromMidnight: number;
  /** YYYY-MM-DD in IST when passenger alights this leg */
  arrivalIsoDate: string;
  arrivalMinutesFromMidnight: number;
  durationMinutes: number;
}

export interface ConnectionOption {
  id: string;
  leg1: ConnectionLeg;
  leg2: ConnectionLeg;
  hubClusterName: string | null;
  isStationChange: boolean;
  layoverMinutes: number;
  transferMinutes: number | null;
  transferInfo: StationTransfer | null;
  effectiveBufferMinutes: number | null;
  totalJourneyMinutes: number;
  rating: BufferRating;
  /** Always true in Phases 1-2: schedule-based estimate, never probability. */
  ratingIsEstimate: true;
  unknownTransferTime: boolean;
}

export interface TimetableRepository {
  getStationByCode(code: string): Station | null;
  getStationsInCluster(clusterId: string): Station[];
  getCityClusterById(clusterId: string): CityCluster | null;
  getStopsAtStation(stationCode: string): TrainStop[];
  getTrainByNumber(trainNumber: string): Train | null;
  getStopsForTrain(trainNumber: string): TrainStop[];
  getTransfer(fromCode: string, toCode: string): StationTransfer | null;
}
