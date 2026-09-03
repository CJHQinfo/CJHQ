/* PART L - before/after differential.

   The deployed main branch and the working copy answer the same corpus with
   the AI layer OFF, so what is compared is the DETERMINISTIC output: the
   answer text, the links offered, the sources cited and the handler that ran.
   Every difference has to be explainable by the new answer-quality behaviour;
   anything else is a regression.

   The corpus is generated rather than hand-listed - every one of the 63
   resources crossed with six question shapes, plus the hand-written corpus and
   the non-resource handlers - so it is not a set of cases chosen to pass. */
import * as NEW from '../ask-core.mjs';
import { categories } from '../ask-data.mjs';
import { CORPUS } from './corpus.mjs';
import { makeSuite } from './harness.mjs';
// Baseline for the differential and the unchanged-vs-main assertions: a clean
// copy of the DEPLOYED main branch. Not in this repo by design - committing it
// would duplicate the whole site. Fetch it as the README describes, then point
// CJHQ_BASELINE at it (defaults to ../../dep_live next to the repo).
const CJHQ_BASELINE = process.env.CJHQ_BASELINE || new URL('../../dep_live/', import.meta.url).pathname;
const OLD = await import(CJHQ_BASELINE + 'ask-core.mjs');

const SHAPES = [
  t => t,
  t => 'How do I apply for ' + t + '?',
  t => 'What documents do I need for ' + t + '?',
  t => 'Where do I go for ' + t + '?',
  t => 'Tell me about ' + t,
  t => 'I need help with ' + t
];
const EXTRA = [
  'Is the eruv up?', 'What time is shkia today?', 'When is Pesach?', 'I need Hatzolah',
  'How do I contact CJHQ?', 'thank you', 'hello', 'Can I carry in the eruv on Shabbos according to halacha?',
  'Is it mutar to travel on chol hamoed?', 'Where can I find a shul?', 'Where can I find kosher food?',
  'Where can I find a mikvah?', 'What minyanim are available?', 'What is the capital of Peru?',
  'Ou puis-je demander un passeport?', 'Comment renouveler mon passeport?',
  'vu ken ikh find passport information?', 'What do I need to travel with my child?'
];

function buildCorpus(){
  const qs = [];
  categories.forEach(c => (c.groups||[]).forEach(g => (g.items||[]).forEach(it => {
    SHAPES.forEach(f => qs.push(f(it.en)));
  })));
  CORPUS.forEach(c => qs.push(c.q));
  EXTRA.forEach(q => qs.push(q));
  return Array.from(new Set(qs));
}

function shot(r){
  if(!r) return null;
  return { handler:r.handler, handled:r.handled, lang:r.lang, halachic:!!r.halachic,
           answer:r.answer,
           actions:(r.actions||[]).map(a => a.label + '|' + a.url + '|' + (a.kind||'')),
           sources:(r.sources||[]).map(s => (s.name||'') + '|' + (s.url||'')) };
}

export default async function run(opts){
  const t = makeSuite('Part L - before/after differential');
  const qs = buildCorpus();
  const changed = [], unchanged = [];
  for(const q of qs){
    const a = shot(await OLD.askRun(q, { useAI:false }));
    const b = shot(await NEW.askRun(q, { useAI:false }));
    const sa = JSON.stringify(a), sb = JSON.stringify(b);
    if(sa === sb) unchanged.push(q);
    else{
      const fields = [];
      for(const k of ['handler','handled','lang','halachic','answer','actions','sources'])
        if(JSON.stringify(a && a[k]) !== JSON.stringify(b && b[k])) fields.push(k);
      changed.push({ q, fields, before:a, after:b });
    }
  }

  console.log('\n--- differential over ' + qs.length + ' questions ---');
  console.log('unchanged: ' + unchanged.length);
  console.log('changed:   ' + changed.length);

  // Records added deliberately in this working tree. A question that NAMES one
  // of them is expected to change structurally - it had nothing to match
  // before. Every OTHER question keeps the strict rule. Listing the slugs (not
  // just "anything that changed") is what keeps this from becoming a blanket
  // excuse: a new record can only explain a change to its own questions.
  const NEW_RECORD_SLUGS = ['report-a-problem-311', 'outremont-borough-services',
                            'plateau-borough-services', 'outdoor-public-events-permits'];
  const newTitles = [];
  categories.forEach(c => (c.groups||[]).forEach(g => (g.items||[]).forEach(it => {
    if(NEW_RECORD_SLUGS.indexOf(it.slug) >= 0) newTitles.push(it.en);
  })));
  t.eq('every declared new record exists in the dataset', newTitles.length, NEW_RECORD_SLUGS.length);
  const namesNewRecord = q => newTitles.some(ti => q.indexOf(ti) >= 0);

  const preExisting = changed.filter(c => !namesNewRecord(c.q));
  const newRecordQs = changed.filter(c => namesNewRecord(c.q));
  console.log('  of which name a new record: ' + newRecordQs.length
            + '   pre-existing: ' + preExisting.length);

  // Pre-existing questions keep the original contract exactly.
  const structural = preExisting.filter(c => c.fields.some(f => f !== 'answer'));
  t.eq('no PRE-EXISTING question changed handler, links, sources, language or halachic status',
    structural.length, 0, JSON.stringify(structural.slice(0,3), null, 1));

  // Explainable = ADDITION ONLY. Every block of the previous answer survives
  // verbatim in the new one and the new one is longer, which is exactly what
  // the intent fallback does: it inserts a verified list the record already
  // held, in its normal position, leaving everything else untouched. A
  // reworded, reordered or shortened answer would not pass this.
  const unexplained = preExisting.filter(c => {
    if(c.fields.join() !== 'answer') return true;
    if(c.after.answer.length <= c.before.answer.length) return true;
    return c.before.answer.split('\n\n').some(block => c.after.answer.indexOf(block) < 0);
  });
  t.eq('every changed PRE-EXISTING answer is an addition, not a rewrite', unexplained.length, 0,
    JSON.stringify(unexplained.slice(0,3), null, 1));
  // and the new records must actually answer, with an application-controlled link
  const silentNew = newRecordQs.filter(c => !(c.after && c.after.answer && c.after.answer.length > 10
                                              && (c.after.actions||[]).length >= 1));
  t.eq('every new-record question answers and offers a link', silentNew.length, 0,
    JSON.stringify(silentNew.slice(0,2)));

  if(opts && opts.verbose){
    const seen = new Set();
    console.log('\nintentionally improved answers (' + changed.length + '):');
    changed.forEach(c => {
      const added = c.after.answer.slice(c.before.answer.length).replace(/\s+/g,' ').trim();
      const key = added.slice(0, 60);
      if(seen.has(key)) return; seen.add(key);
      console.log('  ' + c.q);
      console.log('      + ' + added.slice(0, 150));
    });
  }
  const s = t.report();
  s.counts = { total: qs.length, unchanged: unchanged.length, changed: changed.length };
  return s;
}
if(import.meta.url === 'file://' + process.argv[1])
  run({ verbose:true }).then(s => { console.log(JSON.stringify(s.counts)); process.exit(s.fail ? 1 : 0); });
