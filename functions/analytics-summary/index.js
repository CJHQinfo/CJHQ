/*
 * CJHQ admin Analytics tab (read-only).
 *
 * The admin panel calls this with the signed-in staff member's Firebase ID
 * token (Authorization: Bearer <token>). Anyone else gets 403.
 *
 * Google Analytics 4: read through the GA4 Data API as this function's own
 * runtime service account, which was added as a Viewer on the GA4 property.
 * There is no service-account key file: nothing to store, rotate or leak.
 *
 * Microsoft Clarity (optional): if CLARITY_TOKEN is set, the Clarity Data
 * Export API is read at most every 6 hours (it allows 10 calls a day and only
 * covers the last 1-3 days) and cached in Firestore analytics/clarity, which
 * the public site never reads.
 *
 * Query: days=7|28|90 (default 28).
 * Environment: GA_PROPERTY (numeric GA4 property ID), STAFF_EMAILS (optional
 * comma-separated fallback staff list), CLARITY_TOKEN (optional).
 */
const admin = require('firebase-admin');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

admin.initializeApp();
const db = admin.firestore();
const ga = new BetaAnalyticsDataClient();

const PROPERTY = 'properties/' + (process.env.GA_PROPERTY || '545788245');
const CACHE_MS = 10 * 60 * 1000;
const CLARITY_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

function json(res, code, obj) {
  res.status(code).set('content-type', 'application/json').send(JSON.stringify(obj));
}

async function isStaffCaller(req) {
  const h = String(req.headers.authorization || '');
  if (!h.startsWith('Bearer ')) return false;
  try {
    const decoded = await admin.auth().verifyIdToken(h.slice(7));
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

// One GA4 report -> array of plain objects keyed by dimension/metric name.
async function report(days, dimensions, metrics, extra = {}) {
  const [r] = await ga.runReport({
    property: PROPERTY,
    dateRanges: [{ startDate: days + 'daysAgo', endDate: 'today' }],
    dimensions: dimensions.map(name => ({ name })),
    metrics: metrics.map(name => ({ name })),
    ...extra,
  });
  return (r.rows || []).map(row => {
    const o = {};
    dimensions.forEach((d, i) => { o[d] = row.dimensionValues[i].value; });
    metrics.forEach((m, i) => { o[m] = Number(row.metricValues[i].value); });
    return o;
  });
}

async function gaSummary(days) {
  const byDesc = (metric) => ({ orderBys: [{ metric: { metricName: metric }, desc: true }] });
  const [totals, daily, pages, events, links, sources, devices] = await Promise.all([
    report(days, [], ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'userEngagementDuration', 'engagementRate', 'eventCount']),
    report(days, ['date'], ['activeUsers', 'screenPageViews'], { orderBys: [{ dimension: { dimensionName: 'date' } }] }),
    report(days, ['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration'], { ...byDesc('screenPageViews'), limit: 50 }),
    report(days, ['eventName'], ['eventCount'], { ...byDesc('eventCount'), limit: 30 }),
    report(days, ['linkUrl'], ['eventCount'], {
      ...byDesc('eventCount'), limit: 30,
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['click', 'file_download'] } } },
    }),
    report(days, ['sessionSourceMedium'], ['sessions'], { ...byDesc('sessions'), limit: 10 }),
    report(days, ['deviceCategory'], ['activeUsers'], byDesc('activeUsers')),
  ]);
  const t = totals[0] || {};
  return {
    days,
    totals: {
      visitors: t.activeUsers || 0,
      newVisitors: t.newUsers || 0,
      visits: t.sessions || 0,
      pageViews: t.screenPageViews || 0,
      avgVisitSeconds: Math.round(t.averageSessionDuration || 0),
      avgEngagedSecondsPerVisitor: t.activeUsers ? Math.round((t.userEngagementDuration || 0) / t.activeUsers) : 0,
      engagementRate: t.engagementRate || 0,
      events: t.eventCount || 0,
    },
    daily: daily.map(d => ({ date: d.date, visitors: d.activeUsers, pageViews: d.screenPageViews })),
    pages: pages.filter(p => p.pagePath && p.pagePath !== '(not set)').map(p => ({
      path: p.pagePath,
      views: p.screenPageViews,
      visitors: p.activeUsers,
      avgSecondsOnPage: p.activeUsers ? Math.round(p.userEngagementDuration / p.activeUsers) : 0,
    })),
    events: events.map(e => ({ name: e.eventName, count: e.eventCount })),
    links: links.filter(l => l.linkUrl && l.linkUrl !== '(not set)').map(l => ({ url: l.linkUrl, clicks: l.eventCount })),
    sources: sources.map(s => ({ source: s.sessionSourceMedium, visits: s.sessions })),
    devices: devices.map(d => ({ device: d.deviceCategory, visitors: d.activeUsers })),
  };
}

async function claritySummary() {
  const token = process.env.CLARITY_TOKEN || '';
  if (!token) return null;
  const ref = db.collection('analytics').doc('clarity');
  const snap = await ref.get();
  const cached = snap.exists ? snap.data() : null;
  if (cached && cached.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < CLARITY_MAX_AGE_MS) return cached;
  try {
    const r = await fetch('https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3', {
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    });
    if (!r.ok) throw new Error('Clarity HTTP ' + r.status);
    const raw = await r.json();
    const metrics = {};
    for (const m of Array.isArray(raw) ? raw : []) {
      const info = Array.isArray(m.information) ? m.information[0] || {} : {};
      metrics[m.metricName] = info;
    }
    const doc = { fetchedAt: new Date().toISOString(), days: 3, metrics };
    await ref.set(doc);
    return doc;
  } catch (e) {
    console.error('clarity', e);
    return cached ? { ...cached, stale: true } : { error: String(e.message || e).slice(0, 200) };
  }
}

const ALLOWED_ORIGINS = new Set(['https://cjhq.org', 'https://www.cjhq.org']);

exports.analyticsSummary = async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST')
       .set('Access-Control-Allow-Headers', 'authorization, content-type')
       .set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }
  try {
    if (!(await isStaffCaller(req))) return json(res, 403, { error: 'forbidden' });
    const days = [7, 28, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 28;
    const key = 'ga' + days;
    const hit = cache.get(key);
    let gaData;
    if (hit && Date.now() - hit.at < CACHE_MS) gaData = hit.data;
    else { gaData = await gaSummary(days); cache.set(key, { at: Date.now(), data: gaData }); }
    const clarity = await claritySummary();
    res.set('Cache-Control', 'private, no-store');
    return json(res, 200, { ok: true, generatedAt: new Date().toISOString(), ga: gaData, clarity });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
};
