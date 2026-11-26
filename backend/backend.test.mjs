import assert from 'node:assert/strict';
import test from 'node:test';
import { getBackendStats, openBackendDb } from './db/schema.mjs';
import { seedBackendDatabaseIfEmpty } from './db/seedDefault.mjs';
import { convertDataMeetToPayload } from './ingest/import-datameet.mjs';
import { createBackendServer } from './server.mjs';

test('backend server seeds default timetable and serves health, stations, connections, and timetable', async () => {
  const db = openBackendDb(':memory:');
  const seeded = seedBackendDatabaseIfEmpty(db);
  assert.equal(seeded, true);

  const stats = getBackendStats(db);
  assert.equal(stats.stations, 52);
  assert.equal(stats.trains, 64);

  const server = createBackendServer(db);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');
    assert.equal(health.stats.stations, 52);

    const stationsRes = await fetch(`${baseUrl}/api/stations?q=NDLS`);
    const stationsJson = await stationsRes.json();
    assert.ok(stationsJson.stations.some((s) => s.code === 'NDLS'));

    const connRes = await fetch(`${baseUrl}/api/connections?from=LKO&to=JP&date=2026-11-23`);
    const connJson = await connRes.json();
    assert.ok(connJson.count > 0);
    assert.equal(connJson.connections[0].ratingIsEstimate, true);

    const ttRes = await fetch(`${baseUrl}/api/timetable`);
    const ttJson = await ttRes.json();
    assert.equal(ttJson.stations.length, 52);
    assert.equal(ttJson.trains.length, 64);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

test('convertDataMeetToPayload converts DataMeet schedules to ConnectGuard format', () => {
  const payload = convertDataMeetToPayload({
    stationsRaw: {
      features: [
        { properties: { code: 'NDLS', name: 'New Delhi' }, geometry: { coordinates: [77.22, 28.64] } },
        { properties: { code: 'CNB', name: 'Kanpur Central' }, geometry: { coordinates: [80.35, 26.45] } },
      ],
    },
    trainsRaw: {
      features: [{ properties: { number: '12004', name: 'Swarna Shatabdi' } }],
    },
    schedulesRaw: [
      { train_number: '12004', station_code: 'NDLS', arrival: 'None', departure: '06:10:00', day: 1 },
      { train_number: '12004', station_code: 'CNB', arrival: '11:20:00', departure: 'None', day: 1 },
    ],
  });

  assert.equal(payload.stations.length, 2);
  assert.equal(payload.stations[0].cityClusterId, 'DELHI_NCR');
  assert.equal(payload.trains.length, 1);
  assert.equal(payload.trainStops[0].departureMinutes, 370);
  assert.equal(payload.trainStops[1].arrivalMinutes, 680);
  assert.equal(payload.trainStops[1].dayOffset, 0);
});
