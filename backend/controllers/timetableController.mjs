import {
  getFullTimetable,
  importTimetable,
  isValidTimetablePayload,
} from '../models/timetableModel.mjs';
import { sendError, sendJson } from '../views/jsonView.mjs';

function readJsonBody(req, maxBytes = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

export async function getTimetable(_req, res, db) {
  const payload = await getFullTimetable(db);
  sendJson(res, 200, payload);
}

export async function postTimetableImport(req, res, db) {
  const payload = await readJsonBody(req);
  if (!isValidTimetablePayload(payload)) {
    return sendError(res, 400, 'Payload must include stations, trains, and trainStops arrays.');
  }
  const result = await importTimetable(db, payload);
  sendJson(res, 200, { ok: true, imported: result });
}
