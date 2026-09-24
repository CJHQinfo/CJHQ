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
 * Visitor location (city + country) and, when the property collects them
 * (Google Signals), age and gender are cached in Firestore
 * analytics/demographics<days> for 6 hours.
 *
 * Query: range=24h|today|yesterday|7|28|90|custom (default 28); custom also
 * takes start=YYYY-MM-DD&end=YYYY-MM-DD. The old days=7|28|90 still works.
 * "24h" filters GA's hourly data (dateHour) to the last 24 full or partial
 * hours in the property's time zone, so visitors are de-duplicated properly.
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
  req.staffEmail = '';
  try {
    const decoded = await admin.auth().verifyIdToken(h.slice(7));
    const email = (decoded.email || '').toLowerCase();
    if (!email) return false;
    const extra = (process.env.STAFF_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    req.staffEmail = email;
    if (extra.includes(email)) return true;
    const doc = await db.collection('staff').doc(email).get();
    return doc.exists;
  } catch (e) {
    return false;
  }
}

const PROPERTY_TZ = process.env.GA_TZ || 'America/Toronto';

// YYYYMMDDHH for a Date, in the property's time zone.
function hourKey(d){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: PROPERTY_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map(x => [x.type, x.value]));
  return p.year + p.month + p.day + p.hour;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
// Turn the request's query into a range spec: GA dateRanges, an optional
// dateHour filter, a cache key and whether the chart should be per hour.
function parseRange(q){
  const r = String(q.range || q.days || '28');
  if(r === '24h'){
    const now = Date.now(), hours = [];
    for(let i = 0; i < 24; i++) hours.push(hourKey(new Date(now - i * 3600e3)));
    return { key: '24h', label: 'Last 24 hours', hourly: true,
      dateRanges: [{ startDate: 'yesterday', endDate: 'today' }], hours };
  }
  if(r === 'today') return { key: 'today', label: 'Today', hourly: true, dateRanges: [{ startDate: 'today', endDate: 'today' }] };
  if(r === 'yesterday') return { key: 'yesterday', label: 'Yesterday', hourly: true, dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }] };
  if(r === 'custom'){
    const start = String(q.start || ''), end = String(q.end || '');
    if(!ISO_DAY.test(start) || !ISO_DAY.test(end) || start > end || start < '2015-08-14') throw Object.assign(new Error('bad custom range'), { code: 400 });
    return { key: 'c' + start + '_' + end, label: start + ' to ' + end, hourly: start === end,
      dateRanges: [{ startDate: start, endDate: end }] };
  }
  const days = [7, 28, 90].includes(Number(r)) ? Number(r) : 28;
  return { key: String(days), label: 'Last ' + days + ' days', days, hourly: false,
    dateRanges: [{ startDate: days + 'daysAgo', endDate: 'today' }] };
}

// One GA4 report -> array of plain objects keyed by dimension/metric name.
async function report(rng, dimensions, metrics, extra = {}) {
  let dimensionFilter = extra.dimensionFilter;
  if (rng.hours) {
    const hf = { filter: { fieldName: 'dateHour', inListFilter: { values: rng.hours } } };
    dimensionFilter = dimensionFilter ? { andGroup: { expressions: [dimensionFilter, hf] } } : hf;
  }
  const [r] = await ga.runReport({
    property: PROPERTY,
    dateRanges: rng.dateRanges,
    dimensions: dimensions.map(name => ({ name })),
    metrics: metrics.map(name => ({ name })),
    ...extra,
    ...(dimensionFilter ? { dimensionFilter } : {}),
  });
  return (r.rows || []).map(row => {
    const o = {};
    dimensions.forEach((d, i) => { o[d] = row.dimensionValues[i].value; });
    metrics.forEach((m, i) => { o[m] = Number(row.metricValues[i].value); });
    return o;
  });
}

async function gaSummary(rng) {
  const byDesc = (metric) => ({ orderBys: [{ metric: { metricName: metric }, desc: true }] });
  const [totals, daily, pages, events, links, sources, devices, tracked] = await Promise.all([
    report(rng, [], ['activeUsers', 'newUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'userEngagementDuration', 'engagementRate', 'eventCount']),
    report(rng, [rng.hourly ? 'dateHour' : 'date'], ['activeUsers', 'screenPageViews'], { orderBys: [{ dimension: { dimensionName: rng.hourly ? 'dateHour' : 'date' } }] }),
    report(rng, ['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration'], { ...byDesc('screenPageViews'), limit: 50 }),
    report(rng, ['eventName'], ['eventCount'], { ...byDesc('eventCount'), limit: 30 }),
    report(rng, ['linkUrl'], ['eventCount'], {
      ...byDesc('eventCount'), limit: 30,
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['click', 'file_download'] } } },
    }),
    report(rng, ['sessionSourceMedium'], ['sessions'], { ...byDesc('sessions'), limit: 10 }),
    report(rng, ['deviceCategory'], ['activeUsers'], byDesc('activeUsers')),
    // Visits that arrived through an admin-made tracking link (?r=<label>),
    // which the site reports to GA with medium "cjhq_link".
    report(rng, ['sessionSource', 'sessionCampaignName'], ['sessions', 'activeUsers'], {
      ...byDesc('sessions'), limit: 200,
      dimensionFilter: { filter: { fieldName: 'sessionMedium', stringFilter: { matchType: 'EXACT', value: 'cjhq_link' } } },
    }),
  ]);
  const t = totals[0] || {};
  return {
    days: rng.days || null,
    range: rng.key,
    label: rng.label,
    hourly: rng.hourly,
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
    daily: daily.map(d => ({ date: d.date || d.dateHour, visitors: d.activeUsers, pageViews: d.screenPageViews })),
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
    tracked: tracked.map(x => ({ label: x.sessionSource, page: x.sessionCampaignName, visits: x.sessions, visitors: x.activeUsers })),
  };
}


// Where visitors are, plus age/gender when the property collects them
// (Google Signals). Demographics rows only exist when Signals is on; when it
// is off the API returns nothing usable, so the lists come back empty and the
// admin tab simply skips those cards. Cached in Firestore per day-range,
// mirroring the Clarity cache, so GA quota stays flat.
const DEMO_MAX_AGE_MS = 6 * 60 * 60 * 1000;
async function demographicsSummary(rng) {
  const ref = db.collection('analytics').doc('demographics' + rng.key);
  const snap = await ref.get();
  const cached = snap.exists ? snap.data() : null;
  const maxAge = rng.hourly ? CACHE_MS : DEMO_MAX_AGE_MS;
  if (cached && cached.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < maxAge) return cached;
  try {
    const byUsers = { orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }] };
    const [cities, countries] = await Promise.all([
      report(rng, ['city', 'country'], ['activeUsers'], { ...byUsers, limit: 20 }),
      report(rng, ['country'], ['activeUsers'], { ...byUsers, limit: 20 }),
    ]);
    // Age/gender only exist when Google Signals is on; when it is off these
    // return nothing usable (or fail), which must not sink the location data.
    let ages = [], genders = [];
    try {
      [ages, genders] = await Promise.all([
        report(rng, ['userAgeBracket'], ['activeUsers'], byUsers),
        report(rng, ['userGender'], ['activeUsers'], byUsers),
      ]);
    } catch (e) {
      console.error('signals demographics', e);
    }
    const known = v => v && v !== '(not set)' && v !== 'unknown';
    const doc = {
      fetchedAt: new Date().toISOString(),
      days: rng.days || null,
      range: rng.key,
      cities: cities.filter(c => known(c.city) && known(c.country)).map(c => ({ place: c.city + ', ' + c.country, visitors: c.activeUsers })),
      countries: countries.filter(c => known(c.country)).map(c => ({ country: c.country, visitors: c.activeUsers })),
      ages: ages.filter(a => known(a.userAgeBracket)).map(a => ({ bracket: a.userAgeBracket, visitors: a.activeUsers })),
      genders: genders.filter(g => known(g.userGender)).map(g => ({ gender: g.userGender, visitors: g.activeUsers })),
    };
    await ref.set(doc);
    return doc;
  } catch (e) {
    console.error('demographics', e);
    return cached ? { ...cached, stale: true } : { error: String(e.message || e).slice(0, 200) };
  }
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

// Tracking links the staff made in the admin, kept in Firestore
// analytics/tracking_links (written only here, never read by the public site).
const LABEL_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const PATH_RE = /^\/[A-Za-z0-9\/_.-]{0,120}$/;
async function trackingLinks(req, email) {
  const ref = db.collection('analytics').doc('tracking_links');
  const snap = await ref.get();
  const list = (snap.exists && Array.isArray(snap.data().links)) ? snap.data().links : [];
  if (req.method !== 'POST') return list;
  const b = typeof req.body === 'object' && req.body ? req.body : {};
  const label = String(b.label || '').toLowerCase();
  const path = String(b.path || '');
  if (!LABEL_RE.test(label) || !PATH_RE.test(path)) throw Object.assign(new Error('bad link'), { code: 400 });
  let next;
  if (b.op === 'delete') next = list.filter(l => !(l.label === label && l.path === path));
  else if (list.some(l => l.label === label && l.path === path)) next = list;
  else next = [{ label, path, by: email, at: new Date().toISOString() }, ...list].slice(0, 500);
  await ref.set({ links: next });
  return next;
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
    if (req.method === 'POST' || req.query.links === '1') {
      try {
        const links = await trackingLinks(req, req.staffEmail);
        res.set('Cache-Control', 'private, no-store');
        return json(res, 200, { ok: true, links });
      } catch (e) {
        if (e.code === 400) return json(res, 400, { error: 'Use letters, numbers, - or _ for the name (up to 40), and a page address starting with /.' });
        throw e;
      }
    }
    let rng;
    try { rng = parseRange(req.query || {}); }
    catch (e) { return json(res, 400, { error: 'Pick a valid date range (start on or before end).' }); }
    const key = 'ga' + rng.key;
    const hit = cache.get(key);
    let gaData;
    if (hit && Date.now() - hit.at < CACHE_MS) gaData = hit.data;
    else { gaData = await gaSummary(rng); cache.set(key, { at: Date.now(), data: gaData }); }
    const [clarity, demographics] = await Promise.all([claritySummary(), demographicsSummary(rng)]);
    res.set('Cache-Control', 'private, no-store');
    return json(res, 200, { ok: true, generatedAt: new Date().toISOString(), ga: gaData, clarity, demographics });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
};
