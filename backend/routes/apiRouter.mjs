import { searchConnections } from '../controllers/connectionController.mjs';
import { getHealth } from '../controllers/healthController.mjs';
import { listStations } from '../controllers/stationController.mjs';
import { getTimetable, postTimetableImport } from '../controllers/timetableController.mjs';
import { sendError, sendNoContent } from '../views/jsonView.mjs';

export async function routeApiRequest(req, res, db) {
  if (req.method === 'OPTIONS') {
    return sendNoContent(res);
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return getHealth(req, res, db);
    }

    if (req.method === 'GET' && url.pathname === '/api/timetable') {
      return getTimetable(req, res, db);
    }

    if (req.method === 'GET' && url.pathname === '/api/stations') {
      return listStations(req, res, db, url);
    }

    if (req.method === 'GET' && url.pathname === '/api/connections') {
      return searchConnections(req, res, db, url);
    }

    if (req.method === 'POST' && url.pathname === '/api/timetable/import') {
      return await postTimetableImport(req, res, db);
    }

    return sendError(res, 404, 'Not found');
  } catch (error) {
    return sendError(res, 500, error instanceof Error ? error.message : String(error));
  }
}
