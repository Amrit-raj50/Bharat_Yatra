<div align="center">
  <img src="./docs/logo.png" width="110" alt="BharatYatra Logo" />
  <h1>BharatYatra</h1>
  <p><strong>Offline-First 1-Stop Train Connection Planner for Indian Railway Passengers</strong></p>
</div>

[![Frontend](https://img.shields.io/badge/Mobile-Expo%20SDK%2058%20%7C%20React%20Native-0D47A1?style=flat-square)](./frontend)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20MVC%20%7C%20MongoDB%20Atlas-1B7F3B?style=flat-square)](./backend)
[![Dataset](https://img.shields.io/badge/Timetable-8%2C990%20Stations%20%7C%205%2C208%20Trains-F57C00?style=flat-square)](./docs/DATA_FORMAT.md)
[![Languages](https://img.shields.io/badge/Languages-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80-08306B?style=flat-square)](./frontend/src/i18n)
[![Android APK](https://img.shields.io/badge/Download-Android%20APK%20(v0.1.1)-1B7F3B?style=flat-square&logo=android&logoColor=white)](https://expo.dev/accounts/baby_coda_69/projects/bharatyatra/builds/d20da46a-a16d-4b1e-a77c-e7445e672ac6)

## Download Android App

- **Android APK (v0.1.1):** [Download from Expo EAS Build](https://expo.dev/accounts/baby_coda_69/projects/bharatyatra/builds/d20da46a-a16d-4b1e-a77c-e7445e672ac6) *(install directly on Android; connects automatically to the live BharatYatra backend)*

> **Official Notice & Scope Disclaimer:**
> **BharatYatra** is a **pre-booking schedule planning utility** for passengers travelling on **two separate tickets** when direct trains are unavailable or waitlisted. It does **not** book tickets, display seat availability, track coach positions, or provide live train running status. All buffer ratings (`Tight`, `OK`, `Comfortable`, `Too long`, `Transfer time unknown`) are **rule-based schedule estimates**, never probabilities or live delay guarantees. Always verify live running status and book tickets on official Indian Railways platforms (**IRCTC**, **NTES**, **RailOne**).

---

## Application Screenshots

| Plan (Home) | Connection Options | Connection Details | Settings & Data |
| :---: | :---: | :---: | :---: |
| <img src="./docs/screenshots/home.jpg" width="210" alt="BharatYatra Home Screen" /> | <img src="./docs/screenshots/results.jpg" width="210" alt="BharatYatra Connection Options" /> | <img src="./docs/screenshots/details.jpg" width="210" alt="BharatYatra Connection Details Timeline" /> | <img src="./docs/screenshots/settings.jpg" width="210" alt="BharatYatra Settings and Data" /> |

---

## Key Capabilities

### 1. Pre-Booking 1-Stop Connection Planning
- **National Timetable Coverage:** Searches across **8,990 stations**, **5,208 trains**, and **417,080 scheduled stops** (`2026.11-IN-DATAMEET`) via the live MongoDB Atlas + Node.js API, with automatic offline SQLite fallback.
- **Same-Station & City-Cluster Transfers:** Supports transfers at the same junction as well as across stations in major metropolitan clusters (`DELHI_NCR`, `MUMBAI_MMR`, `KOLKATA`, `CHENNAI`, `BENGALURU`, `HYDERABAD`).
- **Overnight & Weekday Accuracy:** Evaluates `runningDays` (Mon–Sun bitmask) against each train's **origin departure date** (`dayOffset`) in IST (`0..1439` minutes from midnight).
- **Direct Train Comparison:** Surfaces direct trains running on the selected route and date in a dedicated banner and bottom sheet, plus a **Direct** filter chip.

### 2. Passenger Safety & Buffer Signals
- **Rule-Based Buffer Ratings:** Classifies effective buffer (`layover - transfer - traveller margin`) into `Tight`, `OK`, `Comfortable`, `Too long`, or `Transfer time unknown` with paired icons and color-blind-safe badges. **`Tight` connections are never hidden.**
- **Traveller Buffer Profiles:**
  - **Solo / Light (`+0 min`)**
  - **Family / Luggage (`+30 min`)**
  - **Extra safe (`+45 min`)**
- **Late-Night Transfer Warnings:** Flags layovers overlapping **23:00–05:00 IST** when local inter-station transport is sparser.
- **Journey Continuity & Offline Access:** Bookmark any connection for offline access, share WhatsApp-ready journey summaries, inspect "Before you book" checklists (IRCTC/NTES deep links), and view next-3 backup departures if Train 2 is missed.
- **Bilingual UI:** Full **English** and **हिन्दी (Hindi)** support with instant switching.

---

## System Architecture

```text
Bharat_Yatra/
├── frontend/                  # React Native + Expo SDK 58 mobile application (TypeScript strict)
│   ├── app/
│   │   ├── (tabs)/            # 4-tab navigation: Plan (index), Saved, Alerts, Settings
│   │   ├── results.tsx        # Connection options list, sorting/filtering, direct trains sheet
│   │   └── connection/[id].tsx# Vertical journey timeline, buffer breakdown, IRCTC/NTES links
│   ├── src/
│   │   ├── theme/theme.ts     # Unified BharatYatra design tokens
│   │   ├── components/        # AppHeader, StationInput, DateChips, TrainCard, Timeline, StatusPill, etc.
│   │   ├── domain/            # Pure IST time, runningDays, rateConnection, searchConnections, findDirectTrains
│   │   ├── db/                # Expo SQLite schema v1, migrations, offline fallback & bookmarks
│   │   ├── config/            # Buffer thresholds & live backend API client
│   │   ├── i18n/              # English (en.json) & Hindi (hi.json) translations
│   │   └── state/             # Zustand app store
│   └── __tests__/             # Jest unit tests
├── backend/                   # Zero-dependency Node.js (>=22.5) MVC API server
│   ├── app.mjs                # HTTP server factory
│   ├── server.mjs             # Entrypoint (MongoDB Atlas primary + SQLite fallback)
│   ├── routes/apiRouter.mjs   # Route dispatcher
│   ├── controllers/           # health, station, connection, timetable controllers
│   ├── models/                # stationModel, connectionModel, timetableModel
│   ├── views/jsonView.mjs     # JSON & CORS response helpers
│   └── ingest/                # DataMeet, RailKit & MongoDB bulk importers
├── scripts/                   # Offline SQLite timetable CLI builder
├── docs/                      # Data format specification & screenshots
└── render.yaml                # Render Blueprint deployment configuration
```

---

## Live Backend API

Deployed on Render: **`https://bharat-yatra-1bdr.onrender.com`**

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service status, dataset version, and station/train/stop counts |
| `GET` | `/api/stations?q=LKO&limit=30` | Station autocomplete by code, name, or city |
| `GET` | `/api/connections?from=LKO&to=JP&date=2026-11-27&extraBuffer=30&limit=100` | 1-stop connection search + direct trains |
| `GET` | `/api/timetable` | Full timetable JSON payload for offline sync |
| `POST` | `/api/timetable/import` | Validate and import a ConnectGuard/BharatYatra JSON timetable |

---

## Local Development & Verification

### 1. Frontend (Expo SDK 58)
```bash
cd frontend
npm install
npm run typecheck
npm test
npx expo start -c
```

### 2. Backend (Node.js MVC + MongoDB / SQLite)
```bash
cd backend
npm install
npm test
npm start
```
Set `MONGO_URI` in `backend/.env` to connect to MongoDB Atlas (without `MONGO_URI`, the server falls back to `backend/data/connectguard.db`).

### 3. Build Android APK (EAS Cloud)
```bash
cd frontend
eas login
eas build -p android --profile preview
```

---

## Data Attribution & Governance
- Timetable schedules are sourced from open Indian Railways datasets (DataMeet) and validated via [DATA_FORMAT.md](./docs/DATA_FORMAT.md).
- **BharatYatra** is an independent open-source passenger utility and is **not** affiliated with Indian Railways, IRCTC, CRIS, or NTES.
