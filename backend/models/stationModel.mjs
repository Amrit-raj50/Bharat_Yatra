/**
 * Station Model: SQLite and MongoDB queries for station lookup and search.
 */
import { isMongoDb } from '../db/mongo.mjs';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchStationsInDb(db, query, limit = 30) {
  const q = (query || '').trim();
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));

  if (isMongoDb(db)) {
    const col = db.collection('stations');
    if (!q) {
      return col
        .find({}, { projection: { _id: 0 } })
        .sort({ code: 1 })
        .limit(safeLimit)
        .toArray();
    }

    const regex = new RegExp(escapeRegex(q), 'i');
    const docs = await col
      .find(
        { $or: [{ code: regex }, { name: regex }, { city: regex }] },
        { projection: { _id: 0 } }
      )
      .sort({ code: 1 })
      .limit(safeLimit * 2)
      .toArray();

    const upperQ = q.toUpperCase();
    docs.sort((a, b) => {
      const rank = (s) =>
        s.code.toUpperCase() === upperQ ? 0 : s.code.toUpperCase().startsWith(upperQ) ? 1 : 2;
      const rDiff = rank(a) - rank(b);
      return rDiff !== 0 ? rDiff : a.code.localeCompare(b.code);
    });
    return docs.slice(0, safeLimit);
  }

  if (!q) {
    return db
      .prepare('SELECT code, name, city, lat, lng, cityClusterId FROM Station ORDER BY code ASC LIMIT ?')
      .all(safeLimit);
  }

  const pattern = `%${q}%`;
  return db
    .prepare(
      `SELECT code, name, city, lat, lng, cityClusterId
       FROM Station
       WHERE code LIKE ? OR name LIKE ? OR city LIKE ?
       ORDER BY
         CASE WHEN UPPER(code) = UPPER(?) THEN 0
              WHEN UPPER(code) LIKE UPPER(?) THEN 1
              ELSE 2 END,
         code ASC
       LIMIT ?`
    )
    .all(pattern, pattern, pattern, q, `${q}%`, safeLimit);
}
