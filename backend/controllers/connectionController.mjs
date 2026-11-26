import { findDirectTrainsInDb, findOneStopConnections } from '../models/connectionModel.mjs';
import { sendJson } from '../views/jsonView.mjs';

export async function searchConnections(_req, res, db, url) {
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const extraBufferMinutes = Math.max(0, Number(url.searchParams.get('extraBuffer') || 0) || 0);
  const rawLimit = url.searchParams.get('limit');
  const limit = rawLimit ? Math.min(500, Math.max(1, Number(rawLimit) || 100)) : null;

  const [allConnections, directTrains] = await Promise.all([
    findOneStopConnections(db, {
      sourceCode: from,
      destinationCode: to,
      travelDate: date,
      extraBufferMinutes,
    }),
    findDirectTrainsInDb(db, {
      sourceCode: from,
      destinationCode: to,
      travelDate: date,
    }),
  ]);

  const connections = limit ? allConnections.slice(0, limit) : allConnections;

  sendJson(res, 200, {
    from: from.toUpperCase(),
    to: to.toUpperCase(),
    date,
    count: connections.length,
    totalCount: allConnections.length,
    disclaimer: 'Schedule-based estimate only; not live NTES/IRCTC status.',
    directTrains,
    connections,
  });
}
