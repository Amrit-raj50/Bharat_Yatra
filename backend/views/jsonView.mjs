/**
 * JSON View: Standardized HTTP JSON & CORS response helpers.
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...CORS_HEADERS,
  });
  res.end(body);
}

export function sendNoContent(res) {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

export function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}
