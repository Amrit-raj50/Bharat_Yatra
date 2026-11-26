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
const EXCEPT_SUN = DAILY ^ WEEKDAY_BITS.SUN;
const EXCEPT_WED = DAILY ^ WEEKDAY_BITS.WED;
const MON_THU = WEEKDAY_BITS.MON | WEEKDAY_BITS.THU;
const TUE_FRI = WEEKDAY_BITS.TUE | WEEKDAY_BITS.FRI;
const SAT_SUN = WEEKDAY_BITS.SAT | WEEKDAY_BITS.SUN;

const t = (h: number, m = 0): number => h * 60 + m;

/**
 * Built-in offline reference timetable dataset.
 * Covers major Indian Railway junctions, 6 metropolitan city clusters,
 * and cross-country corridors. Marked SAMPLE until replaced by an
 * externally verified dataset via Settings > Sync or import-timetable.mjs.
 */
export const SAMPLE_DATASET_META: DatasetMeta = {
  datasetKind: 'SAMPLE',
  dataVersion: '2026.11-IN-REF',
  lastUpdated: '2026-11-25',
};

export const SAMPLE_CITY_CLUSTERS: CityCluster[] = [
  { id: 'DELHI_NCR', name: 'Delhi NCR' },
  { id: 'MUMBAI_MMR', name: 'Mumbai MMR' },
  { id: 'KOLKATA', name: 'Kolkata' },
  { id: 'CHENNAI', name: 'Chennai' },
  { id: 'BENGALURU', name: 'Bengaluru' },
  { id: 'HYDERABAD', name: 'Hyderabad' },
];

export const SAMPLE_STATIONS: Station[] = [
  // Delhi NCR
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', lat: 28.6419, lng: 77.2194, cityClusterId: 'DELHI_NCR' },
  { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'Delhi', lat: 28.5889, lng: 77.2535, cityClusterId: 'DELHI_NCR' },
  { code: 'ANVT', name: 'Anand Vihar Terminal', city: 'Delhi', lat: 28.6486, lng: 77.3156, cityClusterId: 'DELHI_NCR' },
  { code: 'DLI', name: 'Old Delhi Junction', city: 'Delhi', lat: 28.6619, lng: 77.2274, cityClusterId: 'DELHI_NCR' },
  { code: 'DEE', name: 'Delhi Sarai Rohilla', city: 'Delhi', lat: 28.6626, lng: 77.1843, cityClusterId: 'DELHI_NCR' },

  // Mumbai MMR
  { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai', lat: 18.9398, lng: 72.8355, cityClusterId: 'MUMBAI_MMR' },
  { code: 'LTT', name: 'Lokmanya Tilak Terminus', city: 'Mumbai', lat: 19.0689, lng: 72.8919, cityClusterId: 'MUMBAI_MMR' },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', lat: 18.9696, lng: 72.8193, cityClusterId: 'MUMBAI_MMR' },
  { code: 'BDTS', name: 'Bandra Terminus', city: 'Mumbai', lat: 19.0626, lng: 72.8408, cityClusterId: 'MUMBAI_MMR' },

  // Kolkata
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', lat: 22.5839, lng: 88.3426, cityClusterId: 'KOLKATA' },
  { code: 'SDAH', name: 'Sealdah', city: 'Kolkata', lat: 22.5673, lng: 88.3705, cityClusterId: 'KOLKATA' },
  { code: 'KOAA', name: 'Kolkata Terminal', city: 'Kolkata', lat: 22.6014, lng: 88.3834, cityClusterId: 'KOLKATA' },

  // Chennai
  { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', lat: 13.0827, lng: 80.2757, cityClusterId: 'CHENNAI' },
  { code: 'MS', name: 'Chennai Egmore', city: 'Chennai', lat: 13.0732, lng: 80.2614, cityClusterId: 'CHENNAI' },

  // Bengaluru
  { code: 'SBC', name: 'KSR Bengaluru City', city: 'Bengaluru', lat: 12.9781, lng: 77.5697, cityClusterId: 'BENGALURU' },
  { code: 'YPR', name: 'Yesvantpur Junction', city: 'Bengaluru', lat: 13.0238, lng: 77.5504, cityClusterId: 'BENGALURU' },
  { code: 'SMVB', name: 'SMVT Bengaluru', city: 'Bengaluru', lat: 13.0059, lng: 77.6484, cityClusterId: 'BENGALURU' },

  // Hyderabad
  { code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad', lat: 17.4344, lng: 78.5013, cityClusterId: 'HYDERABAD' },
  { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', lat: 17.3919, lng: 78.4673, cityClusterId: 'HYDERABAD' },
  { code: 'KCG', name: 'Kacheguda', city: 'Hyderabad', lat: 17.3886, lng: 78.4979, cityClusterId: 'HYDERABAD' },

  // North India
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', lat: 26.8318, lng: 80.9191, cityClusterId: null },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', lat: 26.4539, lng: 80.3511, cityClusterId: null },
  { code: 'PRYJ', name: 'Prayagraj Junction', city: 'Prayagraj', lat: 25.4469, lng: 81.8295, cityClusterId: null },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', lat: 25.3272, lng: 82.9854, cityClusterId: null },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', lat: 27.1583, lng: 77.9897, cityClusterId: null },
  { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', lat: 30.7016, lng: 76.8214, cityClusterId: null },
  { code: 'ASR', name: 'Amritsar Junction', city: 'Amritsar', lat: 31.6331, lng: 74.8675, cityClusterId: null },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', lat: 32.7069, lng: 74.8813, cityClusterId: null },
  { code: 'DDN', name: 'Dehradun', city: 'Dehradun', lat: 30.3143, lng: 78.0332, cityClusterId: null },

  // East & North-East India
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', lat: 25.6031, lng: 85.1376, cityClusterId: null },
  { code: 'DDU', name: 'Pt. DD Upadhyaya Jn', city: 'Mughalsarai', lat: 25.2804, lng: 83.1194, cityClusterId: null },
  { code: 'GAYA', name: 'Gaya Junction', city: 'Gaya', lat: 24.8035, lng: 84.9994, cityClusterId: null },
  { code: 'RNC', name: 'Ranchi Junction', city: 'Ranchi', lat: 23.3526, lng: 85.3418, cityClusterId: null },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', lat: 20.2665, lng: 85.8435, cityClusterId: null },
  { code: 'NJP', name: 'New Jalpaiguri', city: 'Siliguri', lat: 26.6836, lng: 88.4426, cityClusterId: null },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', lat: 26.1822, lng: 91.7506, cityClusterId: null },

  // West & Central India
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', lat: 26.9196, lng: 75.7878, cityClusterId: null },
  { code: 'JU', name: 'Jodhpur Junction', city: 'Jodhpur', lat: 26.2838, lng: 73.0223, cityClusterId: null },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', lat: 23.0265, lng: 72.6008, cityClusterId: null },
  { code: 'BRC', name: 'Vadodara Junction', city: 'Vadodara', lat: 22.3106, lng: 73.1812, cityClusterId: null },
  { code: 'ST', name: 'Surat', city: 'Surat', lat: 21.2049, lng: 72.8409, cityClusterId: null },
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', lat: 18.5289, lng: 73.8744, cityClusterId: null },
  { code: 'GWL', name: 'Gwalior Junction', city: 'Gwalior', lat: 26.2144, lng: 78.1797, cityClusterId: null },
  { code: 'VGLJ', name: 'Virangana Lakshmibai Jhansi', city: 'Jhansi', lat: 25.4484, lng: 78.5542, cityClusterId: null },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', lat: 23.2683, lng: 77.4131, cityClusterId: null },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', lat: 21.1525, lng: 79.0882, cityClusterId: null },

  // South India
  { code: 'VSKP', name: 'Visakhapatnam', city: 'Visakhapatnam', lat: 17.7219, lng: 83.2899, cityClusterId: null },
  { code: 'BZA', name: 'Vijayawada Junction', city: 'Vijayawada', lat: 16.5186, lng: 80.6199, cityClusterId: null },
  { code: 'CBE', name: 'Coimbatore Junction', city: 'Coimbatore', lat: 10.9971, lng: 76.9668, cityClusterId: null },
  { code: 'ERS', name: 'Ernakulam Junction', city: 'Kochi', lat: 9.9693, lng: 76.2908, cityClusterId: null },
  { code: 'TVC', name: 'Thiruvananthapuram Central', city: 'Thiruvananthapuram', lat: 8.4875, lng: 76.9525, cityClusterId: null },
  { code: 'MAO', name: 'Madgaon Junction', city: 'Goa', lat: 15.2685, lng: 73.9721, cityClusterId: null },
];

export const SAMPLE_TRAINS: Train[] = [
  // North <-> Delhi NCR
  { number: '12419', name: 'Gomti Express', runningDays: DAILY },
  { number: '12229', name: 'Lucknow Mail', runningDays: DAILY },
  { number: '12003', name: 'Lucknow Swarna Shatabdi', runningDays: DAILY },
  { number: '12417', name: 'Prayagraj Express', runningDays: DAILY },
  { number: '12559', name: 'Shiv Ganga Express', runningDays: DAILY },
  { number: '22435', name: 'Varanasi Vande Bharat', runningDays: EXCEPT_WED },
  { number: '12005', name: 'Kalka-Delhi Shatabdi', runningDays: DAILY },
  { number: '12013', name: 'Amritsar Shatabdi', runningDays: DAILY },
  { number: '12425', name: 'Jammu Rajdhani', runningDays: DAILY },
  { number: '12017', name: 'Dehradun Shatabdi', runningDays: DAILY },

  // East <-> Delhi NCR
  { number: '12309', name: 'Patna Rajdhani', runningDays: DAILY },
  { number: '12393', name: 'Sampoorna Kranti Express', runningDays: DAILY },
  { number: '12301', name: 'Howrah Rajdhani', runningDays: DAILY },
  { number: '12313', name: 'Sealdah Rajdhani', runningDays: DAILY },
  { number: '12423', name: 'Dibrugarh-NDLS Rajdhani', runningDays: DAILY },
  { number: '12505', name: 'North East Express', runningDays: DAILY },
  { number: '22823', name: 'Bhubaneswar Rajdhani', runningDays: MON_THU },
  { number: '12453', name: 'Ranchi Rajdhani', runningDays: TUE_FRI },

  // West & Rajasthan <-> Delhi NCR
  { number: '12015', name: 'Ajmer Shatabdi', runningDays: DAILY },
  { number: '12985', name: 'Jaipur Double Decker', runningDays: DAILY },
  { number: '12414', name: 'Pooja Superfast Express', runningDays: DAILY },
  { number: '12461', name: 'Mandore Express', runningDays: DAILY },
  { number: '12957', name: 'Swarna Jayanti Rajdhani', runningDays: DAILY },
  { number: '12915', name: 'Ashram Express', runningDays: DAILY },
  { number: '12951', name: 'Mumbai Tejas Rajdhani', runningDays: DAILY },
  { number: '12953', name: 'August Kranti Rajdhani', runningDays: DAILY },
  { number: '12903', name: 'Golden Temple Mail', runningDays: DAILY },
  { number: '12263', name: 'Pune-NZM Duronto', runningDays: TUE_THU_SAT },

  // Central & South <-> Delhi NCR
  { number: '12002', name: 'Bhopal Shatabdi', runningDays: DAILY },
  { number: '12155', name: 'Bhopal Express', runningDays: DAILY },
  { number: '12621', name: 'Tamil Nadu Express', runningDays: DAILY },
  { number: '12433', name: 'Chennai Rajdhani', runningDays: MON_WED_FRI },
  { number: '12723', name: 'Telangana Express', runningDays: DAILY },
  { number: '22691', name: 'Bengaluru Rajdhani', runningDays: DAILY },
  { number: '12625', name: 'Kerala Express', runningDays: DAILY },
  { number: '12431', name: 'Trivandrum Rajdhani', runningDays: TUE_THU_SAT },

  // Mumbai <-> Pune / South / East / West
  { number: '12123', name: 'Deccan Queen', runningDays: DAILY },
  { number: '12127', name: 'Mumbai-Pune Intercity', runningDays: DAILY },
  { number: '12009', name: 'Ahmedabad Shatabdi', runningDays: EXCEPT_SUN },
  { number: '12901', name: 'Gujarat Mail', runningDays: DAILY },
  { number: '12101', name: 'Jnaneswari Express', runningDays: MON_WED_FRI },
  { number: '12261', name: 'Howrah Duronto', runningDays: TUE_THU_SAT },
  { number: '11301', name: 'Udyan Express', runningDays: DAILY },
  { number: '12163', name: 'Chennai Express', runningDays: DAILY },
  { number: '10103', name: 'Mandovi Express', runningDays: DAILY },
  { number: '12701', name: 'Hussainsagar Express', runningDays: DAILY },

  // East <-> South / West
  { number: '12839', name: 'Howrah-Chennai Mail', runningDays: DAILY },
  { number: '12841', name: 'Coromandel Express', runningDays: DAILY },
  { number: '12245', name: 'Howrah-SMVB Duronto', runningDays: DAILY },
  { number: '12860', name: 'Gitanjali Express', runningDays: DAILY },
  { number: '12510', name: 'Guwahati-SMVB Express', runningDays: SAT_SUN },

  // Intra-South & Cross-Peninsular
  { number: '12007', name: 'Mysuru Shatabdi', runningDays: EXCEPT_WED },
  { number: '12607', name: 'Lalbagh Express', runningDays: DAILY },
  { number: '12677', name: 'Ernakulam Intercity', runningDays: DAILY },
  { number: '12759', name: 'Charminar Express', runningDays: DAILY },
  { number: '12785', name: 'Kacheguda-SBC Express', runningDays: DAILY },
  { number: '12213', name: 'YPR-DEE Duronto', runningDays: SAT_SUN },

  // Return-direction trunk corridors
  { number: '12952', name: 'NDLS-Mumbai Tejas Rajdhani', runningDays: DAILY },
  { number: '12958', name: 'NDLS-ADI Swarna Jayanti Rajdhani', runningDays: DAILY },
  { number: '12310', name: 'NDLS-Patna Rajdhani', runningDays: DAILY },
  { number: '12302', name: 'NDLS-Howrah Rajdhani', runningDays: DAILY },
  { number: '12622', name: 'NDLS-Chennai Tamil Nadu Exp', runningDays: DAILY },
  { number: '22692', name: 'NZM-Bengaluru Rajdhani', runningDays: DAILY },
  { number: '12424', name: 'NDLS-Dibrugarh Rajdhani', runningDays: DAILY },
];

export const SAMPLE_TRAIN_STOPS: TrainStop[] = [
  // 12419 Gomti Express: LKO 05:45 -> CNB 07:20/07:25 -> NDLS 13:15
  { trainNumber: '12419', stationCode: 'LKO', sequence: 1, arrivalMinutes: null, departureMinutes: t(5, 45), dayOffset: 0 },
  { trainNumber: '12419', stationCode: 'CNB', sequence: 2, arrivalMinutes: t(7, 20), departureMinutes: t(7, 25), dayOffset: 0 },
  { trainNumber: '12419', stationCode: 'NDLS', sequence: 3, arrivalMinutes: t(13, 15), departureMinutes: null, dayOffset: 0 },

  // 12229 Lucknow Mail: LKO 22:00 (d0) -> NDLS 06:55 (d1)
  { trainNumber: '12229', stationCode: 'LKO', sequence: 1, arrivalMinutes: null, departureMinutes: t(22, 0), dayOffset: 0 },
  { trainNumber: '12229', stationCode: 'NDLS', sequence: 2, arrivalMinutes: t(6, 55), departureMinutes: null, dayOffset: 1 },

  // 12003 Lucknow Swarna Shatabdi: LKO 15:35 -> CNB 16:50/16:55 -> NDLS 22:25
  { trainNumber: '12003', stationCode: 'LKO', sequence: 1, arrivalMinutes: null, departureMinutes: t(15, 35), dayOffset: 0 },
  { trainNumber: '12003', stationCode: 'CNB', sequence: 2, arrivalMinutes: t(16, 50), departureMinutes: t(16, 55), dayOffset: 0 },
  { trainNumber: '12003', stationCode: 'NDLS', sequence: 3, arrivalMinutes: t(22, 25), departureMinutes: null, dayOffset: 0 },

  // 12417 Prayagraj Express: PRYJ 22:10 (d0) -> CNB 00:35/00:40 (d1) -> NDLS 07:00 (d1)
  { trainNumber: '12417', stationCode: 'PRYJ', sequence: 1, arrivalMinutes: null, departureMinutes: t(22, 10), dayOffset: 0 },
  { trainNumber: '12417', stationCode: 'CNB', sequence: 2, arrivalMinutes: t(0, 35), departureMinutes: t(0, 40), dayOffset: 1 },
  { trainNumber: '12417', stationCode: 'NDLS', sequence: 3, arrivalMinutes: t(7, 0), departureMinutes: null, dayOffset: 1 },

  // 12559 Shiv Ganga Express: BSB 22:15 (d0) -> PRYJ 00:30/00:35 (d1) -> CNB 02:45/02:50 (d1) -> NDLS 08:25 (d1)
  { trainNumber: '12559', stationCode: 'BSB', sequence: 1, arrivalMinutes: null, departureMinutes: t(22, 15), dayOffset: 0 },
  { trainNumber: '12559', stationCode: 'PRYJ', sequence: 2, arrivalMinutes: t(0, 30), departureMinutes: t(0, 35), dayOffset: 1 },
  { trainNumber: '12559', stationCode: 'CNB', sequence: 3, arrivalMinutes: t(2, 45), departureMinutes: t(2, 50), dayOffset: 1 },
  { trainNumber: '12559', stationCode: 'NDLS', sequence: 4, arrivalMinutes: t(8, 25), departureMinutes: null, dayOffset: 1 },

  // 22435 Varanasi Vande Bharat: BSB 15:00 -> PRYJ 16:30/16:32 -> CNB 18:30/18:32 -> NDLS 23:00
  { trainNumber: '22435', stationCode: 'BSB', sequence: 1, arrivalMinutes: null, departureMinutes: t(15, 0), dayOffset: 0 },
  { trainNumber: '22435', stationCode: 'PRYJ', sequence: 2, arrivalMinutes: t(16, 30), departureMinutes: t(16, 32), dayOffset: 0 },
  { trainNumber: '22435', stationCode: 'CNB', sequence: 3, arrivalMinutes: t(18, 30), departureMinutes: t(18, 32), dayOffset: 0 },
  { trainNumber: '22435', stationCode: 'NDLS', sequence: 4, arrivalMinutes: t(23, 0), departureMinutes: null, dayOffset: 0 },

  // 12005 Kalka-Delhi Shatabdi: NDLS 17:15 -> CDG 20:30
  { trainNumber: '12005', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 15), dayOffset: 0 },
  { trainNumber: '12005', stationCode: 'CDG', sequence: 2, arrivalMinutes: t(20, 30), departureMinutes: null, dayOffset: 0 },

  // 12013 Amritsar Shatabdi: NDLS 16:30 -> ASR 22:35
  { trainNumber: '12013', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(16, 30), dayOffset: 0 },
  { trainNumber: '12013', stationCode: 'ASR', sequence: 2, arrivalMinutes: t(22, 35), departureMinutes: null, dayOffset: 0 },

  // 12425 Jammu Rajdhani: NDLS 20:40 (d0) -> JAT 05:00 (d1)
  { trainNumber: '12425', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(20, 40), dayOffset: 0 },
  { trainNumber: '12425', stationCode: 'JAT', sequence: 2, arrivalMinutes: t(5, 0), departureMinutes: null, dayOffset: 1 },

  // 12017 Dehradun Shatabdi: NDLS 06:45 -> DDN 12:55
  { trainNumber: '12017', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 45), dayOffset: 0 },
  { trainNumber: '12017', stationCode: 'DDN', sequence: 2, arrivalMinutes: t(12, 55), departureMinutes: null, dayOffset: 0 },

  // 12309 Patna Rajdhani: PNBE 19:10 (d0) -> DDU 22:12/22:22 (d0) -> PRYJ 00:10/00:12 (d1) -> CNB 02:15/02:20 (d1) -> NDLS 07:40 (d1)
  { trainNumber: '12309', stationCode: 'PNBE', sequence: 1, arrivalMinutes: null, departureMinutes: t(19, 10), dayOffset: 0 },
  { trainNumber: '12309', stationCode: 'DDU', sequence: 2, arrivalMinutes: t(22, 12), departureMinutes: t(22, 22), dayOffset: 0 },
  { trainNumber: '12309', stationCode: 'PRYJ', sequence: 3, arrivalMinutes: t(0, 10), departureMinutes: t(0, 12), dayOffset: 1 },
  { trainNumber: '12309', stationCode: 'CNB', sequence: 4, arrivalMinutes: t(2, 15), departureMinutes: t(2, 20), dayOffset: 1 },
  { trainNumber: '12309', stationCode: 'NDLS', sequence: 5, arrivalMinutes: t(7, 40), departureMinutes: null, dayOffset: 1 },

  // 12393 Sampoorna Kranti: PNBE 19:25 (d0) -> DDU 22:25/22:35 (d0) -> CNB 02:30/02:35 (d1) -> NDLS 07:55 (d1)
  { trainNumber: '12393', stationCode: 'PNBE', sequence: 1, arrivalMinutes: null, departureMinutes: t(19, 25), dayOffset: 0 },
  { trainNumber: '12393', stationCode: 'DDU', sequence: 2, arrivalMinutes: t(22, 25), departureMinutes: t(22, 35), dayOffset: 0 },
  { trainNumber: '12393', stationCode: 'CNB', sequence: 3, arrivalMinutes: t(2, 30), departureMinutes: t(2, 35), dayOffset: 1 },
  { trainNumber: '12393', stationCode: 'NDLS', sequence: 4, arrivalMinutes: t(7, 55), departureMinutes: null, dayOffset: 1 },

  // 12301 Howrah Rajdhani: HWH 16:50 (d0) -> GAYA 22:35/22:40 (d0) -> DDU 00:45/00:55 (d1) -> PRYJ 02:40/02:45 (d1) -> CNB 04:50/04:55 (d1) -> NDLS 10:05 (d1)
  { trainNumber: '12301', stationCode: 'HWH', sequence: 1, arrivalMinutes: null, departureMinutes: t(16, 50), dayOffset: 0 },
  { trainNumber: '12301', stationCode: 'GAYA', sequence: 2, arrivalMinutes: t(22, 35), departureMinutes: t(22, 40), dayOffset: 0 },
  { trainNumber: '12301', stationCode: 'DDU', sequence: 3, arrivalMinutes: t(0, 45), departureMinutes: t(0, 55), dayOffset: 1 },
  { trainNumber: '12301', stationCode: 'PRYJ', sequence: 4, arrivalMinutes: t(2, 40), departureMinutes: t(2, 45), dayOffset: 1 },
  { trainNumber: '12301', stationCode: 'CNB', sequence: 5, arrivalMinutes: t(4, 50), departureMinutes: t(4, 55), dayOffset: 1 },
  { trainNumber: '12301', stationCode: 'NDLS', sequence: 6, arrivalMinutes: t(10, 5), departureMinutes: null, dayOffset: 1 },

  // 12313 Sealdah Rajdhani: SDAH 16:50 (d0) -> DDU 01:05/01:15 (d1) -> CNB 05:15/05:20 (d1) -> NDLS 10:30 (d1)
  { trainNumber: '12313', stationCode: 'SDAH', sequence: 1, arrivalMinutes: null, departureMinutes: t(16, 50), dayOffset: 0 },
  { trainNumber: '12313', stationCode: 'DDU', sequence: 2, arrivalMinutes: t(1, 5), departureMinutes: t(1, 15), dayOffset: 1 },
  { trainNumber: '12313', stationCode: 'CNB', sequence: 3, arrivalMinutes: t(5, 15), departureMinutes: t(5, 20), dayOffset: 1 },
  { trainNumber: '12313', stationCode: 'NDLS', sequence: 4, arrivalMinutes: t(10, 30), departureMinutes: null, dayOffset: 1 },

  // 12423 Dibrugarh-NDLS Rajdhani: GHY 07:00 (d0) -> NJP 13:15/13:25 (d0) -> PNBE 21:40/21:50 (d0) -> DDU 00:55/01:05 (d1) -> CNB 05:00/05:05 (d1) -> NDLS 10:30 (d1)
  { trainNumber: '12423', stationCode: 'GHY', sequence: 1, arrivalMinutes: null, departureMinutes: t(7, 0), dayOffset: 0 },
  { trainNumber: '12423', stationCode: 'NJP', sequence: 2, arrivalMinutes: t(13, 15), departureMinutes: t(13, 25), dayOffset: 0 },
  { trainNumber: '12423', stationCode: 'PNBE', sequence: 3, arrivalMinutes: t(21, 40), departureMinutes: t(21, 50), dayOffset: 0 },
  { trainNumber: '12423', stationCode: 'DDU', sequence: 4, arrivalMinutes: t(0, 55), departureMinutes: t(1, 5), dayOffset: 1 },
  { trainNumber: '12423', stationCode: 'CNB', sequence: 5, arrivalMinutes: t(5, 0), departureMinutes: t(5, 5), dayOffset: 1 },
  { trainNumber: '12423', stationCode: 'NDLS', sequence: 6, arrivalMinutes: t(10, 30), departureMinutes: null, dayOffset: 1 },

  // 12505 North East Express: GHY 12:40 (d0) -> NJP 19:50/20:00 (d0) -> PNBE 05:35/05:45 (d1) -> CNB 15:00/15:05 (d1) -> ANVT 21:50 (d1)
  { trainNumber: '12505', stationCode: 'GHY', sequence: 1, arrivalMinutes: null, departureMinutes: t(12, 40), dayOffset: 0 },
  { trainNumber: '12505', stationCode: 'NJP', sequence: 2, arrivalMinutes: t(19, 50), departureMinutes: t(20, 0), dayOffset: 0 },
  { trainNumber: '12505', stationCode: 'PNBE', sequence: 3, arrivalMinutes: t(5, 35), departureMinutes: t(5, 45), dayOffset: 1 },
  { trainNumber: '12505', stationCode: 'CNB', sequence: 4, arrivalMinutes: t(15, 0), departureMinutes: t(15, 5), dayOffset: 1 },
  { trainNumber: '12505', stationCode: 'ANVT', sequence: 5, arrivalMinutes: t(21, 50), departureMinutes: null, dayOffset: 1 },

  // 22823 Bhubaneswar Rajdhani: BBS 09:30 (d0) -> GAYA 22:00/22:05 (d0) -> CNB 04:40/04:45 (d1) -> NDLS 09:55 (d1)
  { trainNumber: '22823', stationCode: 'BBS', sequence: 1, arrivalMinutes: null, departureMinutes: t(9, 30), dayOffset: 0 },
  { trainNumber: '22823', stationCode: 'GAYA', sequence: 2, arrivalMinutes: t(22, 0), departureMinutes: t(22, 5), dayOffset: 0 },
  { trainNumber: '22823', stationCode: 'CNB', sequence: 3, arrivalMinutes: t(4, 40), departureMinutes: t(4, 45), dayOffset: 1 },
  { trainNumber: '22823', stationCode: 'NDLS', sequence: 4, arrivalMinutes: t(9, 55), departureMinutes: null, dayOffset: 1 },

  // 12453 Ranchi Rajdhani: RNC 17:15 (d0) -> DDU 01:15/01:25 (d1) -> CNB 05:25/05:30 (d1) -> NDLS 11:10 (d1)
  { trainNumber: '12453', stationCode: 'RNC', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 15), dayOffset: 0 },
  { trainNumber: '12453', stationCode: 'DDU', sequence: 2, arrivalMinutes: t(1, 15), departureMinutes: t(1, 25), dayOffset: 1 },
  { trainNumber: '12453', stationCode: 'CNB', sequence: 3, arrivalMinutes: t(5, 25), departureMinutes: t(5, 30), dayOffset: 1 },
  { trainNumber: '12453', stationCode: 'NDLS', sequence: 4, arrivalMinutes: t(11, 10), departureMinutes: null, dayOffset: 1 },

  // 12015 Ajmer Shatabdi: NDLS 06:10 -> JP 10:40
  { trainNumber: '12015', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 10), dayOffset: 0 },
  { trainNumber: '12015', stationCode: 'JP', sequence: 2, arrivalMinutes: t(10, 40), departureMinutes: null, dayOffset: 0 },

  // 12985 Jaipur Double Decker: DEE 17:35 -> JP 22:05
  { trainNumber: '12985', stationCode: 'DEE', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 35), dayOffset: 0 },
  { trainNumber: '12985', stationCode: 'JP', sequence: 2, arrivalMinutes: t(22, 5), departureMinutes: null, dayOffset: 0 },

  // 12414 Pooja SF Express: JAT 18:15 (d0) -> DLI 04:15/04:30 (d1) -> JP 09:40 (d1)
  { trainNumber: '12414', stationCode: 'JAT', sequence: 1, arrivalMinutes: null, departureMinutes: t(18, 15), dayOffset: 0 },
  { trainNumber: '12414', stationCode: 'DLI', sequence: 2, arrivalMinutes: t(4, 15), departureMinutes: t(4, 30), dayOffset: 1 },
  { trainNumber: '12414', stationCode: 'JP', sequence: 3, arrivalMinutes: t(9, 40), departureMinutes: null, dayOffset: 1 },

  // 12461 Mandore Express: DLI 21:20 (d0) -> JP 02:35/02:45 (d1) -> JU 07:45 (d1)
  { trainNumber: '12461', stationCode: 'DLI', sequence: 1, arrivalMinutes: null, departureMinutes: t(21, 20), dayOffset: 0 },
  { trainNumber: '12461', stationCode: 'JP', sequence: 2, arrivalMinutes: t(2, 35), departureMinutes: t(2, 45), dayOffset: 1 },
  { trainNumber: '12461', stationCode: 'JU', sequence: 3, arrivalMinutes: t(7, 45), departureMinutes: null, dayOffset: 1 },

  // 12957 Swarna Jayanti Rajdhani: ADI 18:45 (d0) -> JP 02:55/03:05 (d1) -> NDLS 07:30 (d1)
  { trainNumber: '12957', stationCode: 'ADI', sequence: 1, arrivalMinutes: null, departureMinutes: t(18, 45), dayOffset: 0 },
  { trainNumber: '12957', stationCode: 'JP', sequence: 2, arrivalMinutes: t(2, 55), departureMinutes: t(3, 5), dayOffset: 1 },
  { trainNumber: '12957', stationCode: 'NDLS', sequence: 3, arrivalMinutes: t(7, 30), departureMinutes: null, dayOffset: 1 },

  // 12915 Ashram Express: ADI 19:20 (d0) -> JP 04:20/04:30 (d1) -> DLI 10:00 (d1)
  { trainNumber: '12915', stationCode: 'ADI', sequence: 1, arrivalMinutes: null, departureMinutes: t(19, 20), dayOffset: 0 },
  { trainNumber: '12915', stationCode: 'JP', sequence: 2, arrivalMinutes: t(4, 20), departureMinutes: t(4, 30), dayOffset: 1 },
  { trainNumber: '12915', stationCode: 'DLI', sequence: 3, arrivalMinutes: t(10, 0), departureMinutes: null, dayOffset: 1 },

  // 12951 Mumbai Tejas Rajdhani: MMCT 17:00 (d0) -> ST 19:45/19:50 (d0) -> BRC 21:05/21:15 (d0) -> NDLS 08:32 (d1)
  { trainNumber: '12951', stationCode: 'MMCT', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 0), dayOffset: 0 },
  { trainNumber: '12951', stationCode: 'ST', sequence: 2, arrivalMinutes: t(19, 45), departureMinutes: t(19, 50), dayOffset: 0 },
  { trainNumber: '12951', stationCode: 'BRC', sequence: 3, arrivalMinutes: t(21, 5), departureMinutes: t(21, 15), dayOffset: 0 },
  { trainNumber: '12951', stationCode: 'NDLS', sequence: 4, arrivalMinutes: t(8, 32), departureMinutes: null, dayOffset: 1 },

  // 12953 August Kranti Rajdhani: MMCT 17:10 (d0) -> ST 20:05/20:10 (d0) -> BRC 21:35/21:45 (d0) -> NZM 09:43 (d1)
  { trainNumber: '12953', stationCode: 'MMCT', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 10), dayOffset: 0 },
  { trainNumber: '12953', stationCode: 'ST', sequence: 2, arrivalMinutes: t(20, 5), departureMinutes: t(20, 10), dayOffset: 0 },
  { trainNumber: '12953', stationCode: 'BRC', sequence: 3, arrivalMinutes: t(21, 35), departureMinutes: t(21, 45), dayOffset: 0 },
  { trainNumber: '12953', stationCode: 'NZM', sequence: 4, arrivalMinutes: t(9, 43), departureMinutes: null, dayOffset: 1 },

  // 12903 Golden Temple Mail: MMCT 18:45 (d0) -> ST 22:00/22:05 (d0) -> BRC 23:40/23:50 (d0) -> NZM 13:50/14:05 (d1) -> ASR 23:45 (d1)
  { trainNumber: '12903', stationCode: 'MMCT', sequence: 1, arrivalMinutes: null, departureMinutes: t(18, 45), dayOffset: 0 },
  { trainNumber: '12903', stationCode: 'ST', sequence: 2, arrivalMinutes: t(22, 0), departureMinutes: t(22, 5), dayOffset: 0 },
  { trainNumber: '12903', stationCode: 'BRC', sequence: 3, arrivalMinutes: t(23, 40), departureMinutes: t(23, 50), dayOffset: 0 },
  { trainNumber: '12903', stationCode: 'NZM', sequence: 4, arrivalMinutes: t(13, 50), departureMinutes: t(14, 5), dayOffset: 1 },
  { trainNumber: '12903', stationCode: 'ASR', sequence: 5, arrivalMinutes: t(23, 45), departureMinutes: null, dayOffset: 1 },

  // 12263 Pune-NZM Duronto: PUNE 11:10 (d0) -> BRC 19:20/19:30 (d0) -> NZM 06:45 (d1)
  { trainNumber: '12263', stationCode: 'PUNE', sequence: 1, arrivalMinutes: null, departureMinutes: t(11, 10), dayOffset: 0 },
  { trainNumber: '12263', stationCode: 'BRC', sequence: 2, arrivalMinutes: t(19, 20), departureMinutes: t(19, 30), dayOffset: 0 },
  { trainNumber: '12263', stationCode: 'NZM', sequence: 3, arrivalMinutes: t(6, 45), departureMinutes: null, dayOffset: 1 },

  // 12002 Bhopal Shatabdi: NDLS 06:00 -> AGC 07:50/07:55 -> GWL 09:10/09:15 -> VGLJ 10:25/10:30 -> BPL 14:25
  { trainNumber: '12002', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 0), dayOffset: 0 },
  { trainNumber: '12002', stationCode: 'AGC', sequence: 2, arrivalMinutes: t(7, 50), departureMinutes: t(7, 55), dayOffset: 0 },
  { trainNumber: '12002', stationCode: 'GWL', sequence: 3, arrivalMinutes: t(9, 10), departureMinutes: t(9, 15), dayOffset: 0 },
  { trainNumber: '12002', stationCode: 'VGLJ', sequence: 4, arrivalMinutes: t(10, 25), departureMinutes: t(10, 30), dayOffset: 0 },
  { trainNumber: '12002', stationCode: 'BPL', sequence: 5, arrivalMinutes: t(14, 25), departureMinutes: null, dayOffset: 0 },

  // 12155 Bhopal Express: BPL 22:30 (d0) -> VGLJ 02:10/02:15 (d1) -> AGC 05:15/05:20 (d1) -> NZM 08:10 (d1)
  { trainNumber: '12155', stationCode: 'BPL', sequence: 1, arrivalMinutes: null, departureMinutes: t(22, 30), dayOffset: 0 },
  { trainNumber: '12155', stationCode: 'VGLJ', sequence: 2, arrivalMinutes: t(2, 10), departureMinutes: t(2, 15), dayOffset: 1 },
  { trainNumber: '12155', stationCode: 'AGC', sequence: 3, arrivalMinutes: t(5, 15), departureMinutes: t(5, 20), dayOffset: 1 },
  { trainNumber: '12155', stationCode: 'NZM', sequence: 4, arrivalMinutes: t(8, 10), departureMinutes: null, dayOffset: 1 },

  // 12621 Tamil Nadu Express: MAS 22:00 (d0) -> BZA 04:15/04:25 (d1) -> NGP 13:55/14:05 (d1) -> BPL 19:20/19:30 (d1) -> VGLJ 23:30/23:38 (d1) -> NDLS 06:35 (d2)
  { trainNumber: '12621', stationCode: 'MAS', sequence: 1, arrivalMinutes: null, departureMinutes: t(22, 0), dayOffset: 0 },
  { trainNumber: '12621', stationCode: 'BZA', sequence: 2, arrivalMinutes: t(4, 15), departureMinutes: t(4, 25), dayOffset: 1 },
  { trainNumber: '12621', stationCode: 'NGP', sequence: 3, arrivalMinutes: t(13, 55), departureMinutes: t(14, 5), dayOffset: 1 },
  { trainNumber: '12621', stationCode: 'BPL', sequence: 4, arrivalMinutes: t(19, 20), departureMinutes: t(19, 30), dayOffset: 1 },
  { trainNumber: '12621', stationCode: 'VGLJ', sequence: 5, arrivalMinutes: t(23, 30), departureMinutes: t(23, 38), dayOffset: 1 },
  { trainNumber: '12621', stationCode: 'NDLS', sequence: 6, arrivalMinutes: t(6, 35), departureMinutes: null, dayOffset: 2 },

  // 12433 Chennai Rajdhani: MAS 06:05 (d0) -> BZA 11:45/11:55 (d0) -> NGP 20:45/20:50 (d0) -> BPL 02:15/02:20 (d1) -> NZM 10:30 (d1)
  { trainNumber: '12433', stationCode: 'MAS', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 5), dayOffset: 0 },
  { trainNumber: '12433', stationCode: 'BZA', sequence: 2, arrivalMinutes: t(11, 45), departureMinutes: t(11, 55), dayOffset: 0 },
  { trainNumber: '12433', stationCode: 'NGP', sequence: 3, arrivalMinutes: t(20, 45), departureMinutes: t(20, 50), dayOffset: 0 },
  { trainNumber: '12433', stationCode: 'BPL', sequence: 4, arrivalMinutes: t(2, 15), departureMinutes: t(2, 20), dayOffset: 1 },
  { trainNumber: '12433', stationCode: 'NZM', sequence: 5, arrivalMinutes: t(10, 30), departureMinutes: null, dayOffset: 1 },

  // 12723 Telangana Express: HYB 06:25 (d0) -> SC 06:50/07:00 (d0) -> NGP 15:25/15:30 (d0) -> BPL 21:05/21:15 (d0) -> NDLS 08:00 (d1)
  { trainNumber: '12723', stationCode: 'HYB', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 25), dayOffset: 0 },
  { trainNumber: '12723', stationCode: 'SC', sequence: 2, arrivalMinutes: t(6, 50), departureMinutes: t(7, 0), dayOffset: 0 },
  { trainNumber: '12723', stationCode: 'NGP', sequence: 3, arrivalMinutes: t(15, 25), departureMinutes: t(15, 30), dayOffset: 0 },
  { trainNumber: '12723', stationCode: 'BPL', sequence: 4, arrivalMinutes: t(21, 5), departureMinutes: t(21, 15), dayOffset: 0 },
  { trainNumber: '12723', stationCode: 'NDLS', sequence: 5, arrivalMinutes: t(8, 0), departureMinutes: null, dayOffset: 1 },

  // 22691 Bengaluru Rajdhani: SBC 20:00 (d0) -> SC 07:10/07:20 (d1) -> NGP 16:00/16:05 (d1) -> BPL 21:20/21:25 (d1) -> NZM 05:30 (d2)
  { trainNumber: '22691', stationCode: 'SBC', sequence: 1, arrivalMinutes: null, departureMinutes: t(20, 0), dayOffset: 0 },
  { trainNumber: '22691', stationCode: 'SC', sequence: 2, arrivalMinutes: t(7, 10), departureMinutes: t(7, 20), dayOffset: 1 },
  { trainNumber: '22691', stationCode: 'NGP', sequence: 3, arrivalMinutes: t(16, 0), departureMinutes: t(16, 5), dayOffset: 1 },
  { trainNumber: '22691', stationCode: 'BPL', sequence: 4, arrivalMinutes: t(21, 20), departureMinutes: t(21, 25), dayOffset: 1 },
  { trainNumber: '22691', stationCode: 'NZM', sequence: 5, arrivalMinutes: t(5, 30), departureMinutes: null, dayOffset: 2 },

  // 12625 Kerala Express: TVC 12:30 (d0) -> ERS 16:30/16:35 (d0) -> CBE 20:10/20:15 (d0) -> BZA 08:50/09:00 (d1) -> NGP 19:20/19:25 (d1) -> BPL 01:00/01:10 (d2) -> NDLS 13:15 (d2)
  { trainNumber: '12625', stationCode: 'TVC', sequence: 1, arrivalMinutes: null, departureMinutes: t(12, 30), dayOffset: 0 },
  { trainNumber: '12625', stationCode: 'ERS', sequence: 2, arrivalMinutes: t(16, 30), departureMinutes: t(16, 35), dayOffset: 0 },
  { trainNumber: '12625', stationCode: 'CBE', sequence: 3, arrivalMinutes: t(20, 10), departureMinutes: t(20, 15), dayOffset: 0 },
  { trainNumber: '12625', stationCode: 'BZA', sequence: 4, arrivalMinutes: t(8, 50), departureMinutes: t(9, 0), dayOffset: 1 },
  { trainNumber: '12625', stationCode: 'NGP', sequence: 5, arrivalMinutes: t(19, 20), departureMinutes: t(19, 25), dayOffset: 1 },
  { trainNumber: '12625', stationCode: 'BPL', sequence: 6, arrivalMinutes: t(1, 0), departureMinutes: t(1, 10), dayOffset: 2 },
  { trainNumber: '12625', stationCode: 'NDLS', sequence: 7, arrivalMinutes: t(13, 15), departureMinutes: null, dayOffset: 2 },

  // 12431 Trivandrum Rajdhani: TVC 19:15 (d0) -> ERS 22:30/22:35 (d0) -> MAO 09:40/09:50 (d1) -> BRC 00:50/01:00 (d2) -> NZM 12:30 (d2)
  { trainNumber: '12431', stationCode: 'TVC', sequence: 1, arrivalMinutes: null, departureMinutes: t(19, 15), dayOffset: 0 },
  { trainNumber: '12431', stationCode: 'ERS', sequence: 2, arrivalMinutes: t(22, 30), departureMinutes: t(22, 35), dayOffset: 0 },
  { trainNumber: '12431', stationCode: 'MAO', sequence: 3, arrivalMinutes: t(9, 40), departureMinutes: t(9, 50), dayOffset: 1 },
  { trainNumber: '12431', stationCode: 'BRC', sequence: 4, arrivalMinutes: t(0, 50), departureMinutes: t(1, 0), dayOffset: 2 },
  { trainNumber: '12431', stationCode: 'NZM', sequence: 5, arrivalMinutes: t(12, 30), departureMinutes: null, dayOffset: 2 },

  // 12123 Deccan Queen: CSMT 17:10 -> PUNE 20:25
  { trainNumber: '12123', stationCode: 'CSMT', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 10), dayOffset: 0 },
  { trainNumber: '12123', stationCode: 'PUNE', sequence: 2, arrivalMinutes: t(20, 25), departureMinutes: null, dayOffset: 0 },

  // 12127 Mumbai-Pune Intercity: CSMT 06:40 -> PUNE 09:55
  { trainNumber: '12127', stationCode: 'CSMT', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 40), dayOffset: 0 },
  { trainNumber: '12127', stationCode: 'PUNE', sequence: 2, arrivalMinutes: t(9, 55), departureMinutes: null, dayOffset: 0 },

  // 12009 Ahmedabad Shatabdi: MMCT 06:20 -> ST 09:15/09:20 -> BRC 10:45/10:50 -> ADI 12:45
  { trainNumber: '12009', stationCode: 'MMCT', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 20), dayOffset: 0 },
  { trainNumber: '12009', stationCode: 'ST', sequence: 2, arrivalMinutes: t(9, 15), departureMinutes: t(9, 20), dayOffset: 0 },
  { trainNumber: '12009', stationCode: 'BRC', sequence: 3, arrivalMinutes: t(10, 45), departureMinutes: t(10, 50), dayOffset: 0 },
  { trainNumber: '12009', stationCode: 'ADI', sequence: 4, arrivalMinutes: t(12, 45), departureMinutes: null, dayOffset: 0 },

  // 12901 Gujarat Mail: MMCT 21:40 (d0) -> ST 01:05/01:10 (d1) -> BRC 02:55/03:05 (d1) -> ADI 05:25 (d1)
  { trainNumber: '12901', stationCode: 'MMCT', sequence: 1, arrivalMinutes: null, departureMinutes: t(21, 40), dayOffset: 0 },
  { trainNumber: '12901', stationCode: 'ST', sequence: 2, arrivalMinutes: t(1, 5), departureMinutes: t(1, 10), dayOffset: 1 },
  { trainNumber: '12901', stationCode: 'BRC', sequence: 3, arrivalMinutes: t(2, 55), departureMinutes: t(3, 5), dayOffset: 1 },
  { trainNumber: '12901', stationCode: 'ADI', sequence: 4, arrivalMinutes: t(5, 25), departureMinutes: null, dayOffset: 1 },

  // 12101 Jnaneswari Express: LTT 20:35 (d0) -> NGP 09:10/09:20 (d1) -> HWH 03:45 (d2)
  { trainNumber: '12101', stationCode: 'LTT', sequence: 1, arrivalMinutes: null, departureMinutes: t(20, 35), dayOffset: 0 },
  { trainNumber: '12101', stationCode: 'NGP', sequence: 2, arrivalMinutes: t(9, 10), departureMinutes: t(9, 20), dayOffset: 1 },
  { trainNumber: '12101', stationCode: 'HWH', sequence: 3, arrivalMinutes: t(3, 45), departureMinutes: null, dayOffset: 2 },

  // 12261 Howrah Duronto: CSMT 17:15 (d0) -> NGP 04:15/04:20 (d1) -> HWH 20:15 (d1)
  { trainNumber: '12261', stationCode: 'CSMT', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 15), dayOffset: 0 },
  { trainNumber: '12261', stationCode: 'NGP', sequence: 2, arrivalMinutes: t(4, 15), departureMinutes: t(4, 20), dayOffset: 1 },
  { trainNumber: '12261', stationCode: 'HWH', sequence: 3, arrivalMinutes: t(20, 15), departureMinutes: null, dayOffset: 1 },

  // 11301 Udyan Express: CSMT 08:10 (d0) -> PUNE 11:45/11:55 (d0) -> SBC 05:45 (d1)
  { trainNumber: '11301', stationCode: 'CSMT', sequence: 1, arrivalMinutes: null, departureMinutes: t(8, 10), dayOffset: 0 },
  { trainNumber: '11301', stationCode: 'PUNE', sequence: 2, arrivalMinutes: t(11, 45), departureMinutes: t(11, 55), dayOffset: 0 },
  { trainNumber: '11301', stationCode: 'SBC', sequence: 3, arrivalMinutes: t(5, 45), departureMinutes: null, dayOffset: 1 },

  // 12163 Chennai Express: LTT 18:45 (d0) -> PUNE 22:20/22:25 (d0) -> MAS 16:30 (d1)
  { trainNumber: '12163', stationCode: 'LTT', sequence: 1, arrivalMinutes: null, departureMinutes: t(18, 45), dayOffset: 0 },
  { trainNumber: '12163', stationCode: 'PUNE', sequence: 2, arrivalMinutes: t(22, 20), departureMinutes: t(22, 25), dayOffset: 0 },
  { trainNumber: '12163', stationCode: 'MAS', sequence: 3, arrivalMinutes: t(16, 30), departureMinutes: null, dayOffset: 1 },

  // 10103 Mandovi Express: CSMT 07:10 -> MAO 18:45
  { trainNumber: '10103', stationCode: 'CSMT', sequence: 1, arrivalMinutes: null, departureMinutes: t(7, 10), dayOffset: 0 },
  { trainNumber: '10103', stationCode: 'MAO', sequence: 2, arrivalMinutes: t(18, 45), departureMinutes: null, dayOffset: 0 },

  // 12701 Hussainsagar Express: CSMT 21:50 (d0) -> PUNE 01:25/01:30 (d1) -> HYB 11:45 (d1)
  { trainNumber: '12701', stationCode: 'CSMT', sequence: 1, arrivalMinutes: null, departureMinutes: t(21, 50), dayOffset: 0 },
  { trainNumber: '12701', stationCode: 'PUNE', sequence: 2, arrivalMinutes: t(1, 25), departureMinutes: t(1, 30), dayOffset: 1 },
  { trainNumber: '12701', stationCode: 'HYB', sequence: 3, arrivalMinutes: t(11, 45), departureMinutes: null, dayOffset: 1 },

  // 12839 Howrah-Chennai Mail: HWH 23:55 (d0) -> BBS 06:30/06:40 (d1) -> VSKP 13:45/14:05 (d1) -> BZA 19:50/20:00 (d1) -> MAS 03:20 (d2)
  { trainNumber: '12839', stationCode: 'HWH', sequence: 1, arrivalMinutes: null, departureMinutes: t(23, 55), dayOffset: 0 },
  { trainNumber: '12839', stationCode: 'BBS', sequence: 2, arrivalMinutes: t(6, 30), departureMinutes: t(6, 40), dayOffset: 1 },
  { trainNumber: '12839', stationCode: 'VSKP', sequence: 3, arrivalMinutes: t(13, 45), departureMinutes: t(14, 5), dayOffset: 1 },
  { trainNumber: '12839', stationCode: 'BZA', sequence: 4, arrivalMinutes: t(19, 50), departureMinutes: t(20, 0), dayOffset: 1 },
  { trainNumber: '12839', stationCode: 'MAS', sequence: 5, arrivalMinutes: t(3, 20), departureMinutes: null, dayOffset: 2 },

  // 12841 Coromandel Express: HWH 15:20 (d0) -> BBS 21:30/21:40 (d0) -> VSKP 04:15/04:35 (d1) -> BZA 10:00/10:10 (d1) -> MAS 17:00 (d1)
  { trainNumber: '12841', stationCode: 'HWH', sequence: 1, arrivalMinutes: null, departureMinutes: t(15, 20), dayOffset: 0 },
  { trainNumber: '12841', stationCode: 'BBS', sequence: 2, arrivalMinutes: t(21, 30), departureMinutes: t(21, 40), dayOffset: 0 },
  { trainNumber: '12841', stationCode: 'VSKP', sequence: 3, arrivalMinutes: t(4, 15), departureMinutes: t(4, 35), dayOffset: 1 },
  { trainNumber: '12841', stationCode: 'BZA', sequence: 4, arrivalMinutes: t(10, 0), departureMinutes: t(10, 10), dayOffset: 1 },
  { trainNumber: '12841', stationCode: 'MAS', sequence: 5, arrivalMinutes: t(17, 0), departureMinutes: null, dayOffset: 1 },

  // 12245 Howrah-SMVB Duronto: HWH 10:50 (d0) -> BBS 16:40/16:45 (d0) -> VSKP 22:55/23:10 (d0) -> BZA 04:20/04:30 (d1) -> SMVB 16:00 (d1)
  { trainNumber: '12245', stationCode: 'HWH', sequence: 1, arrivalMinutes: null, departureMinutes: t(10, 50), dayOffset: 0 },
  { trainNumber: '12245', stationCode: 'BBS', sequence: 2, arrivalMinutes: t(16, 40), departureMinutes: t(16, 45), dayOffset: 0 },
  { trainNumber: '12245', stationCode: 'VSKP', sequence: 3, arrivalMinutes: t(22, 55), departureMinutes: t(23, 10), dayOffset: 0 },
  { trainNumber: '12245', stationCode: 'BZA', sequence: 4, arrivalMinutes: t(4, 20), departureMinutes: t(4, 30), dayOffset: 1 },
  { trainNumber: '12245', stationCode: 'SMVB', sequence: 5, arrivalMinutes: t(16, 0), departureMinutes: null, dayOffset: 1 },

  // 12860 Gitanjali Express: HWH 14:05 (d0) -> NGP 07:10/07:20 (d1) -> CSMT 21:20 (d1)
  { trainNumber: '12860', stationCode: 'HWH', sequence: 1, arrivalMinutes: null, departureMinutes: t(14, 5), dayOffset: 0 },
  { trainNumber: '12860', stationCode: 'NGP', sequence: 2, arrivalMinutes: t(7, 10), departureMinutes: t(7, 20), dayOffset: 1 },
  { trainNumber: '12860', stationCode: 'CSMT', sequence: 3, arrivalMinutes: t(21, 20), departureMinutes: null, dayOffset: 1 },

  // 12510 Guwahati-SMVB Express: GHY 06:20 (d0) -> NJP 13:50/14:00 (d0) -> HWH 00:35/00:50 (d1) -> BBS 07:30/07:40 (d1) -> VSKP 14:10/14:30 (d1) -> SMVB 10:15 (d2)
  { trainNumber: '12510', stationCode: 'GHY', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 20), dayOffset: 0 },
  { trainNumber: '12510', stationCode: 'NJP', sequence: 2, arrivalMinutes: t(13, 50), departureMinutes: t(14, 0), dayOffset: 0 },
  { trainNumber: '12510', stationCode: 'HWH', sequence: 3, arrivalMinutes: t(0, 35), departureMinutes: t(0, 50), dayOffset: 1 },
  { trainNumber: '12510', stationCode: 'BBS', sequence: 4, arrivalMinutes: t(7, 30), departureMinutes: t(7, 40), dayOffset: 1 },
  { trainNumber: '12510', stationCode: 'VSKP', sequence: 5, arrivalMinutes: t(14, 10), departureMinutes: t(14, 30), dayOffset: 1 },
  { trainNumber: '12510', stationCode: 'SMVB', sequence: 6, arrivalMinutes: t(10, 15), departureMinutes: null, dayOffset: 2 },

  // 12007 Mysuru Shatabdi: MAS 06:00 -> SBC 10:55
  { trainNumber: '12007', stationCode: 'MAS', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 0), dayOffset: 0 },
  { trainNumber: '12007', stationCode: 'SBC', sequence: 2, arrivalMinutes: t(10, 55), departureMinutes: null, dayOffset: 0 },

  // 12607 Lalbagh Express: MAS 15:30 -> SBC 21:35
  { trainNumber: '12607', stationCode: 'MAS', sequence: 1, arrivalMinutes: null, departureMinutes: t(15, 30), dayOffset: 0 },
  { trainNumber: '12607', stationCode: 'SBC', sequence: 2, arrivalMinutes: t(21, 35), departureMinutes: null, dayOffset: 0 },

  // 12677 Ernakulam Intercity: SBC 06:10 -> CBE 13:10/13:15 -> ERS 16:55
  { trainNumber: '12677', stationCode: 'SBC', sequence: 1, arrivalMinutes: null, departureMinutes: t(6, 10), dayOffset: 0 },
  { trainNumber: '12677', stationCode: 'CBE', sequence: 2, arrivalMinutes: t(13, 10), departureMinutes: t(13, 15), dayOffset: 0 },
  { trainNumber: '12677', stationCode: 'ERS', sequence: 3, arrivalMinutes: t(16, 55), departureMinutes: null, dayOffset: 0 },

  // 12759 Charminar Express: MS 18:10 (d0) -> BZA 00:45/00:55 (d1) -> SC 06:25 -> HYB 07:05 (d1)
  { trainNumber: '12759', stationCode: 'MS', sequence: 1, arrivalMinutes: null, departureMinutes: t(18, 10), dayOffset: 0 },
  { trainNumber: '12759', stationCode: 'BZA', sequence: 2, arrivalMinutes: t(0, 45), departureMinutes: t(0, 55), dayOffset: 1 },
  { trainNumber: '12759', stationCode: 'SC', sequence: 3, arrivalMinutes: t(6, 25), departureMinutes: t(6, 30), dayOffset: 1 },
  { trainNumber: '12759', stationCode: 'HYB', sequence: 4, arrivalMinutes: t(7, 5), departureMinutes: null, dayOffset: 1 },

  // 12785 Kacheguda-SBC Express: KCG 19:05 (d0) -> SBC 06:25 (d1)
  { trainNumber: '12785', stationCode: 'KCG', sequence: 1, arrivalMinutes: null, departureMinutes: t(19, 5), dayOffset: 0 },
  { trainNumber: '12785', stationCode: 'SBC', sequence: 2, arrivalMinutes: t(6, 25), departureMinutes: null, dayOffset: 1 },

  // 12213 YPR-DEE Duronto: YPR 23:40 (d0) -> SC 10:15/10:25 (d1) -> BPL 00:10/00:20 (d2) -> DEE 07:55 (d2)
  { trainNumber: '12213', stationCode: 'YPR', sequence: 1, arrivalMinutes: null, departureMinutes: t(23, 40), dayOffset: 0 },
  { trainNumber: '12213', stationCode: 'SC', sequence: 2, arrivalMinutes: t(10, 15), departureMinutes: t(10, 25), dayOffset: 1 },
  { trainNumber: '12213', stationCode: 'BPL', sequence: 3, arrivalMinutes: t(0, 10), departureMinutes: t(0, 20), dayOffset: 2 },
  { trainNumber: '12213', stationCode: 'DEE', sequence: 4, arrivalMinutes: t(7, 55), departureMinutes: null, dayOffset: 2 },

  // 12952 NDLS-Mumbai Tejas Rajdhani: NDLS 16:55 (d0) -> BRC 03:50/04:00 (d1) -> ST 05:30/05:35 (d1) -> MMCT 08:35 (d1)
  { trainNumber: '12952', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(16, 55), dayOffset: 0 },
  { trainNumber: '12952', stationCode: 'BRC', sequence: 2, arrivalMinutes: t(3, 50), departureMinutes: t(4, 0), dayOffset: 1 },
  { trainNumber: '12952', stationCode: 'ST', sequence: 3, arrivalMinutes: t(5, 30), departureMinutes: t(5, 35), dayOffset: 1 },
  { trainNumber: '12952', stationCode: 'MMCT', sequence: 4, arrivalMinutes: t(8, 35), departureMinutes: null, dayOffset: 1 },

  // 12958 NDLS-ADI Swarna Jayanti Rajdhani: NDLS 19:55 (d0) -> JP 00:25/00:35 (d1) -> ADI 09:40 (d1)
  { trainNumber: '12958', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(19, 55), dayOffset: 0 },
  { trainNumber: '12958', stationCode: 'JP', sequence: 2, arrivalMinutes: t(0, 25), departureMinutes: t(0, 35), dayOffset: 1 },
  { trainNumber: '12958', stationCode: 'ADI', sequence: 3, arrivalMinutes: t(9, 40), departureMinutes: null, dayOffset: 1 },

  // 12310 NDLS-Patna Rajdhani: NDLS 17:10 (d0) -> CNB 21:50/21:55 (d0) -> PRYJ 00:05/00:07 (d1) -> DDU 02:00/02:10 (d1) -> PNBE 05:00 (d1)
  { trainNumber: '12310', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(17, 10), dayOffset: 0 },
  { trainNumber: '12310', stationCode: 'CNB', sequence: 2, arrivalMinutes: t(21, 50), departureMinutes: t(21, 55), dayOffset: 0 },
  { trainNumber: '12310', stationCode: 'PRYJ', sequence: 3, arrivalMinutes: t(0, 5), departureMinutes: t(0, 7), dayOffset: 1 },
  { trainNumber: '12310', stationCode: 'DDU', sequence: 4, arrivalMinutes: t(2, 0), departureMinutes: t(2, 10), dayOffset: 1 },
  { trainNumber: '12310', stationCode: 'PNBE', sequence: 5, arrivalMinutes: t(5, 0), departureMinutes: null, dayOffset: 1 },

  // 12302 NDLS-Howrah Rajdhani: NDLS 16:50 (d0) -> CNB 21:30/21:35 (d0) -> PRYJ 23:35/23:40 (d0) -> DDU 01:35/01:45 (d1) -> GAYA 03:45/03:50 (d1) -> HWH 09:55 (d1)
  { trainNumber: '12302', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(16, 50), dayOffset: 0 },
  { trainNumber: '12302', stationCode: 'CNB', sequence: 2, arrivalMinutes: t(21, 30), departureMinutes: t(21, 35), dayOffset: 0 },
  { trainNumber: '12302', stationCode: 'PRYJ', sequence: 3, arrivalMinutes: t(23, 35), departureMinutes: t(23, 40), dayOffset: 0 },
  { trainNumber: '12302', stationCode: 'DDU', sequence: 4, arrivalMinutes: t(1, 35), departureMinutes: t(1, 45), dayOffset: 1 },
  { trainNumber: '12302', stationCode: 'GAYA', sequence: 5, arrivalMinutes: t(3, 45), departureMinutes: t(3, 50), dayOffset: 1 },
  { trainNumber: '12302', stationCode: 'HWH', sequence: 6, arrivalMinutes: t(9, 55), departureMinutes: null, dayOffset: 1 },

  // 12622 NDLS-Chennai Tamil Nadu Exp: NDLS 21:05 (d0) -> VGLJ 03:15/03:23 (d1) -> BPL 07:20/07:30 (d1) -> NGP 13:05/13:15 (d1) -> BZA 22:50/23:00 (d1) -> MAS 06:15 (d2)
  { trainNumber: '12622', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(21, 5), dayOffset: 0 },
  { trainNumber: '12622', stationCode: 'VGLJ', sequence: 2, arrivalMinutes: t(3, 15), departureMinutes: t(3, 23), dayOffset: 1 },
  { trainNumber: '12622', stationCode: 'BPL', sequence: 3, arrivalMinutes: t(7, 20), departureMinutes: t(7, 30), dayOffset: 1 },
  { trainNumber: '12622', stationCode: 'NGP', sequence: 4, arrivalMinutes: t(13, 5), departureMinutes: t(13, 15), dayOffset: 1 },
  { trainNumber: '12622', stationCode: 'BZA', sequence: 5, arrivalMinutes: t(22, 50), departureMinutes: t(23, 0), dayOffset: 1 },
  { trainNumber: '12622', stationCode: 'MAS', sequence: 6, arrivalMinutes: t(6, 15), departureMinutes: null, dayOffset: 2 },

  // 22692 NZM-Bengaluru Rajdhani: NZM 19:50 (d0) -> BPL 03:45/03:50 (d1) -> NGP 09:15/09:20 (d1) -> SC 18:10/18:20 (d1) -> SBC 05:20 (d2)
  { trainNumber: '22692', stationCode: 'NZM', sequence: 1, arrivalMinutes: null, departureMinutes: t(19, 50), dayOffset: 0 },
  { trainNumber: '22692', stationCode: 'BPL', sequence: 2, arrivalMinutes: t(3, 45), departureMinutes: t(3, 50), dayOffset: 1 },
  { trainNumber: '22692', stationCode: 'NGP', sequence: 3, arrivalMinutes: t(9, 15), departureMinutes: t(9, 20), dayOffset: 1 },
  { trainNumber: '22692', stationCode: 'SC', sequence: 4, arrivalMinutes: t(18, 10), departureMinutes: t(18, 20), dayOffset: 1 },
  { trainNumber: '22692', stationCode: 'SBC', sequence: 5, arrivalMinutes: t(5, 20), departureMinutes: null, dayOffset: 2 },

  // 12424 NDLS-Dibrugarh Rajdhani: NDLS 16:20 (d0) -> CNB 21:00/21:05 (d0) -> DDU 00:50/01:00 (d1) -> PNBE 04:00/04:10 (d1) -> NJP 12:30/12:40 (d1) -> GHY 19:30 (d1)
  { trainNumber: '12424', stationCode: 'NDLS', sequence: 1, arrivalMinutes: null, departureMinutes: t(16, 20), dayOffset: 0 },
  { trainNumber: '12424', stationCode: 'CNB', sequence: 2, arrivalMinutes: t(21, 0), departureMinutes: t(21, 5), dayOffset: 0 },
  { trainNumber: '12424', stationCode: 'DDU', sequence: 3, arrivalMinutes: t(0, 50), departureMinutes: t(1, 0), dayOffset: 1 },
  { trainNumber: '12424', stationCode: 'PNBE', sequence: 4, arrivalMinutes: t(4, 0), departureMinutes: t(4, 10), dayOffset: 1 },
  { trainNumber: '12424', stationCode: 'NJP', sequence: 5, arrivalMinutes: t(12, 30), departureMinutes: t(12, 40), dayOffset: 1 },
  { trainNumber: '12424', stationCode: 'GHY', sequence: 6, arrivalMinutes: t(19, 30), departureMinutes: null, dayOffset: 1 },
];

function pair(
  a: string,
  b: string,
  typicalMinutes: number,
  modeNote: string
): [StationTransfer, StationTransfer] {
  const base = { typicalMinutes, modeNote, source: 'in-ref-city-transit', lastVerified: '2026-11-25' };
  return [
    { fromStationCode: a, toStationCode: b, ...base },
    { fromStationCode: b, toStationCode: a, ...base },
  ];
}

export const SAMPLE_STATION_TRANSFERS: StationTransfer[] = [
  // Delhi NCR
  ...pair('NDLS', 'NZM', 45, 'Delhi Metro (Violet/Pink) or cab'),
  ...pair('NDLS', 'ANVT', 55, 'Delhi Metro (Blue Line) or cab'),
  ...pair('NDLS', 'DLI', 25, 'Delhi Metro (Yellow Line) or auto'),
  ...pair('NDLS', 'DEE', 35, 'Cab / auto via Pusa Road'),
  ...pair('NZM', 'ANVT', 45, 'Delhi Metro (Pink Line direct)'),
  ...pair('NZM', 'DLI', 50, 'Cab / Metro via Kashmere Gate'),
  ...pair('DLI', 'ANVT', 50, 'Delhi Metro (Red + Pink/Blue)'),
  ...pair('DLI', 'DEE', 25, 'Auto / cab via Sadar Bazar'),

  // Mumbai MMR
  ...pair('CSMT', 'LTT', 55, 'Harbour/Central suburban + auto'),
  ...pair('CSMT', 'MMCT', 35, 'Cab / bus via Marine Drive'),
  ...pair('CSMT', 'BDTS', 60, 'Harbour/Western suburban or cab'),
  ...pair('LTT', 'MMCT', 55, 'Cab / suburban via Dadar'),
  ...pair('LTT', 'BDTS', 40, 'Cab / auto via BKC'),
  ...pair('MMCT', 'BDTS', 35, 'Western suburban to Bandra + auto'),

  // Kolkata
  ...pair('HWH', 'SDAH', 40, 'Kolkata Metro (Green Line) or cab'),
  ...pair('HWH', 'KOAA', 55, 'Cab via Howrah Bridge'),
  ...pair('SDAH', 'KOAA', 35, 'Cab / auto via Ultadanga'),

  // Chennai
  ...pair('MAS', 'MS', 25, 'Chennai Metro (Green Line) or auto'),

  // Bengaluru
  ...pair('SBC', 'YPR', 30, 'Namma Metro (Green Line)'),
  ...pair('SBC', 'SMVB', 50, 'Namma Metro (Purple Line to Baiyappanahalli) + auto'),
  ...pair('YPR', 'SMVB', 50, 'Cab via Outer Ring Road'),

  // Hyderabad
  ...pair('SC', 'HYB', 35, 'Hyderabad Metro (Red/Blue) or cab'),
  ...pair('SC', 'KCG', 30, 'MMTS suburban or cab'),
  ...pair('HYB', 'KCG', 25, 'Cab / auto'),
];

export function seedSampleDatabaseIfEmpty(db: SQLiteDatabaseLike): void {
  const row = db.getFirstSync<{ count: number }>('SELECT COUNT(*) AS count FROM Station;');
  const existingKind = db.getFirstSync<{ value: string }>(
    "SELECT value FROM DataMetadata WHERE key = 'datasetKind';"
  )?.value;
  const existingVersion = db.getFirstSync<{ value: string }>(
    "SELECT value FROM DataMetadata WHERE key = 'dataVersion';"
  )?.value;

  const isLegacySample =
    (row?.count ?? 0) > 0 && existingKind === 'SAMPLE' && existingVersion === '0.1.0-SAMPLE';

  if ((row?.count ?? 0) > 0 && !isLegacySample) {
    return;
  }

  db.execSync('BEGIN TRANSACTION;');
  try {
    if (isLegacySample) {
      db.execSync(`
        DELETE FROM TrainStop;
        DELETE FROM StationTransfer;
        DELETE FROM Train;
        DELETE FROM Station;
        DELETE FROM CityCluster;
      `);
    }
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
        'INSERT INTO TrainStop (trainNumber, stationCode, sequence, arrivalMinutes, departureMinutes, dayOffset) VALUES (?, ?, ?, ?, ?, ?);',
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
        'INSERT INTO StationTransfer (fromStationCode, toStationCode, typicalMinutes, modeNote, source, lastVerified) VALUES (?, ?, ?, ?, ?, ?);',
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
