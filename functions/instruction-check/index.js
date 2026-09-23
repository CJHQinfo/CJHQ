/*
 * CJHQ AI instruction comparison (monthly).
 *
 * Reads the resource instructions the admin synced into Firestore
 * (resources_master), fetches each resource's live page, asks Gemini whether
 * the stored instructions still match the page, and writes the outcome to
 * link_audits/<slug> - the exact documents the admin panel's Link Audit tab
 * already renders under "Flagged Items" (status ok/changed/unclear/error,
 * summary, announcedFutureChange, lastChecked). A run summary lands in
 * link_audits/_run_summary.
 *
 * Callers (either one):
 *   - the admin panel's "Run instruction check now" button, with a staff
 *     member's Firebase ID token as  Authorization: Bearer <token>
 *   - the monthly Cloud Scheduler job, with  X-Run-Token: <RUN_TOKEN>
 *
 * Query/body params: slug=<one resource> | limit=<n> (testing), otherwise all.
 * Environment: GEMINI_API_KEY, RUN_TOKEN, STAFF_EMAILS (comma-separated
 * fallback staff list), MODEL (optional, default gemini-3.5-flash-lite).
 */
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const MODEL = process.env.MODEL || 'gemini-3.5-flash-lite';
const FETCH_TIMEOUT_MS = 12000;
const PAGE_TEXT_CAP = 12000;      // chars of page text sent to the model
const TIME_BUDGET_MS = 8 * 60 * 1000; // stop starting new resources after this

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

function hasRunToken(req) {
  const want = process.env.RUN_TOKEN || '';
  if (!want) return false;
  return String(req.headers['x-run-token'] || '') === want;
}

function htmlToText(html) {
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(nav|header|footer|form)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&rsquo;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PAGE_TEXT_CAP);
}

async function fetchPageText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CJHQ-InstructionCheck/1.0; +https://cjhq.org)' },
    });
    const type = String(r.headers.get('content-type') || '');
    const raw = (await r.text()).slice(0, 1500 * 1024);
    return { ok: r.ok, status: r.status, text: /html|text|xml|json|^$/.test(type) ? htmlToText(raw) : '' };
  } finally {
    clearTimeout(timer);
  }
}

function instructionText(rec) {
  const parts = [];
  if (rec.what_en) parts.push('What it is: ' + rec.what_en);
  if (rec.need_en) parts.push('What you need: ' + rec.need_en);
  if (Array.isArray(rec.need_list_en) && rec.need_list_en.length) parts.push('Required documents: ' + rec.need_list_en.join('; '));
  if (rec.steps_en) parts.push('How to apply: ' + rec.steps_en);
  if (Array.isArray(rec.steps_list_en) && rec.steps_list_en.length) parts.push('Steps: ' + rec.steps_list_en.join('; '));
  return parts.join('\n');
}

async function askGemini(rec, pageText) {
  const prompt = [
    'You are checking a community resource page for accuracy.',
    'CJHQ (a community council) publishes the following instructions about an official service,',
    'meant to reflect the official page. Decide whether our instructions still match the live page.',
    '',
    'Reply with ONLY a JSON object, no markdown, in exactly this shape:',
    '{"status":"ok"|"changed"|"unclear","summary":"one plain sentence","announced_future_change":null}',
    '- "ok": the live page still supports everything our instructions say.',
    '- "changed": something material differs now (process, requirements, fees, forms, eligibility, contact, or the service moved/closed).',
    '- "unclear": the page could not be read well enough to judge.',
    '- If the page announces a future change with a date (e.g. "as of January 1, fees change"), set announced_future_change to a short sentence describing it; otherwise null.',
    '',
    'SERVICE NAME: ' + (rec.en || rec.slug),
    'OUR PUBLISHED INSTRUCTIONS:',
    instructionText(rec),
    '',
    'LIVE PAGE TEXT (possibly truncated):',
    pageText,
  ].join('\n');

  const r = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + encodeURIComponent(process.env.GEMINI_API_KEY || ''),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 400, responseMimeType: 'application/json' },
      }),
    }
  );
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('gemini ' + r.status + ': ' + JSON.stringify(body).slice(0, 300));
  const text = (((body.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('') || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('gemini returned no JSON');
  const parsed = JSON.parse(m[0]);
  const status = ['ok', 'changed', 'unclear'].includes(parsed.status) ? parsed.status : 'unclear';
  return {
    status,
    summary: String(parsed.summary || '').slice(0, 500),
    announcedFutureChange: parsed.announced_future_change ? String(parsed.announced_future_change).slice(0, 300) : null,
  };
}

async function checkOne(rec) {
  const base = { slug: rec.slug, title: rec.en || rec.slug, url: rec.url || '', lastChecked: new Date().toISOString(), source: 'ai_instruction_check' };
  if (!rec.url) return { ...base, status: 'unclear', summary: 'No link on record to check.', announcedFutureChange: null };
  let page;
  try {
    page = await fetchPageText(rec.url);
  } catch (e) {
    return { ...base, status: 'error', summary: 'The page could not be loaded: ' + (e.name === 'AbortError' ? 'timed out' : String(e.message || e)).slice(0, 200), announcedFutureChange: null };
  }
  if (!page.ok) return { ...base, status: 'error', summary: 'The page returned HTTP ' + page.status + '.', announcedFutureChange: null };
  if (!page.text || page.text.length < 200) return { ...base, status: 'unclear', summary: 'The page returned too little readable text to compare against.', announcedFutureChange: null };
  try {
    const verdict = await askGemini(rec, page.text);
    return { ...base, ...verdict };
  } catch (e) {
    return { ...base, status: 'error', summary: 'The comparison itself failed: ' + String(e.message || e).slice(0, 200), announcedFutureChange: null };
  }
}

const ALLOWED_ORIGINS = new Set(['https://cjhq.org', 'https://www.cjhq.org']);

exports.instructionCheck = async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (ALLOWED_ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'POST, GET')
       .set('Access-Control-Allow-Headers', 'authorization, content-type, x-run-token')
       .set('Access-Control-Max-Age', '3600');
    return res.status(204).send('');
  }
  try {
    const authed = hasRunToken(req) || (await isStaffCaller(req));
    if (!authed) return json(res, 403, { error: 'forbidden' });

    const q = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    const started = Date.now();

    const snap = await db.collection('resources_master').get();
    let recs = snap.docs.map(d => d.data()).filter(r => r && r.slug && instructionText(r));
    if (q.slug) recs = recs.filter(r => r.slug === String(q.slug));
    if (q.limit) recs = recs.slice(0, Math.max(1, parseInt(q.limit, 10) || 1));
    if (!recs.length) return json(res, 200, { ok: true, checked: 0, note: 'no resources with instructions found (run Sync in the admin first)' });

    const counts = { ok: 0, changed: 0, unclear: 0, error: 0 };
    let checked = 0, stoppedEarly = false;
    for (const rec of recs) {
      if (Date.now() - started > TIME_BUDGET_MS) { stoppedEarly = true; break; }
      const result = await checkOne(rec);
      counts[result.status] = (counts[result.status] || 0) + 1;
      await db.collection('link_audits').doc(rec.slug).set(result, { merge: true });
      checked++;
    }
    const summary = {
      slug: '_run_summary', source: 'ai_instruction_check',
      lastRun: new Date().toISOString(), total: recs.length, checked, stoppedEarly,
      ok: counts.ok || 0, changed: counts.changed || 0, unclear: counts.unclear || 0, errors: counts.error || 0,
    };
    await db.collection('link_audits').doc('_run_summary').set(summary, { merge: true });
    return json(res, 200, { ok: true, ...summary });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: String(e.message || e).slice(0, 300) });
  }
};
