'use strict';
const crypto = require('node:crypto');
const admin = require('firebase-admin');
const functions = require('@google-cloud/functions-framework');
admin.initializeApp();
const db = admin.firestore();
const ORIGIN = 'https://cjhq.org';
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const MAX_BODY = 8192;
const LIMITS = {type:40,attemptedUrl:2048,message:2000,referrer:2048,userAgent:512,lang:5,reportedAt:40};
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== Object.keys(LIMITS).length ||
      Object.keys(body).some(k=>!Object.hasOwn(LIMITS,k))) return null;
  for (const [key,max] of Object.entries(LIMITS)) {
    if (typeof body[key] !== 'string' || body[key].length > max ||
        /[\u0000-\u0008\u000b\u000e-\u001f]/.test(body[key])) return null;
  }
  if (!['js_error','broken_link'].includes(body.type) || !['en','fr'].includes(body.lang)) return null;
  let url;
  try { url = new URL(body.attemptedUrl); } catch { return null; }
  if (!['https:','http:'].includes(url.protocol) || !['cjhq.org','www.cjhq.org'].includes(url.hostname)) return null;
  if (!Number.isFinite(Date.parse(body.reportedAt)) ||
      Math.abs(Date.now()-Date.parse(body.reportedAt)) > 24*WINDOW_MS) return null;
  const bytes = Buffer.byteLength(JSON.stringify(body));
  if (bytes > MAX_BODY) return null;
  return body;
}
function ipHash(req) {
  const chain=String(req.headers['x-forwarded-for']||'').split(',');
  const ip=(chain.length>=2?chain.at(-2):chain[0])?.trim()||req.ip||'unknown';
  return crypto.createHmac('sha256',process.env.RATE_SALT).update(ip).digest('hex');
}
async function rateLimit(key,now) {
  const slot=Math.floor(now/WINDOW_MS);
  const ref=db.collection('error_report_rate_limits').doc(`${key}_${slot}`);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref); const count=snap.exists?snap.data().count:0;
    if(count>=MAX_PER_WINDOW)return false;
    tx.set(ref,{count:count+1,expiresAt:admin.firestore.Timestamp.fromMillis((slot+2)*WINDOW_MS)});
    return true;
  });
}
async function audit(reason,key) {
  try { await db.collection('error_report_intake_audit').add({reason,ipHash:key,at:admin.firestore.FieldValue.serverTimestamp()}); }
  catch(e) { console.error('error intake audit failure',e); }
}
const respond=(res,code,body)=>res.status(code).json(body);
functions.http('errorIntake',async(req,res)=>{
  res.set('Access-Control-Allow-Origin',ORIGIN).set('Vary','Origin');
  res.set('Access-Control-Allow-Methods','POST, OPTIONS').set('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS')return res.status(204).send('');
  if(req.method!=='POST')return respond(res,405,{error:'method'});
  if(req.headers.origin!==ORIGIN)return respond(res,403,{error:'origin'});
  if(!process.env.RATE_SALT)return respond(res,503,{error:'unavailable'});
  if(req.headers['content-type']?.split(';')[0]!=='application/json')return respond(res,415,{error:'content_type'});
  if(Number(req.headers['content-length']||0)>MAX_BODY)return respond(res,413,{error:'size'});
  const data=validate(req.body); const key=ipHash(req);
  try {
    if(!data){await audit('invalid',key);return respond(res,400,{error:'invalid'});}
    if(!await rateLimit(key,Date.now())){await audit('rate_limited',key);return respond(res,429,{error:'limit'});}
    await db.collection('error_reports').doc(crypto.randomUUID()).create({...data,receivedAt:admin.firestore.FieldValue.serverTimestamp()});
    return respond(res,200,{ok:true});
  } catch(e) {console.error('error intake failure',e);await audit('server_error',key);return respond(res,503,{error:'unavailable'});}
});
module.exports={validate,rateLimit};
