# ConnectGuard Backend

Standalone Node.js backend service (`node:http` + `node:sqlite`, zero external dependencies) and bulk Indian Railways data ingestion pipeline.

## Quick Start

```bash
npm run backend
```

Starts the HTTP API on `http://localhost:4000` (override with `PORT=4000` and `CONNECTGUARD_DB=backend/data/connectguard.db`).

On first launch, if `backend/data/connectguard.db` is empty, it automatically seeds from `backend/data/default-timetable.json`.

## Endpoints

- `GET /health` — Service status, dataset metadata, and station/train/stop counts
- `GET /api/timetable` — Full ConnectGuard JSON timetable (used by the mobile app's **Settings → Sync from URL**)
- `GET /api/stations?q=NDLS` — Station search
- `GET /api/connections?from=LKO&to=JP&date=2026-11-25` — Server-side 1-stop connection search (schedule-based estimates)
- `POST /api/timetable/import` — Validate and import a ConnectGuard JSON timetable into the backend SQLite database

## Loading Indian Railways Trains

### Option A: Live Ingestion via RailKit SDK (`import-railkit.mjs`)

Uses the official `railkit` Node.js SDK (`liveAtStation` + `getTrainInfo`) to fetch real Indian Railways schedules and station coordinates into `backend/data/connectguard.db`:

```powershell
$env:RAILKIT_API_KEY="your_railkit_key"
node backend/ingest/import-railkit.mjs --limit 100
```

### Option B: Full Open Dataset (`import-datameet.mjs`)

Indian Railways operates 13,000+ passenger trains across 7,300+ stations, so the full national timetable is ingested via open datasets rather than hardcoded in source files.

1. Download an Indian Railways open schedule dataset (e.g. DataMeet `indian-railways` `stations.json`, `trains.json`, `schedules.json`).
2. Run the bulk importer:
   ```bash
   node backend/ingest/import-datameet.mjs \
     --stations path/to/stations.json \
     --trains path/to/trains.json \
     --schedules path/to/schedules.json \
     --out-db backend/data/connectguard.db \
     --version 2026.11-IN-FULL
   ```
3. Start `npm run backend` and in the mobile app go to **Settings → Update / Sync Timetable** and sync from `http://<your-lan-ip>:4000/api/timetable`.
