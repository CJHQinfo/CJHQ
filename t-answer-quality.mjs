/* PART I - general answer-quality suite.
   No expected prose anywhere. Every assertion is a property the answering
   system must hold for ANY correct wording. */
import { askRun, askBuildContext, askVerifyPhrasing } from '../ask-core.mjs';
import { makeSuite, urlsIn } from './harness.mjs';
import { CORPUS } from './corpus.mjs';

export default async function run(){
  const t = makeSuite('Part I - general answer quality');
  for(const c of CORPUS){
    const q = c.q, tag = '[' + q + '] ';
    const r = await askRun(q, { useAI:false });
    if(!t.check(tag + 'produces a result', !!r)) continue;
    const ctx = askBuildContext(r);

    // correct intent
    if(c.handler)   t.eq(tag + 'handler', r.handler, c.handler);
    if(c.halachic)  t.check(tag + 'halachic guard owns it', r.halachic === true && /^Halachic/.test(r.handler), r.handler);
    if(c.directory) t.check(tag + 'stays a FindMTL referral', /findmtl\.ca/.test(JSON.stringify(r.actions)), JSON.stringify(r.actions));

    // correct retrieval breadth
    if(c.breadth)   t.eq(tag + 'breadth', r.breadth, c.breadth);
    if(c.breadth === 'broad') t.check(tag + 'broad question keeps siblings', (r.related||[]).length >= 1, (r.related||[]).length);
    if(c.breadth === 'narrow') t.eq(tag + 'narrow question stays focused', (r.related||[]).length, 0);

    // answer relevance + a real answer
    t.check(tag + 'answer is non-empty', String(r.answer||'').trim().length > 10, r.answer);
    if(c.unanswered) t.eq(tag + 'does not guess', r.handled, false);
    if(c.answered)   t.eq(tag + 'answers rather than clarifying', r.handled, true);

    // context sufficiency
    t.check(tag + 'context is built', ctx.length > 0);
    t.check(tag + 'context marks the primary resource', ctx.includes('PRIMARY RESOURCE:'), ctx.slice(0,80));
    t.check(tag + 'context carries the verified answer', ctx.includes('Verified CJHQ answer: '));
    t.check(tag + 'context states the model\'s job', ctx.includes('HOW TO USE THIS INFORMATION:'));
    if((r.related||[]).length)
      t.check(tag + 'related block is labelled as supporting context', ctx.includes('RELATED VERIFIED RESOURCES'));
    else
      t.check(tag + 'no related block when there are no siblings', !ctx.includes('RELATED VERIFIED RESOURCES'));

    // answer completeness - every unit the handler recorded is in the answer
    if((r.units||[]).length){
      const missing = r.units.filter(u => r.answer.indexOf(u) < 0);
      t.eq(tag + 'every recorded unit is in the deterministic answer', missing.length, 0);
    }
    if(c.structured) t.check(tag + 'structured answer has information units', (r.units||[]).length > 0);

    // the deterministic answer must pass its own validator, always
    t.eq(tag + 'deterministic answer passes verification', askVerifyPhrasing(r.answer, q, r, ctx), null);

    // grounding + no hallucination
    const allowed = new Set((r.actions||[]).map(a=>a.url).concat((r.sources||[]).map(s=>s.url||'')));
    t.eq(tag + 'no ungrounded URL in the answer', urlsIn(r.answer).filter(u=>!allowed.has(u)).length, 0);
    const relBlock = ctx.split('RELATED VERIFIED RESOURCES')[1] || '';
    const relOnly  = relBlock.split('HOW TO USE THIS INFORMATION')[0] || '';
    t.eq(tag + 'sibling context carries no URLs', urlsIn(relOnly).length, 0);

    // actionable next step + correct source/link selection (no link spam)
    // A halachic question CJHQ has no practical information for is answered by
    // the referral to a rov alone: there is deliberately no link, because
    // naming a rabbi or organisation is the failure the guard exists to
    // prevent. Every other answer must offer a next step.
    if(!(c.halachic && r.handler === 'Halachic'))
      t.check(tag + 'offers a next step', (r.actions||[]).length >= 1);
    t.check(tag + 'no link spam', (r.actions||[]).length <= 3, (r.actions||[]).length);
    if(r.handled && r.handler === 'CJHQ Resources')
      t.eq(tag + 'one CJHQ source for a resource answer', (r.sources||[]).length, 1);
  }
  return t.report();
}
if(import.meta.url === 'file://' + process.argv[1]) run().then(s => process.exit(s.fail ? 1 : 0));
