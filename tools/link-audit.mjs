#!/usr/bin/env node
/* Monthly link check for cjhq.org.
   Run by .github/workflows/link-audit.yml on the 1st of each month (and on
   demand). It reads every outbound link the site publishes - the resource
   entries in index.html (main link plus each "official link") and plain
   external links in the static pages - visits each one, and writes the result
   to data/link-audit.json. The admin Link Audit tab reads that file.

   It never edits anything. Classification is deliberately cautious:
     broken - the page is gone (404/410) or the site's address does not resolve
     unsure - could not confirm either way (blocked, rate-limited, server error,
              timeout). Government sites often refuse automated visits, so an
              "unsure" is a prompt to click the link, not proof it is broken.
     ok     - loaded (any 2xx after redirects). */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'link-audit.json');
const TIMEOUT_MS = 20000;
const CONCURRENCY = 6;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 CJHQ-link-check (+https://cjhq.org)';
const SKIP_HOSTS = [/(^|\.)cjhq\.org$/i, /(^|\.)googleapis\.com$/i, /(^|\.)gstatic\.com$/i, /(^|\.)googletagmanager\.com$/i, /(^|\.)schema\.org$/i, /(^|\.)w3\.org$/i];

const links = new Map(); // url -> { url, used_by: [] }
function add(url, where){
  let u;
  try{ u = new URL(url); }catch(e){ return; }
  if(!/^https?:$/.test(u.protocol)) return;
  if(SKIP_HOSTS.some(r => r.test(u.hostname))) return;
  const key = u.href;
  if(!links.has(key)) links.set(key, { url:key, used_by:[] });
  const rec = links.get(key);
  if(!rec.used_by.some(w => w.slug === where.slug && w.label === where.label)) rec.used_by.push(where);
}

// 1. Resource entries: one per line in index.html, each carrying slug:'...'.
const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
for(const line of index.split('\n')){
  const slug = (line.match(/slug:'([^']+)'/) || [])[1];
  if(!slug || !/url:\s*["']https?:/.test(line)) continue;
  const title = (line.match(/\ben:'((?:[^'\\]|\\.)*)'/) || [])[1] || slug;
  for(const m of line.matchAll(/url:\s*"(https?:[^"]+)"|url:\s*'(https?:[^']+)'/g)){
    add(m[1] || m[2], { slug, label: title.replace(/\\'/g, "'") });
  }
}

// 2. Plain external links in the static pages (header, footer, page bodies).
function walk(dir){
  for(const name of readdirSync(dir)){
    if(name.startsWith('.') || name === 'node_modules' || name === 'tools' || name === 'tests') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if(st.isDirectory()) walk(p);
    else if(name.endsWith('.html') && name !== 'admin.html'){
      const html = readFileSync(p, 'utf8');
      for(const m of html.matchAll(/<a\b[^>]*\bhref="(https?:\/\/[^"]+)"/gi)){
        add(m[1].replace(/&amp;/g, '&'), { slug:'', label: 'Page: /' + relative(ROOT, p) });
      }
    }
  }
}
walk(ROOT);

// 3. Resources added or edited from the admin (public Firestore collections,
//    read exactly as an anonymous visitor reads them - no secrets needed).
async function firestoreUrls(collection){
  try{
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/cjhqinfo/databases/(default)/documents/${collection}?pageSize=300`);
    if(!r.ok) return;
    const j = await r.json();
    for(const d of (j.documents || [])){
      const f = d.fields || {};
      const url = f.url && f.url.stringValue;
      const slug = (f.slug && f.slug.stringValue) || d.name.split('/').pop();
      const label = (f.en && f.en.stringValue) || (f.title_en && f.title_en.stringValue) || slug;
      if(url) add(url, { slug, label: label + ' (edited in admin)' });
    }
  }catch(e){ console.warn('Could not read ' + collection + ':', e.message); }
}
await firestoreUrls('resources');
await firestoreUrls('resource_overrides');

async function check(url){
  let last = { status:0, error:'' };
  for(let attempt = 0; attempt < 2; attempt++){
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try{
      const r = await fetch(url, { method:'GET', redirect:'follow', signal:ac.signal,
        headers:{ 'user-agent':UA, 'accept':'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language':'en-CA,en;q=0.9,fr;q=0.8' } });
      clearTimeout(t);
      try{ await r.body?.cancel(); }catch(e){}
      last = { status:r.status, error:'', final_url: r.url !== url ? r.url : undefined };
      if(r.status < 400) return { result:'ok', ...last };
      if(r.status === 404 || r.status === 410) return { result:'broken', ...last };
    }catch(e){
      clearTimeout(t);
      const code = (e.cause && (e.cause.code || e.cause.errno)) || e.name || 'error';
      last = { status:0, error:String(code) };
      if(code === 'ENOTFOUND') return { result:'broken', ...last, error:'Address does not exist (DNS)' };
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  return { result:'unsure', ...last };
}

const all = [...links.values()];
const results = [];
let i = 0;
async function worker(){
  while(i < all.length){
    const rec = all[i++];
    const r = await check(rec.url);
    results.push({ ...rec, ...r });
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
results.sort((a, b) => a.url.localeCompare(b.url));

const pick = kind => results.filter(r => r.result === kind).map(({ result, ...rest }) => rest);
const report = {
  checked_at: new Date().toISOString(),
  total: results.length,
  ok: results.filter(r => r.result === 'ok').length,
  broken: pick('broken'),
  unsure: pick('unsure')
};
mkdirSync(dirname(OUT), { recursive:true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`Checked ${report.total} links: ${report.ok} ok, ${report.broken.length} broken, ${report.unsure.length} unsure.`);
