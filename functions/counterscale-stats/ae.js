/*
 * Cloudflare Analytics Engine queries for the CJHQ admin Counterscale card.
 * Shared by the Cloud Function (index.js) and the local test harness, so
 * exactly one copy of the SQL exists. Server-side only: CF_BEARER_TOKEN
 * must never reach a browser.
 *
 * Dataset layout (Counterscale writes, packages/server collect.ts):
 *   index1/blob8  site id ("cjhq" / "rvc")
 *   blob1 host, blob3 path, blob4 country, blob5 referrer,
 *   blob6 browser name, blob10 device type
 *   double1 newVisitor, double2 newSession, double3 bounce
 * Counts use SUM(_sample_interval) like Counterscale's own dashboard.
 */
'use strict';

const DATASET = 'metricsDataset';
const TZ = 'America/Toronto'; // same civil time as the CJHQ GA property

function rangeWindow(range, now) {
  // Mirrors the GA card's periods: 24h, today, yesterday, 7, 28, 90.
  const day = 24 * 60 * 60 * 1000;
  const end = new Date(now);
  let start, label;
  if (range === '24h') { start = new Date(now - day); label = 'Last 24 hours'; }
  else if (range === 'today' || range === 'yesterday') {
    const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
    const offset = local.getTime() - now.getTime();
    const startLocal = new Date(local); startLocal.setHours(0, 0, 0, 0);
    if (range === 'yesterday') startLocal.setDate(startLocal.getDate() - 1);
    start = new Date(startLocal.getTime() - offset);
    const endLocal = new Date(startLocal); endLocal.setDate(endLocal.getDate() + 1);
    label = range === 'today' ? 'Today' : 'Yesterday';
    return { start, end: new Date(endLocal.getTime() - offset), label };
  }
  else {
    const days = [7, 28, 90].includes(Number(range)) ? Number(range) : 28;
    start = new Date(now - days * day);
    label = 'Last ' + days + ' days';
  }
  return { start, end, label };
}

function fmt(dt) {
  return dt.toISOString().slice(0, 19).replace('T', ' ');
}

function buildQueries(siteId, range, now) {
  const { start, end, label } = rangeWindow(range, now || new Date());
  const where = `FROM ${DATASET} WHERE timestamp >= toDateTime('${fmt(start)}') AND timestamp < toDateTime('${fmt(end)}') AND index1 = '${siteId}'`;
  return {
    label,
    totals: `SELECT SUM(_sample_interval) AS views, SUM(_sample_interval * double1) AS newVisitors, SUM(_sample_interval * double2) AS sessions, SUM(_sample_interval * double3) AS bounces ${where}`,
    daily: `SELECT toDateTime(toStartOfInterval(timestamp, INTERVAL '1' DAY, '${TZ}'), 'Etc/UTC') AS day, SUM(_sample_interval) AS views, SUM(_sample_interval * double1) AS newVisitors ${where} GROUP BY day ORDER BY day ASC`,
    pages: `SELECT blob3 AS path, SUM(_sample_interval) AS views ${where} GROUP BY path ORDER BY views DESC LIMIT 12`,
    referrers: `SELECT blob5 AS referrer, SUM(_sample_interval) AS views ${where} AND blob5 != '' GROUP BY referrer ORDER BY views DESC LIMIT 10`,
    countries: `SELECT blob4 AS country, SUM(_sample_interval) AS views ${where} AND blob4 != '' GROUP BY country ORDER BY views DESC LIMIT 10`,
    browsers: `SELECT blob6 AS browser, SUM(_sample_interval) AS views ${where} AND blob6 != '' GROUP BY browser ORDER BY views DESC LIMIT 8`,
    devices: `SELECT blob10 AS device, SUM(_sample_interval) AS views ${where} AND blob10 != '' GROUP BY device ORDER BY views DESC LIMIT 8`,
  };
}

async function runSql(apiBase, accountId, token, sql) {
  const res = await fetch(`${apiBase}/accounts/${accountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'text/plain' },
    body: sql,
  });
  if (!res.ok) throw new Error('Analytics Engine query failed: HTTP ' + res.status);
  const body = await res.json();
  return body.data || [];
}

async function fetchCounterscaleStats({ accountId, token, siteId, range, now, apiBase }) {
  const q = buildQueries(siteId, range, now);
  const base = apiBase || 'https://api.cloudflare.com/client/v4';
  const [totals, daily, pages, referrers, countries, browsers, devices] = await Promise.all([
    runSql(base, accountId, token, q.totals),
    runSql(base, accountId, token, q.daily),
    runSql(base, accountId, token, q.pages),
    runSql(base, accountId, token, q.referrers),
    runSql(base, accountId, token, q.countries),
    runSql(base, accountId, token, q.browsers),
    runSql(base, accountId, token, q.devices),
  ]);
  const t = totals[0] || {};
  const views = Number(t.views) || 0;
  const visitors = Number(t.newVisitors) || 0;
  const sessions = Number(t.sessions) || 0;
  const bounces = Number(t.bounces) || 0;
  return {
    site: siteId,
    range: range || '28',
    label: q.label,
    generatedAt: (now || new Date()).toISOString(),
    totals: {
      views,
      visitors,
      sessions,
      viewsPerVisitor: visitors ? Math.round((views / visitors) * 10) / 10 : 0,
      bounceRate: sessions ? Math.round((bounces / sessions) * 100) : null,
    },
    daily: daily.map(r => ({ date: String(r.day).slice(0, 10), views: Number(r.views) || 0, visitors: Number(r.newVisitors) || 0 })),
    pages: pages.map(r => ({ path: r.path, views: Number(r.views) || 0 })),
    referrers: referrers.map(r => ({ referrer: r.referrer, views: Number(r.views) || 0 })),
    countries: countries.map(r => ({ country: r.country, views: Number(r.views) || 0 })),
    browsers: browsers.map(r => ({ browser: r.browser, views: Number(r.views) || 0 })),
    devices: devices.map(r => ({ device: r.device, views: Number(r.views) || 0 })),
  };
}

module.exports = { buildQueries, fetchCounterscaleStats, rangeWindow };
