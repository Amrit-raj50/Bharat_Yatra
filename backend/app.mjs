import http from 'node:http';
import { routeApiRequest } from './routes/apiRouter.mjs';

export function createBackendServer(db) {
  return http.createServer((req, res) => routeApiRequest(req, res, db));
}
