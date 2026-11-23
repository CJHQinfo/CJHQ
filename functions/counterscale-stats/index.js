/*
 * CJHQ admin Counterscale card (read-only).
 *
 * Same access rule as analytics-summary: the admin panel calls this with the
 * signed-in staff member's Firebase ID token (Authorization: Bearer <token>);
 * anyone else gets 403.
 *
 * Counterscale (counterscale.hartstein-portal.workers.dev) counts every
 * visit to cjhq.org with no cookies and no personal data, so unlike GA4 and
 * Clarity its numbers are not limited to visitors who tapped "Accept
 * statistics". This function reads those counts from Cloudflare Analytics
 * Engine with CF_ACCOUNT_ID + CF_BEARER_TOKEN, both set as function secrets
 * at deploy time - they never reach the browser.
 *
 * Query: range=24h|today|yesterday|7|28|90 (default 28), same periods as
 * the GA card. Results are cached in memory for 10 minutes.
 */
const admin = require('firebase-admin');
const { fetchCounterscaleStats } = require('./ae');

admin.initializeApp();
const db = admin.firestore();

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

function json(res, code, obj) {
  res.status(code).set('content-type', 'application/json').send(JSON.stringify(obj));
}

async function isStaffCaller(req) {
  const h = String(req.headers.authorization || '');
  if (!h.startsWith('Bearer ')) return false;
  try {
    const decoded = await admin.auth().verifyIdToken(h.slice(7));
    if (decoded.email_verified !== true) return false;
    const email = (decoded.email || '').toLowerCase();
    if (!email) return false;
    const extra = (process.env.STAFF_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (extra.includes(email)) return true;
    const doc = await db.collection('staff').doc(email).get();
    return doc.exists;
  } catch (e) {
    return false;
  }
}

exports.counterscaleStats = async (req, res) => {
  res.set('Access-Control-Allow-Origin', 'https://cjhq.org');
  res.set('Access-Control-Allow-Headers', 'authorization,content-type');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (!(await isStaffCaller(req))) return json(res, 403, { error: 'staff only' });

  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_BEARER_TOKEN;
  if (!accountId || !token) return json(res, 503, { error: 'counterscale not configured' });

  const range = String(req.query.range || '28');
  const key = range;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return json(res, 200, hit.data);

  try {
    const data = await fetchCounterscaleStats({ accountId, token, siteId: 'cjhq', range });
    cache.set(key, { at: Date.now(), data });
    return json(res, 200, data);
  } catch (e) {
    return json(res, 502, { error: 'counterscale query failed' });
  }
};
