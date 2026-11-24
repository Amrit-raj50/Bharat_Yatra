# ConnectGuard (Phase 1)

Offline-first train-to-train 1-stop connection planner for Indian Railway passengers travelling on two separate tickets. Built with React Native + Expo SDK 57, TypeScript (strict), Expo Router, `expo-sqlite`, Zustand, and English/Hindi i18n.

> **Disclaimer:** ConnectGuard does not book tickets, show seat availability, track coach positions, or replace RailOne / IRCTC / NTES. All connection ratings are rule-based schedule estimates, never probabilities or live delay status.

## Setup (Expo Go — SDK 57)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run unit tests and TypeScript check:
   ```bash
   npm test
   npm run typecheck
   ```
3. Start Expo Go dev server:
   ```bash
   npx expo start
   ```
   Scan the QR code with **Expo Go (SDK 57)** on Android/iOS. Works offline once loaded.

## What Phase 1 Includes

- **SQLite schema & migrations** (`src/db/migrations.ts`) with indexes on `TrainStop(stationCode)` and `TrainStop(trainNumber, sequence)`.
- **1-stop connection search & buffer rating** (`src/domain/searchConnections.ts`, `src/domain/rateConnection.ts`):
  - Same-station transfers and same-city (`CityCluster`) station-change transfers
  - Overnight trains crossing midnight (`dayOffset` + IST minutes from midnight)
  - `runningDays` Mon–Sun bitmask evaluated against each train's origin departure date
  - Rule-based rating (`Tight`, `OK`, `Comfortable`, `Too long`, `Transfer time unknown`) using configurable constants in `src/config/ratingThresholds.ts` (flagged *"to be validated with real passenger data"*)
  - Sorted by total journey time; `Tight` options are never hidden
- **4 Expo Router screens**:
  - Home (`app/index.tsx`): offline station autocomplete, swap, IST date selector, quick `SAMPLE` route chips
  - Results (`app/results.tsx`): connection cards with rating badge (`Estimate`), layover, station-change warnings
  - Option detail (`app/connection/[id].tsx`): leg timings, transfer details, `SAMPLE DATA` banner, schedule-only disclaimer
  - Settings (`app/settings.tsx`): English / Hindi (`en`/`hi`) switch, dataset status/version/last-updated, about
- **Timetable import script** (`scripts/import-timetable.mjs`) documented in [`docs/DATA_FORMAT.md`](docs/DATA_FORMAT.md).

## Sample / Placeholder Data Notice

Until you import a verified timetable dataset, the app seeds fictional placeholder routes labeled **`SAMPLE`** in `src/db/seedSample.ts` and displays a prominent **`SAMPLE DATA ONLY`** banner in the UI.
