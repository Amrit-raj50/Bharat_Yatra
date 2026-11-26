import { searchStationsInDb } from '../models/stationModel.mjs';
import { sendJson } from '../views/jsonView.mjs';

export async function listStations(_req, res, db, url) {
  const query = url.searchParams.get('q') || '';
  const limit = url.searchParams.get('limit') || 30;
  const stations = await searchStationsInDb(db, query, limit);
  sendJson(res, 200, { stations });
}
