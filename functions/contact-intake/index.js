'use strict';
/* Deploy as a 2nd-gen HTTP Cloud Function. Set TURNSTILE_SECRET, RATE_SALT,
 * optional FORM_ENDPOINT for email notice; allow unauthenticated invocation.
 * The browser never writes contact_submissions directly. */
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const functions = require('@google-cloud/functions-framework');
admin.initializeApp();
const db = admin.firestore();
const ORIGIN = 'https://cjhq.org';
const ALLOWED = {
  'Community Member': ['full_name','email','phone','community','subject','message'],
  'Government or Public Institution': ['full_name','position','department','location','email','phone','nature','message'],
  'Media Representative': ['full_name','news_org','position','deadline','email','phone','nature','message'],
  'Community Organization': ['org_name','contact_person','position','email','phone','nature','message'],
  'General Inquiry': ['full_name','email','phone','subject','message'],
};
const OPTIONAL = {
  'Community Member':new Set(['phone','community']),
  'Government or Public Institution':new Set(),
  'Media Representative':new Set(['deadline']),
  'Community Organization':new Set(),
  'General Inquiry':new Set(['phone']),
};
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const MAX_BODY = 12 * 1024;
const respond = (res, code, body) => res.status(code).json(body);
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const kind = body.inquiry_type;
  const fields = ALLOWED[kind];
  if (!fields || !['en','fr'].includes(body.lang)) return null;
  const allowedKeys = new Set([...fields,'inquiry_type','lang','cf-turnstile-response','_gotcha','_subject']);
  if (Object.keys(body).some(k => !allowedKeys.has(k))) return null;
  if (typeof body['cf-turnstile-response'] !== 'string' || !body['cf-turnstile-response'] || body['cf-turnstile-response'].length > 2048) return null;
  if (body._gotcha) return null;
  if (body._subject != null && body._subject !== 'New message from the CJHQ website') return null;
  const out = {inquiry_type:kind, lang:body.lang, _subject:'New message from the CJHQ website'};
  for (const field of fields) {
    const value = body[field];
    if (value == null && OPTIONAL[kind].has(field)) continue;
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if ((!text && !OPTIONAL[kind].has(field)) || text.length > (field === 'message' ? 5000 : 250) || /[\u0000-\u0008\u000b\u000e-\u001f]/.test(text)) return null;
    if (text) out[field] = text;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email || '') || (out.email || '').length > 254) return null;
  return out;
}
function ipHash(req) {
  // Cloud Run appends the load-balancer peer after the original client IP.
  // Pick the address immediately before the trusted last hop, not the
  // spoofable first address of a longer client-supplied chain.
  const chain = String(req.headers['x-forwarded-for'] || '').split(',');
  const ip = (chain.length >= 2 ? chain.at(-2) : chain[0])?.trim() || req.ip || 'unknown';
  return crypto.createHmac('sha256', process.env.RATE_SALT).update(ip).digest('hex');
}
async function rateLimit(key, now) {
  const slot = Math.floor(now / WINDOW_MS);
  const ref = db.collection('contact_rate_limits').doc(`${key}_${slot}`);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const count = snap.exists ? snap.data().count : 0;
    if (count >= MAX_PER_WINDOW) return false;
    tx.set(ref, { count:count+1, expiresAt:admin.firestore.Timestamp.fromMillis((slot+2)*WINDOW_MS) });
    return true;
  });
}
async function audit(reason, key) {
  // Minimal private telemetry, no submitted contents or raw IP. This is
  // best-effort so logging outages cannot accidentally admit a rejected form.
  try { await db.collection('contact_intake_audit').add({reason, ipHash:key, at:admin.firestore.FieldValue.serverTimestamp()}); } catch(e) { console.error('audit write failed',e); }
}
async function verifyTurnstile(token, req) {
  const params = new URLSearchParams({secret:process.env.TURNSTILE_SECRET,response:token});
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {method:'POST',body:params,signal:ctrl.signal});
    if (!r.ok) return false;
    const result = await r.json();
    return result.success === true && result.hostname === 'cjhq.org';
  } finally { clearTimeout(timer); }
}
functions.http('contactIntake', async (req,res) => {
  res.set('Access-Control-Allow-Origin', ORIGIN).set('Vary','Origin');
  res.set('Access-Control-Allow-Methods','POST, OPTIONS').set('Access-Control-Allow-Headers','Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return respond(res,405,{error:'method'});
  if (req.headers.origin !== ORIGIN) return respond(res,403,{error:'origin'});
  if (!process.env.TURNSTILE_SECRET || !process.env.RATE_SALT) return respond(res,503,{error:'unavailable'});
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) return respond(res,413,{error:'size'});
  const key = ipHash(req);
  try {
    if (!await rateLimit(key,Date.now())) { await audit('rate_limited',key); return respond(res,429,{error:'limit'}); }
    const data = validate(req.body);
    if (!data) { await audit('invalid_fields',key); return respond(res,400,{error:'invalid'}); }
    if (!await verifyTurnstile(req.body['cf-turnstile-response'],req)) { await audit('invalid_challenge',key); return respond(res,400,{error:'challenge'}); }
    // The authoritative inbox is Firestore. If notification delivery fails,
    // the accepted message remains available in CJHQ admin; no second submit
    // is needed and no false delivery-error message invites duplicates.
    const id = crypto.randomUUID();
    await db.collection('contact_submissions').doc(id).create({
      ...data, submittedAt:new Date().toISOString(), notificationStatus:'pending'
    });
    const form = new URLSearchParams(data);
    // Formspree CAPTCHA remains off; this server already consumed the
    // single-use Siteverify token before accepting the message.
    try {
      if (!process.env.FORM_ENDPOINT) throw new Error('Notification endpoint not configured');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(),10000);
      let reply;
      try { reply = await fetch(process.env.FORM_ENDPOINT,{method:'POST',body:form,headers:{Accept:'application/json'},signal:ctrl.signal}); }
      finally { clearTimeout(timer); }
      if (!reply.ok) throw new Error('Formspree HTTP '+reply.status);
      try { await db.collection('contact_submissions').doc(id).update({notificationStatus:'sent'}); }
      catch(e) { console.error('Notice accepted but status update failed for '+id,e); }
    } catch(e) {
      console.error('Notification failed; message saved as '+id,e);
      await audit('notification_failed',key);
      // Pending means notice delivery is unconfirmed, not that the message failed.
    }
    return respond(res,200,{ok:true});
  } catch(e) { console.error('contact intake error',e); await audit('server_error',key); return respond(res,503,{error:'unavailable'}); }
});
module.exports = {validate, rateLimit, verifyTurnstile};
