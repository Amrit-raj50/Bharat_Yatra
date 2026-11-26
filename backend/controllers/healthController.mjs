import { getTimetableStatus } from '../models/timetableModel.mjs';
import { sendJson } from '../views/jsonView.mjs';

export async function getHealth(_req, res, db) {
  const { meta, stats } = await getTimetableStatus(db);
  sendJson(res, 200, {
    status: 'ok',
    meta,
    stats,
  });
}
