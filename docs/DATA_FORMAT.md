# Timetable Import Format

ConnectGuard ships with clearly labeled `SAMPLE` seed data in `src/db/seedSample.ts`.
When you have a licensed or permitted timetable dataset, import it into SQLite using:

```bash
node scripts/import-timetable.mjs --json path/to/timetable.json --out connectguard.db --version 2026.11 --date 2026-11-24
# or from a directory of CSV files:
node scripts/import-timetable.mjs --csv-dir path/to/csv_dir --out connectguard.db --version 2026.11 --date 2026-11-24
```

## Bitmask & Time Conventions

- **`runningDays`**: Integer bitmask (`1..127`) in IST relative to the train's **origin departure day**:
  - Monday = `1` (`1 << 0`)
  - Tuesday = `2` (`1 << 1`)
  - Wednesday = `4` (`1 << 2`)
  - Thursday = `8` (`1 << 3`)
  - Friday = `16` (`1 << 4`)
  - Saturday = `32` (`1 << 5`)
  - Sunday = `64` (`1 << 6`)
  - Daily = `127`
- **Times**: Stored in **IST minutes from midnight** (`0..1439`), plus `dayOffset` (`0` on the train's origin day, `1` on day 2, etc.).
  - `arrivalMinutes` is `null` (or empty in CSV) at the origin stop.
  - `departureMinutes` is `null` (or empty in CSV) at the terminal stop.

## Option A: JSON Schema

```json
{
  "meta": {
    "dataVersion": "2026.11",
    "lastUpdated": "2026-11-24"
  },
  "cityClusters": [
    { "id": "DELHI_NCR", "name": "Delhi NCR" }
  ],
  "stations": [
    { "code": "NDLS", "name": "New Delhi", "city": "Delhi", "lat": 28.6419, "lng": 77.2194, "cityClusterId": "DELHI_NCR" }
  ],
  "trains": [
    { "number": "12345", "name": "Example Express", "runningDays": 127 }
  ],
  "trainStops": [
    { "trainNumber": "12345", "stationCode": "NDLS", "sequence": 1, "arrivalMinutes": null, "departureMinutes": 360, "dayOffset": 0 }
  ],
  "stationTransfers": [
    {
      "fromStationCode": "NDLS",
      "toStationCode": "NZM",
      "typicalMinutes": 45,
      "modeNote": "Metro or cab",
      "source": "manual",
      "lastVerified": "2026-11-24"
    }
  ]
}
```

## Option B: CSV Directory (`--csv-dir`)

Place the following UTF-8 CSV files with header rows inside one directory:

1. `city_clusters.csv` (optional): `id,name`
2. `stations.csv` (required): `code,name,city,lat,lng,cityClusterId`
3. `trains.csv` (required): `number,name,runningDays`
4. `train_stops.csv` (required): `trainNumber,stationCode,sequence,arrivalMinutes,departureMinutes,dayOffset`
5. `station_transfers.csv` (optional): `fromStationCode,toStationCode,typicalMinutes,modeNote,source,lastVerified`
