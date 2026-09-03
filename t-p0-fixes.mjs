/* P0 regression suite — the two pre-deployment fixes.

   P0 #1  askCoverageLoss now compares inflected forms (completed/complete,
          gathered/gather) instead of exact tokens only.
   P0 #2  askQuestionBreadth filters the matcher's own stopword list before
          deciding, so an English preposition or a French article can no longer
          act as a route-choosing word.

   Both halves assert the FIX and the NON-REGRESSION together: the false
   positives must clear, and everything the checks were catching before must
   still be caught. */
import { askRun, askBuildContext, askVerifyPhrasing, askCoverageLoss, askContentUnits,
         askQuestionBreadth, askMatchResources, askSameTopicSiblings, cjhqNormalizeSearch } from '../ask-core.mjs';
import { categories } from '../ask-data.mjs';
import { makeSuite } from './harness.mjs';

const Q = 'Where do I apply for a passport?';

/* ---- the exact drafts from the pre-deployment review --------------------- */
const D = {
  falsePos1: "Submit it by mail or at a Passport Office once you've completed the application, "
           + "taken photos and gathered your documents with a guarantor.",
  falsePos2: "First you complete the application and get your photos taken. Then you gather the "
           + "required documents, have a guarantor complete their sections, and submit everything "
           + "by mail or at a Passport Office.",
  good:      "To apply, complete the application, get compliant passport photos, gather your documents "
           + "and guarantor information, then submit it by mail or at a Passport Office. If you're "
           + "travelling soon, check current processing times.",
  tipsOnly:  "You can submit your application by mail or at a Passport Office. First complete the passport "
           + "application, have your passport photos taken, gather your required documents and have your "
           + "guarantor complete their sections.",
  partial:   "Complete the passport application and have your photos taken, then submit it by mail or at "
           + "a Passport Office.",
  truncated: "You can submit your application by mail or at a Passport Office.",
  whereOnly: "You can apply by mail or in person at a Passport Office."
};

/* The matcher's stopword list, as the review named them. Not a copy used by
   the code - the code reads ASK_QUERY_STOP; this is the list of words the
   review found were DECIDING breadth, restated here so the test fails loudly
   if any of them starts deciding again. */
const OFFENDERS = ['for','find','your','with','from','pour','des','une','faire','trouver','les'];
const GENERIC = ['apply','application','get','submit','service','canada','canadian','form','process'];

/* A reference implementation of the PRE-FIX classifier: identical to the
   shipped one except that it does NOT filter the matcher's stopwords. The
   fix is expressed as an equivalence -

     shipped(question)  ===  legacy(question with stopwords removed)

   which fails immediately if the filter line is deleted, and is not
   tautological because legacy(question) itself still differs. */
function stem(w){
  const x = String(w||''); if(x.length < 5) return x;
  const suf = ['ations','ational','ation','ements','ement','ments','ment','ings','ing','ers','ies','ied','ed','al','s'];
  if(x.endsWith('y')) return x.slice(0,-1) + 'i';
  for(const sf of suf){ if(x.length - sf.length >= 4 && x.endsWith(sf)){ let b = x.slice(0, x.length - sf.length); if(sf === 'ies') b += 'y'; return b; } }
  return x;
}
function titleHas(title, w){
  const toks = String(title||'').split(/\s+/).filter(Boolean);
  if(toks.indexOf(w) >= 0) return true;
  const ws = stem(w); if(ws.length < 4) return false;
  return toks.some(t => { const ts = stem(t); if(ts.length < 4) return false;
    const s2 = ws.length <= ts.length ? ws : ts, l = ws.length <= ts.length ? ts : ws;
    return l.length - s2.length <= 3 && l.indexOf(s2) === 0; });
}
const GENERIC_SET = new Set(['apply','application','applications','applying','demande','demandes','demander',
  'get','getting','obtain','obtaining','obtenir','submit','submitting','soumettre',
  'service','services','canadian','canada','canadien','canadienne','canadiens',
  'form','forms','formulaire','formulaires','process','processus','procedure']);
function legacyBreadth(question, item, dropStop){
  const sibs = askSameTopicSiblings(item, 6);
  if(!sibs.length) return { verdict:'narrow', by:'(no siblings)' };
  const T = x => cjhqNormalizeSearch((String(x.en||'') + ' ' + String(x.fr||'')).toLowerCase());
  const primary = T(item), sibT = sibs.map(s => T(s.item));
  const words = cjhqNormalizeSearch(String(question||'').toLowerCase())
    .replace(/[\u2019']/g,' ').split(/\s+/).map(w => w.replace(/[^a-z0-9]/g,''))
    .filter(w => w.length > 2 && !(dropStop && OFFENDERS.indexOf(w) >= 0));
  for(const w of words){
    if(GENERIC_SET.has(w)) continue;
    if(!titleHas(primary, w)) continue;
    if(sibT.filter(t => titleHas(t, w)).length * 2 <= sibT.length) return { verdict:'narrow', by:w };
  }
  return { verdict:'broad', by:'(none)' };
}

export default async function run(){
  const t = makeSuite('P0 fixes — coverage inflection + breadth stopwords');
  const res = await askRun(Q, { useAI:false });
  const ctx = askBuildContext(res);
  const v = d => askVerifyPhrasing(d, Q, res, ctx);

  // ---------- P0 #1: the false positives are cleared ----------------------
  t.eq('P0#1 "completed"/"gathered" draft no longer rejected', v(D.falsePos1), null);
  t.eq('P0#1 same content, different inflections, also passes',  v(D.falsePos2), null);
  t.eq('P0#1 stem match is symmetric: completed~complete', askCoverageLoss(D.falsePos1, res), false);

  // ---------- P0 #1: detection is NOT weakened ----------------------------
  t.eq('P0#1 REGRESSION severely truncated draft still rejected', v(D.truncated), 'content-loss');
  t.eq('P0#1 REGRESSION partially compressed draft still rejected', v(D.partial), 'content-loss');
  t.eq('P0#1 REGRESSION where-only draft still rejected', v(D.whereOnly), 'content-loss');
  t.eq('P0#1 REGRESSION legitimately concise draft still passes', v(D.good), null);
  t.eq('P0#1 REGRESSION dropping only the tips still passes', v(D.tipsOnly), null);

  // the guards are untouched
  t.eq('P0#1 fewer than three units still means no judgement',
    askCoverageLoss('anything', { answer:'x', units:['only one unit here'] }), false);
  t.eq('P0#1 no units still means no judgement',
    askCoverageLoss('anything', { answer:'x', units:[] }), false);
  t.eq('P0#1 safety checks still take precedence over coverage',
    v(D.truncated + ' Call 514-555-0199.'), 'invented-number');

  // inflection must not become a licence for unrelated words
  const fake = { answer:'x', units:['Traveller information','Basic health information','Travel dates and destination'] };
  t.eq('P0#1 "travel" does NOT cover "traveller" (tolerance is 1 char, not 3)',
    askCoverageLoss('Travel medical insurance helps protect you while travelling.', fake), true);

  // ---------- P0 #1: the ground truth is never rejected -------------------
  /* Exact-token coverage — the PRE-FIX matcher — so the detection comparison is
     computed here rather than quoted from an earlier run. Stemming can only add
     matches, so it can only ever REDUCE the number of drafts rejected; this
     measures by how much, and requires it to be zero on the target failure. */
  const UNIT_STOP = new Set(['your','have','with','from','that','this','they','them','will','must','need','needs',
    'make','sure','been','into','when','then','than','their','there','here','what','which','while','also','only',
    'more','most','some','each','both','other','before','after','about','over','under','once','being','does','done',
    'take','takes','taken','give','gives','vous','avec','pour','dans','votre','vos','les','des','une','que','qui',
    'sur','est','sont','plus','tout','tous','toute','toutes','ainsi','aussi','avant','apres','entre','leur','leurs','cette']);
  const unitToks = v => Array.from(new Set(String(v||'').toLowerCase()
    .split(/[^a-z0-9\u00e0-\u00ff]+/).filter(w => w.length > 3 && !UNIT_STOP.has(w))));
  function exactCoverageLoss(draft, r){
    const units = askContentUnits(r);
    if(units.length < 3) return false;
    const judgeable = units.map(unitToks).filter(t => t.length >= 2);
    if(judgeable.length < 3) return false;
    const hay = ' ' + String(draft||'').toLowerCase().split(/[^a-z0-9\u00e0-\u00ff]+/).join(' ') + ' ';
    let kept = 0;
    for(const toks of judgeable){
      if(toks.filter(t => hay.indexOf(' ' + t + ' ') >= 0).length * 2 >= toks.length) kept++;
    }
    return kept * 2 < judgeable.length;
  }

  let judged = 0, wrongly = 0, caught = 0, exactCaught = 0, exactWrongly = 0;
  const items = [];
  categories.forEach(c => (c.groups||[]).forEach(g => (g.items||[]).forEach(it => items.push(it))));
  for(const it of items){
    const r = await askRun('How do I apply for ' + it.en + '?', { useAI:false });
    if(!r || !r.handled || askContentUnits(r).length < 3) continue;
    judged++;
    if(askCoverageLoss(r.answer, r)) wrongly++;                       // must never happen
    if(exactCoverageLoss(r.answer, r)) exactWrongly++;
    const lastUnit = r.units[r.units.length - 1];
    if(askCoverageLoss(lastUnit, r)) caught++;                        // the Part-A failure
    if(exactCoverageLoss(lastUnit, r)) exactCaught++;
  }
  t.check('P0#1 measurable records', judged >= 30, judged);
  t.eq('P0#1 the deterministic answer is never flagged as content loss', wrongly, 0);
  t.eq('P0#1 neither matcher ever flags the deterministic answer', wrongly + exactWrongly, 0);
  t.eq('P0#1 last-unit-only detection is UNCHANGED by the stemming fix',
    caught, exactCaught);
  t.check('P0#1 catch rate', caught / judged >= 0.85, caught + '/' + judged + ' (exact-token reference: ' + exactCaught + ')');

  // ---------- P0 #2: no stopword decides breadth any more ------------------
  const PROBES = [
    'What documents do I need for NEXUS?', 'How do I apply for NEXUS?', 'Apply for NEXUS',
    'How do I apply for RAMQ?', 'Find a Passport Office', 'How do I find a passport office?',
    'What is your passport renewal process?', 'How do I apply for First U.S. Passport for a Child?',
    'Comment faire une demande pour un passeport?',
    'Ou puis-je trouver des renseignements sur les passeports?',
    'Ou puis-je demander un passeport pour mon enfant?',
    'Where do I go for Apply for NEXUS?', 'I need help with Find a Family Doctor'
  ];
  let equiv = 0, legacyDiffered = 0;
  for(const q of PROBES){
    const hits = askMatchResources(q, 3);
    if(!hits.length) continue;
    const item = hits[0].item;
    const shipped = askQuestionBreadth(q, item);
    const withStop = legacyBreadth(q, item, false);      // pre-fix behaviour
    const noStop   = legacyBreadth(q, item, true);       // stopwords removed
    t.eq('P0#2 shipped === stopword-free reference for ' + JSON.stringify(q.slice(0,42)),
      shipped, noStop.verdict);
    t.check('P0#2 no stopword decides ' + JSON.stringify(q.slice(0,42)),
      OFFENDERS.indexOf(noStop.by) < 0, 'decided by "' + noStop.by + '"');
    equiv++;
    if(withStop.by !== noStop.by) legacyDiffered++;
  }
  t.check('P0#2 probes evaluated', equiv >= 10, equiv);
  t.check('P0#2 the fix actually changed the deciding word for most probes',
    legacyDiffered >= 8, legacyDiffered + ' of ' + equiv);

  // sweep: shipped must equal the stopword-free reference across the corpus,
  // and the pre-fix reference must differ on the cases the review found.
  const SHAPES = [t0=>t0, t0=>'How do I apply for '+t0+'?', t0=>'What documents do I need for '+t0+'?',
                  t0=>'Where do I go for '+t0+'?', t0=>'Tell me about '+t0, t0=>'I need help with '+t0];
  const qs = []; items.forEach(it => SHAPES.forEach(f => qs.push(f(it.en))));
  let evaluated = 0, mismatch = 0, wasStopDriven = 0;
  for(const q of [...new Set(qs)]){
    const hits = askMatchResources(q, 3); if(!hits.length) continue;
    const item = hits[0].item;
    if(!askSameTopicSiblings(item, 6).length) continue;
    evaluated++;
    const noStop = legacyBreadth(q, item, true);
    if(askQuestionBreadth(q, item) !== noStop.verdict) mismatch++;
    if(OFFENDERS.indexOf(legacyBreadth(q, item, false).by) >= 0) wasStopDriven++;
  }
  t.check('P0#2 corpus evaluated', evaluated > 300, evaluated);
  t.eq('P0#2 shipped classifier matches the stopword-free reference everywhere', mismatch, 0);
  t.check('P0#2 the review\'s stopword-driven cases existed before the fix',
    wasStopDriven >= 20, wasStopDriven);

  // ---------- P0 #2: generic-term handling is preserved --------------------
  t.eq('P0#2 "Where do I apply for a passport?" is still broad',
    askQuestionBreadth('Where do I apply for a passport?', askMatchResources('Where do I apply for a passport?',1)[0].item), 'broad');
  for(const q of ['passport','I need a passport','How do I get a passport?','Tell me about passports']){
    t.eq('P0#2 REGRESSION still broad: ' + q,
      askQuestionBreadth(q, askMatchResources(q,1)[0].item), 'broad');
  }
  for(const q of ['How do I renew my passport?','How do I renew my adult passport?','How do I apply for a child passport?',
                  'My passport was stolen, what do I do?','Where is the nearest passport office?','How do I renew NEXUS?']){
    t.eq('P0#2 REGRESSION still narrow: ' + q,
      askQuestionBreadth(q, askMatchResources(q,1)[0].item), 'narrow');
  }
  // Generic handling is preserved: "application" appears in the primary title
  // ("Adult Passport Application") and in none of its siblings, so without
  // ASK_GENERIC_TOKENS it would narrow this question. It must not.
  {
    const q = 'passport application';
    const hits = askMatchResources(q, 1);
    t.eq('P0#2 "application" is still neutralised by the generic list',
      askQuestionBreadth(q, hits[0].item), 'broad');
    t.eq('P0#2 and the pre-fix reference agrees (generic handling untouched)',
      legacyBreadth(q, hits[0].item, false).verdict, 'broad');
  }

  // ---------- P0 #2: the matcher itself is untouched -----------------------
  t.check('P0#2 matcher still filters its own stopwords (one-word question)',
    askMatchResources('the and for you your', 3).length === 0);
  t.check('P0#2 matcher still scores a real question',
    askMatchResources('How do I renew my passport?', 3).length > 0);

  return t.report();
}
if(import.meta.url === 'file://' + process.argv[1]) run().then(s => process.exit(s.fail ? 1 : 0));
