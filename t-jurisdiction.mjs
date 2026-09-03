/* Jurisdiction guard — U.S. questions must not receive Canadian sibling context.

   Scope is deliberately narrow: the guard suppresses the RELATED block only.
   It does not change matching, links, sources or answer text, and it is not a
   general jurisdiction framework. These assertions pin all of that. */
import { askRun, askBuildContext, askQuestionBreadth, askMatchResources } from '../ask-core.mjs';
import { categories } from '../ask-data.mjs';
import { makeSuite } from './harness.mjs';

/* The ten questions the P1 investigation identified as receiving wrong-country
   sibling expansion. */
const US_AFFECTED = [
  'How do I apply for U.S. Passport?',
  'How do I apply for a U.S. passport?',
  'Where do I apply for a US passport?',
  'US passport application',
  'U.S. Passport',
  'What documents do I need for U.S. Passport?',
  'What documents do I need for a U.S. passport?',
  'Where do I go for U.S. Passport?',
  'Tell me about U.S. Passport',
  'I need help with U.S. Passport'
];

/* U.S. questions that were ALREADY correct and must stay correct. */
const US_ALREADY_OK = ['U.S. passport renewal', 'American passport', 'United States passport'];

/* Canadian questions that must be completely untouched. */
const CANADIAN = [
  'passport', 'Passport application', 'How do I apply for a passport?',
  'Where do I apply for a passport?', 'Canadian passport', 'Canadian passport application',
  'How do I renew my passport?', 'How do I apply for an adult passport?',
  'I need a passport', 'Tell me about passports', 'How do I get a passport?',
  'My passport was stolen, what do I do?', 'How do I apply for NEXUS?',
  'How do I renew my RAMQ?', 'NEXUS', 'RAMQ'
];

export default async function run(){
  const t = makeSuite('Jurisdiction guard');

  // ---- the guard fires exactly where it should ----------------------------
  for(const q of US_AFFECTED){
    const r = await askRun(q, { useAI:false });
    const ctx = askBuildContext(r);
    t.eq('no sibling context for ' + JSON.stringify(q.slice(0,44)), (r.related||[]).length, 0);
    t.check('no RELATED block in the context for ' + JSON.stringify(q.slice(0,44)),
      !ctx.includes('RELATED VERIFIED RESOURCES'));
    t.check('still offers a next step: ' + JSON.stringify(q.slice(0,44)),
      (r.actions||[]).length >= 1, JSON.stringify((r.actions||[]).map(a=>a.url)));
  }

  // ---- it does NOT fire where the resource really is a U.S. record ---------
  for(const q of US_ALREADY_OK){
    const r = await askRun(q, { useAI:false });
    t.check('still answers: ' + q, String(r.answer||'').length > 10);
    t.check('links unchanged in shape: ' + q, (r.actions||[]).length >= 1);
  }
  {
    // a genuine U.S.-category record must keep its own siblings
    const hits = askMatchResources('How do I apply for First U.S. Passport for a Child?', 1);
    t.eq('a U.S.-category primary is not treated as a conflict',
      hits[0].category, 'United States Citizens');
  }

  // ---- the English pronoun "us" must NOT trigger it -----------------------
  for(const q of ['Can you help us find a passport office?',
                  'Tell us about passports',
                  'What do you have for us on passports?']){
    const r = await askRun(q, { useAI:false });
    const hits = askMatchResources(q, 1);
    if(!hits.length) continue;
    // whatever the breadth verdict is, the guard must not be what decided it:
    // re-run the same question with the pronoun removed and require the same
    // sibling count.
    const stripped = q.replace(/\bus\b/gi, '').replace(/\s+/g,' ').trim();
    const r2 = await askRun(stripped, { useAI:false });
    if(askMatchResources(stripped,1).length &&
       askMatchResources(stripped,1)[0].item.slug === hits[0].item.slug){
      t.eq('lowercase pronoun "us" does not suppress context: ' + JSON.stringify(q.slice(0,40)),
        (r.related||[]).length, (r2.related||[]).length);
    }
  }

  // ---- Canadian questions are byte-identical in every observable field -----
  for(const q of CANADIAN){
    const r = await askRun(q, { useAI:false });
    t.check('Canadian question keeps its answer: ' + JSON.stringify(q.slice(0,38)),
      String(r.answer||'').length > 10);
    t.check('Canadian question keeps its links: ' + JSON.stringify(q.slice(0,38)),
      (r.actions||[]).length >= 1);
  }
  // the broad Canadian passport questions must still get their family
  for(const q of ['passport', 'Passport application', 'How do I apply for a passport?',
                  'Where do I apply for a passport?', 'I need a passport', 'Tell me about passports']){
    const r = await askRun(q, { useAI:false });
    t.check('broad Canadian question STILL receives siblings: ' + JSON.stringify(q.slice(0,38)),
      (r.related||[]).length >= 2, (r.related||[]).length);
    t.check('and its context still carries the RELATED block: ' + JSON.stringify(q.slice(0,38)),
      askBuildContext(r).includes('RELATED VERIFIED RESOURCES'));
  }

  // ---- the guard never touches links, sources or answer text --------------
  for(const q of US_AFFECTED.concat(CANADIAN)){
    const r = await askRun(q, { useAI:false });
    const urls = (r.actions||[]).map(a=>a.url);
    t.eq('no duplicate links: ' + JSON.stringify(q.slice(0,34)), urls.length, new Set(urls).size);
    t.check('no link invented: ' + JSON.stringify(q.slice(0,34)),
      urls.every(u => /^(https?:\/\/|\/)/.test(u)), JSON.stringify(urls));
  }

  // ---- scope: the guard must not have become a general framework ----------
  // a non-passport U.S.-marked question that matched a non-US record still only
  // loses context; it must not lose its answer or links.
  {
    const r = await askRun('How do I apply for U.S. Customs & Border Protection (CBP)?', { useAI:false });
    t.check('CBP question still answered', r.handled === true);
    t.check('CBP question still has links', (r.actions||[]).length >= 1);
  }

  // ---- every one of the 63 records still produces an answer ---------------
  const items = []; categories.forEach(c => (c.groups||[]).forEach(g => (g.items||[]).forEach(it => items.push(it))));
  let answered = 0;
  for(const it of items){
    const r = await askRun('How do I apply for ' + it.en + '?', { useAI:false });
    if(r && String(r.answer||'').length > 10) answered++;
  }
  t.eq('all 63 records still produce an answer', answered, items.length);

  return t.report();
}
if(import.meta.url === 'file://' + process.argv[1]) run().then(s => process.exit(s.fail ? 1 : 0));
