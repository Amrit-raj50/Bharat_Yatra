# Agent.md — ConnectGuard

This file provides context, conventions, and guardrails for AI coding agents working in `e:\rail`.

## Project Overview

**ConnectGuard (Phase 1)** is an offline-first, 1-stop train-to-train connection planner for Indian Railway passengers travelling on two separate tickets.

- **Stack:** React Native + Expo SDK 58, Expo Router (typed routes), TypeScript (`strict`, `noUncheckedIndexedAccess`), `expo-sqlite` (synchronous API), Zustand, `i18next` / `react-i18next` + `expo-localization` (`en` / `hi`), Jest (`jest-expo`).
- **Path alias:** `@/*` maps to `./src/*` (configured in `tsconfig.json` and `jest.config.js`).

### Product Boundaries & Disclaimers (Do Not Violate)
- ConnectGuard **does not** book tickets, show seat availability, track coach positions, or replace RailOne / IRCTC / NTES.
- All buffer ratings are **rule-based schedule estimates** (`ratingIsEstimate: true`), **never** probabilities or live delay status.
- **`TIGHT` connections must never be hidden** from search results.

## Common Commands

```bash
cd frontend
npm start                 # Start Expo dev server (Expo Go SDK 58)
npm test                  # Run Jest unit tests (frontend/__tests__/**/*.test.ts[x])
npm run typecheck         # Run TypeScript compiler check (tsc --noEmit)
npm run backend           # Start ConnectGuard Node.js backend API (http://localhost:4000)
npm run backend:ingest    # Bulk-import DataMeet Indian Railways JSON into backend SQLite
npm run import:timetable  # Import JSON or CSV timetable into SQLite (Node >= 22.5/24 with node:sqlite)
```

See [docs/DATA_FORMAT.md](docs/DATA_FORMAT.md) for JSON and CSV schemas accepted by `scripts/import-timetable.mjs`.

## Repository Structure

```text
frontend/
  app/                        # Expo Router screens
    _layout.tsx               # Root Stack layout, i18n init, store bootstrap, header Settings button
    index.tsx                 # Home: station picker, swap, IST date selector, saved connections, quick routes
    results.tsx               # Results list with rating badges, direct-train notice, late-night warnings, save button
    connection/[id].tsx       # Option detail: leg timings, transfer info, late-night warning, save toggle, disclaimer
    settings.tsx              # Language switch (en/hi), buffer profile, dataset status/version/lastUpdated, sync
  src/
    config/
      ratingThresholds.ts     # Buffer rating constants & BufferProfile extra-margin presets
    db/
      client.ts               # Singleton SQLite connection (connectguard.db) + migrations + sample seeding
      migrations.ts           # SQLite schema v1 (SCHEMA_V1_SQL) & SQLiteDatabaseLike interface
      queries.ts              # SqliteTimetableRepository implementing TimetableRepository + metadata/prefs/saved
      seedSample.ts           # Fictional SAMPLE dataset seeded when DB is empty
    domain/
      types.ts                # Core domain types & TimetableRepository interface
      time.ts                 # IST date/minute helpers & runningDays bitmask evaluation
      rateConnection.ts       # Pure buffer evaluation (rateConnection) & late-night window check
      searchConnections.ts    # Pure 1-stop connection search (searchConnections) & direct train lookup (findDirectTrains)
    i18n/
      index.ts                # i18next setup & device locale detection (en | hi)
      en.json                 # English translations
      hi.json                 # Hindi translations
    state/
      useAppStore.ts          # Zustand store (DB bootstrap, search state, buffer profile, saved connections, language)
    components/               # Reusable UI components (DateSelector, RatingBadge, SampleBanner, StationPickerModal, formatters)
  __tests__/
    connectionSearch.test.ts  # Unit tests for rateConnection, late-night check, searchConnections & findDirectTrains
    datasetAndImporter.test.ts # Unit tests for dataset validation & importer
scripts/
  import-timetable.mjs        # Offline CLI to build connectguard.db from JSON or CSV directory
backend/
  app.mjs                     # HTTP server factory (createBackendServer) wiring MVC router
  server.mjs                  # Server entrypoint (opens/seeds SQLite and listens on PORT)
  routes/
    apiRouter.mjs             # Route table mapping HTTP method/path to controllers
  controllers/                # Request parsing & validation (health, station, connection, timetable)
  models/                     # Data access & domain wrappers (stationModel, connectionModel, timetableModel)
  views/
    jsonView.mjs              # Standardized JSON & CORS HTTP response helpers
  db/                         # Backend SQLite schema, seeding, and payload export/import
  search/                     # Server-side 1-stop connection search
  ingest/                     # Bulk Indian Railways DataMeet / RailKit importers
  data/                       # default-timetable.json & connectguard.db (runtime)
docs/
  DATA_FORMAT.md              # Timetable import format specification
```

## Architecture & Domain Conventions

### 1. Time, Dates, and `runningDays`
- **All schedule times are in IST** stored as integer minutes from midnight (`0..1439`), paired with `dayOffset` (`0` on the train's origin departure day, `1` on day 2, etc.).
  - `arrivalMinutes` is `null` at a train's origin stop; `departureMinutes` is `null` at its terminal stop.
- **`runningDays` bitmask (`1..127`):**
  - `MON = 1` (`1 << 0`), `TUE = 2`, `WED = 4`, `THU = 8`, `FRI = 16`, `SAT = 32`, `SUN = 64`, `DAILY = 127`.
  - **Crucial:** `runningDays` is evaluated against the train's **origin departure date** (`boardingIsoDate - boardingStopDayOffset`), not the mid-route boarding date. Always use `doesTrainRunForBoardingDate()` in `src/domain/time.ts`.

### 2. Connection Search & Buffer Rating
- `searchConnections(repo, input)` in `src/domain/searchConnections.ts` is pure and repository-agnostic (`TimetableRepository`).
- Supports **same-station** transfers (`transferMinutes = 0`) and **same-city (`CityCluster`)** station-change transfers (using `StationTransfer.typicalMinutes` when present).
- Search window is capped at `RATING_THRESHOLDS.MAX_SEARCH_LAYOVER_MINUTES` (24 hours).
- Results are sorted ascending by `totalJourneyMinutes`, then `layoverMinutes`, then `id`.
- `rateConnection(layoverMinutes, transferMinutes, extraBufferMinutes = 0)` in `frontend/src/domain/rateConnection.ts`:
  - Computes `effectiveBufferMinutes = layoverMinutes - transferMinutes - extraBufferMinutes`.
  - `BufferProfile` (`SOLO`: `+0m`, `FAMILY`: `+30m`, `EXTRA_SAFE`: `+45m`) in `frontend/src/config/ratingThresholds.ts` is persisted in `DataMetadata` (`buffer_profile`).
  - Thresholds live in `frontend/src/config/ratingThresholds.ts` (`TIGHT`, `OK`, `COMFORTABLE`, `TOO_LONG`).
  - When `isStationChange` has no `StationTransfer` record (`transferMinutes === null`), `effectiveBufferMinutes` is `null`, `unknownTransferTime` is `true`, and rating is `TIGHT` (if `layoverMinutes < UNKNOWN_TRANSFER_TIGHT_BELOW_MINUTES + extraBufferMinutes`) or `TRANSFER_UNKNOWN` — **never `COMFORTABLE`**.
- `isLateNightTransferWindow()` in `frontend/src/domain/rateConnection.ts` flags transfers overlapping `23:00–05:00 IST` (`isLateNightTransfer: boolean` on `ConnectionOption`).
- `findDirectTrains(repo, input)` in `frontend/src/domain/searchConnections.ts` surfaces direct trains on the same route/date for pre-booking comparison.

### 3. Database & Sample Data
- `SQLiteDatabaseLike` in `frontend/src/db/migrations.ts` abstracts `expo-sqlite` sync methods (`execSync`, `runSync`, `getFirstSync`, `getAllSync`).
- **Schema sync:** `SCHEMA_V1_SQL` is defined in both `frontend/src/db/migrations.ts` and `scripts/import-timetable.mjs`. If you modify the SQLite schema, update **both** files and bump `LATEST_SCHEMA_VERSION`.
- When the database is empty, `seedSampleDatabaseIfEmpty` populates fictional `SAMPLE` routes and sets `datasetKind = 'SAMPLE'` in `DataMetadata`. `SampleBanner` renders whenever `datasetMeta.datasetKind !== 'IMPORTED'`.
- User preferences (`language`, `buffer_profile`) and offline bookmarks (`saved_connections` JSON) are persisted in `DataMetadata`.

### 4. Internationalization (i18n)
- Both `src/i18n/en.json` and `src/i18n/hi.json` must be kept in sync whenever adding or modifying translation keys.

## Agent Checklist Before Finishing Changes
1. Keep domain logic in `src/domain/` pure and covered by unit tests in `__tests__/`.
2. Verify any UI copy preserves the schedule-only / estimate framing (no probabilities, no live tracking claims).
3. Run `npm test` and `npm run typecheck` and confirm both pass.
