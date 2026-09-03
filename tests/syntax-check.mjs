/* Parses every inline <script> in every HTML file the generators touch. The
   shared-core module is proved to parse by being imported; the browser AI
   adapter is fenced out of it, so ASK_SYSTEM_PROMPT and ASK_BACKEND are only
   ever checked here. */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const SITE = new URL('../', import.meta.url).pathname;
const FILES = ['index.html','fr/index.html','about.html','contact.html','resources.html',
  'admin.html','privacy.html','terms.html','accessibility.html','stay-informed.html',
  'child-travel-consent.html','404.html','tools/admin-panel.html'];
const dir = mkdtempSync(join(tmpdir(),'cjhq-syn-'));
let n=0, bad=0;
for(const f of FILES){
  const html = readFileSync(SITE + f, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i=0;
  while((m = re.exec(html))){
    const tag = m[0].slice(0, m[0].indexOf('>')+1);
    if(/type\s*=\s*["'](?!text\/javascript|module|application\/javascript)/i.test(tag)) continue;
    const body = m[1];
    if(!body.trim()) continue;
    const p = join(dir, f.replace(/\//g,'_') + '.' + (i++) + '.mjs');
    writeFileSync(p, body);
    n++;
    try{ execFileSync('node', ['--check', p], { stdio:'pipe' }); }
    catch(e){ bad++; console.log('SYNTAX ERROR in ' + f + ' script #' + (i-1) + '\n' + String(e.stderr).slice(0,600)); }
  }
}
console.log('\n=== syntax === ' + n + ' inline scripts parsed, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
