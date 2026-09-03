/* PART K - regression.

   The original suites live only in an earlier session's scratch directory and
   are not in the repo, so this rebuilds coverage for every area Part K names.
   Where "unchanged" is the requirement, the assertion compares against the
   DEPLOYED main branch rather than against a hand-copied expectation, so the
   test cannot drift into agreeing with a mistake. */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as NEW from '../ask-core.mjs';
import { makeSuite } from './harness.mjs';
// Baseline for the differential and the unchanged-vs-main assertions: a clean
// copy of the DEPLOYED main branch. Not in this repo by design - committing it
// would duplicate the whole site. Fetch it as the README describes, then point
// CJHQ_BASELINE at it (defaults to ../../dep_live next to the repo).
const CJHQ_BASELINE = process.env.CJHQ_BASELINE || new URL('../../dep_live/', import.meta.url).pathname;
const OLD = await import(CJHQ_BASELINE + 'ask-core.mjs');

const SITE = new URL('../', import.meta.url).pathname;
const LIVE = CJHQ_BASELINE;

export default async function run(){
  const t = makeSuite('Part K - regression');

  // ---- generator / sync -----------------------------------------------------
  for(const tool of ['tools/sync-ask-core.mjs', 'tools/generate-routes.mjs']){
    let ok = true, out = '';
    try{ out = execFileSync('node', [tool, '--check'], { cwd: SITE, encoding:'utf8' }); }
    catch(e){ ok = false; out = String(e.stdout || '') + String(e.stderr || ''); }
    t.check(tool + ' --check passes', ok, out.slice(-300));
  }

  // ---- browser isolation ----------------------------------------------------
  // Isolation is a property of the CODE, not of the prose: the module's own
  // header explains that Firebase and gstatic are fenced out, so a naive
  // substring search matches its own documentation. Comments and string
  // literals are stripped before looking.
  const stripJs = src => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
  const coreCode = stripJs(readFileSync(SITE + 'ask-core.mjs', 'utf8'));
  for(const bad of ['window.', 'document.', 'localStorage', 'sessionStorage',
                    'firebase', 'gstatic', 'AppCheck', 'appCheckReady', 'ASK_BACKEND', 'ASK_SYSTEM_PROMPT']){
    t.check('shared core has no CODE reference to ' + bad, coreCode.indexOf(bad) < 0,
      coreCode.slice(Math.max(0, coreCode.indexOf(bad) - 60), coreCode.indexOf(bad) + 60));
  }
  // The strongest isolation evidence available: this suite imported the module
  // in a bare Node process with no DOM and no Firebase, and it worked.
  t.check('shared core imports and answers in a browser-free process',
    typeof NEW.askAnswer === 'function' && typeof NEW.askRun === 'function');
  const core = readFileSync(SITE + 'ask-core.mjs', 'utf8');
  t.check('shared core still declares itself generated', core.startsWith('/* GENERATED FILE'));

  // ---- routes / SEO / robots: nothing unrelated moved ----------------------
  for(const f of ['robots.txt', 'sitemap.xml', 'CNAME', '404.html', '.nojekyll']){
    t.check(f + ' is byte-identical to the deployed branch',
      readFileSync(SITE + f, 'utf8') === readFileSync(LIVE + f, 'utf8'));
  }
  const idx = readFileSync(SITE + 'index.html', 'utf8');
  for(const marker of ['<!DOCTYPE html>', 'renderAccordion', 'askCommunityAssistant', 'ASK CJHQ',
                       '===== BROWSER AI ADAPTER: BEGIN', '===== SHARED ASK CORE: END']){
    t.check('index.html still contains ' + JSON.stringify(marker), idx.indexOf(marker) >= 0);
  }

  // ---- Gemini configuration is untouched -----------------------------------
  const oldIdx = readFileSync(LIVE + 'index.html', 'utf8');
  const cfg = s => (s.match(/const ASK_AI_CONFIG = \{[\s\S]*?\};/) || [''])[0];
  t.check('ASK_AI_CONFIG is byte-identical (model, temperature, tokens, timeout, throttle)',
    cfg(idx) === cfg(oldIdx), cfg(idx));
  const appcheck = s => (s.match(/function ensureAppCheck\(\)\{[\s\S]*?\n\}/) || [''])[0];
  t.check('App Check initialisation is byte-identical', appcheck(idx) === appcheck(oldIdx));
  const backend = s => (s.match(/const ASK_BACKEND = \{[\s\S]*?\n\};/) || [''])[0];
  t.check('ASK_BACKEND call path is byte-identical (throttle, timeout, no retry)',
    backend(idx) === backend(oldIdx));

  // ---- directory limitation wording ----------------------------------------
  const DIRQ = ['Where can I find a shul?', 'Where can I find a mikvah?', 'Where can I find kosher food?',
    'What minyanim are available?', 'Ou puis-je trouver une synagogue?', 'Ou trouver de la nourriture cachere?',
    'איפה יש מקווה?', 'וואו קען איך געפינען א שול?'];
  for(const q of DIRQ){
    const a = await OLD.askRun(q, { useAI:false }), b = await NEW.askRun(q, { useAI:false });
    t.check('directory wording unchanged: ' + q, a.answer === b.answer, 'OLD ' + a.answer + '\nNEW ' + b.answer);
    t.check('directory links unchanged: ' + q, JSON.stringify(a.actions) === JSON.stringify(b.actions));
    t.check('directory still declines to list: ' + q, b.handled === false);
  }

  // ---- FindMTL ---------------------------------------------------------------
  t.check('the eight FindMTL URLs are unchanged',
    JSON.stringify(NEW.ASK_FINDMTL) === JSON.stringify(OLD.ASK_FINDMTL));

  // ---- halachic --------------------------------------------------------------
  const HALQ = ['Can I carry in the eruv on Shabbos according to halacha?',
    'Is it mutar to travel on chol hamoed?',
    'Is it assur to apply for a passport on chol hamoed?',
    'Am I allowed to daven at the airport according to halacha?'];
  for(const q of HALQ){
    const a = await OLD.askRun(q, { useAI:false }), b = await NEW.askRun(q, { useAI:false });
    t.check('halachic guard still runs first: ' + q, b.halachic === true && /^Halachic/.test(b.handler), b.handler);
    t.check('halachic referral preserved: ' + q, /\brov\b|\brav\b/i.test(b.answer));
    t.check('halachic answer unchanged: ' + q, a.answer === b.answer, 'OLD ' + a.answer.slice(0,120) + '\nNEW ' + b.answer.slice(0,120));
    // the coverage check must never fire on a halachic answer
    t.check('coverage check does not run on halachic answers: ' + q,
      NEW.askVerifyPhrasing(b.answer, q, b, NEW.askBuildContext(b)) === null);
  }

  // ---- language ---------------------------------------------------------------
  const LANG = [['How do I apply for a passport?','en'], ['Ou puis-je demander un passeport?','fr'],
    ['איפה מגישים בקשה לדרכון?','he'],
    ['ווו קען איך באקומען א פאספארט?','yi'],
    ['vu ken ikh find passport information?','yi'],
    ['Where can I find Shabbos information?','en']];
  for(const [q, want] of LANG){
    t.eq('language detection unchanged: ' + q, NEW.askDetectLanguage(q), OLD.askDetectLanguage(q));
    t.eq('language of ' + JSON.stringify(q.slice(0,28)), NEW.askDetectLanguage(q), want);
  }

  // ---- RAMQ / NEXUS behaviour ------------------------------------------------
  for(const q of ['How do I renew my RAMQ?', 'RAMQ', 'How do I apply for RAMQ?',
                  'NEXUS', 'How do I apply for NEXUS?', 'How do I renew my NEXUS card?',
                  'What documents do I need for NEXUS?']){
    const a = await OLD.askRun(q, { useAI:false }), b = await NEW.askRun(q, { useAI:false });
    t.check('handler unchanged: ' + q, a.handler === b.handler);
    t.check('clarify-vs-answer decision unchanged: ' + q, a.handled === b.handled);
    t.check('links unchanged: ' + q, JSON.stringify(a.actions) === JSON.stringify(b.actions));
  }
  // "How do I renew my RAMQ?" retrieves across three categories - "renew"
  // scores on Passport Renewal and NEXUS Renewal too - and the approved
  // behaviour is to ask which one. The candidates it offers as links are
  // legitimate context. What must NOT happen is expansion: pulling the top
  // hit's siblings in would add passport records the user never asked about.
  const ramq = await NEW.askRun('How do I renew my RAMQ?', { useAI:false });
  t.eq('a cross-topic clarification is not expanded with siblings',
    (ramq.related||[]).length, (ramq.actions||[]).length);
  const offered = new Set((ramq.actions||[]).map(a => a.url.replace(/^\/resources\//, '')));
  t.check('every related record is one the user was actually offered',
    (ramq.related||[]).every(x => offered.has(x.item.slug) || offered.has('/' + (x.item.internalPage||''))),
    JSON.stringify((ramq.related||[]).map(x=>x.item.slug)) + ' vs ' + JSON.stringify([...offered]));
  // where the hits DO agree on a topic, expansion is what should happen
  const pp = await NEW.askRun('passport', { useAI:false });
  t.check('a single-topic clarification IS expanded with verified siblings',
    (pp.related||[]).length > (pp.actions||[]).length, (pp.related||[]).length + ' vs ' + (pp.actions||[]).length);

  // ---- sessions ---------------------------------------------------------------
  t.check('session policy unchanged', JSON.stringify(NEW.ASK_SESSION_POLICY) === JSON.stringify(OLD.ASK_SESSION_POLICY));
  const now = Date.now();
  for(const sess of [null, {}, { lastActivity: now }, { lastActivity: now - 60*60*1000 }, { lastActivity: now - 26*60*60*1000 }]){
    t.check('askSessionState unchanged for ' + JSON.stringify(sess),
      JSON.stringify(NEW.askSessionState(sess, now)) === JSON.stringify(OLD.askSessionState(sess, now)));
  }
  for(const m of ['bye', 'thanks, that is all', 'stop', 'hello again']){
    t.eq('askSessionShouldClose unchanged: ' + m, NEW.askSessionShouldClose(m), OLD.askSessionShouldClose(m));
  }

  // ---- templates ----------------------------------------------------------------
  t.check('ASK_TEMPLATES unchanged', JSON.stringify(NEW.ASK_TEMPLATES) === JSON.stringify(OLD.ASK_TEMPLATES));

  // ---- shared core / search ------------------------------------------------------
  for(const s of ["Driver's Licence", 'PASSPORT', 'Cachère', "l'enfant"]){
    t.eq('cjhqNormalizeSearch unchanged: ' + s, NEW.cjhqNormalizeSearch(s), OLD.cjhqNormalizeSearch(s));
  }
  t.eq('handler order unchanged', NEW.askPracticalHandlers().map(f=>f.name).join(','),
                                  OLD.askPracticalHandlers().map(f=>f.name).join(','));

  // ---- two-pass verification: the ceiling holds -----------------------------------
  let calls = 0;
  const always = { model:'t', ready(){ return true; }, async ask(){ calls++; return 'I cannot help with that.'; } };
  const r = await NEW.askRun('How do I apply for an adult passport?', { useAI:true }, always);
  t.eq('a model that always fails costs exactly two calls', calls, 2);
  t.eq('and the deterministic answer is what the user gets', r.aiUsed, false);
  t.check('and it is a real answer, not the no-answer template', r.answer.indexOf('could not match') < 0);
  const thrower = { model:'t', ready(){ return true; }, async ask(){ throw new Error('quota'); } };
  const r2 = await NEW.askRun('How do I apply for an adult passport?', { useAI:true }, thrower);
  t.check('a throwing adapter falls back silently', r2.aiUsed === false && !!r2.aiError && r2.answer.length > 10);
  t.check('provider detail never reaches the answer', r2.answer.indexOf('quota') < 0);

  return t.report();
}
if(import.meta.url === 'file://' + process.argv[1]) run().then(s => process.exit(s.fail ? 1 : 0));
