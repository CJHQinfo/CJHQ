/* PRIMARY RESOURCE CONTEXT.

   These assertions pin two behaviors:

   1. The primary record's complete verified content, including its own inline
      Q&A, reaches the AI context (the 2026-09-03 fix: askBuildContext used to
      build the PRIMARY block from res.answer alone, which is selective), and
      an internal action URL never renders as '</contact>'.
   2. Since the 12 Oct 2026 removal of the events record's Hachnoses-specific
      Q&A (kept by the owner on 29 Oct), Hachnoses Sefer Torah phrasings get no
      match and no guessed answer.                                             */
import { askRun, askBuildContext, askContextPrimary, askCjhqResources,
         askVerifyPhrasing } from '../ask-core.mjs';
import { makeSuite } from './harness.mjs';

async function ctxFor(q, opts){
  const r = await askRun(q, Object.assign({ useAI:false }, opts || {}));
  return { res:r, ctx: askBuildContext(r) };
}
const PRIMARY_HEAD = 'PRIMARY RESOURCE DETAIL';

export default async function run(){
  const t = makeSuite('Primary-resource context');

  /* ---- 1. The primary record's inline Q&A reaches the context ---- */

  // Three records with material inline Q&A, each reached by a question whose
  // intent is NOT 'right' - which is precisely when the deterministic answer
  // omits answer_* and the old context therefore lost it.
  const inlineQA = [
    { q:'How do I contact the mayor of the Plateau?',
      slug:'plateau-borough-services',
      needle:'Not for a routine service problem' },
    { q:'How do I report a municipal service problem in Outremont?',
      slug:'report-a-problem-311',
      needle:'Start with 311 for a routine service problem' },
    { q:'How do I contact the mayor of Outremont?',
      slug:'outremont-borough-services',
      needle:'Not for a routine service problem' }
  ];

  for(const c of inlineQA){
    const { res, ctx } = await ctxFor(c.q);
    t.check('primary attached: ' + c.slug,
      !!(res.primary && res.primary.item && res.primary.item.slug === c.slug));
    t.check('primary detail block present: ' + c.slug, ctx.includes(PRIMARY_HEAD));
    t.check('inline Q&A question label present: ' + c.slug,
      /This resource also answers a specific question about itself:/.test(ctx));
    t.check('inline Q&A answer reaches context: ' + c.slug, ctx.includes(c.needle));
    // The pair must be complete, not just the answer half.
    const item = res.primary.item;
    if(item.question_en) t.check('inline Q&A question reaches context: ' + c.slug,
      ctx.includes(item.question_en));
    // Verbatim and uncapped - the 220-char sibling cap is what truncated the
    // Hachnoses caution mid-sentence, removing the negation.
    t.check('inline Q&A is verbatim, not truncated: ' + c.slug,
      ctx.includes(item.answer_en) && !ctx.includes(item.answer_en.slice(0,219) + '…'));
  }

  /* ---- 2. Every structured field the record carries reaches the context ---- */

  for(const c of inlineQA.concat([{ q:'Where do I apply for a passport?',
                                    slug:'adult-passport-application', needle:null }])){
    const { res, ctx } = await ctxFor(c.q);
    const it = res.primary && res.primary.item;
    t.check('has primary item: ' + c.slug, !!it);
    if(!it) continue;
    if(it.what_en)  t.check('what_en in context: ' + c.slug, ctx.includes(it.what_en));
    if(it.desc_en)  t.check('desc_en in context: ' + c.slug, ctx.includes(it.desc_en));
    for(const x of (it.need_list_en || []))
      t.check('need item in context: ' + c.slug, ctx.includes(x));
    for(const x of (it.steps_list_en || []))
      t.check('step item in context: ' + c.slug, ctx.includes(x));
    for(const x of (it.tips_list_en || []))
      t.check('tip item in context: ' + c.slug, ctx.includes(x));
  }

  /* ---- 3. Hachnoses Sefer Torah: no match, no guess ----

     The events record's Hachnoses Q&A was removed on 12 Oct 2026 and the owner
     kept that removal on 29 Oct. The engine must not guess: these phrasings
     come back unhandled, with no primary block and no fabricated permit
     guidance.                                                                  */
  for(const q of ['What do I need to do for a Hachnoses Sefer Torah?',
                  'How do I get a permit for a Hachnoses Sefer Torah procession?']){
    const { res, ctx } = await ctxFor(q);
    t.eq('Hachnoses phrasing is not handled: ' + JSON.stringify(q.slice(0,44)), !!res.handled, false);
    t.check('answer declines to guess: ' + JSON.stringify(q.slice(0,44)),
      /not going to guess/.test(res.answer || ''));
    t.check('no primary detail block: ' + JSON.stringify(q.slice(0,44)),
      !ctx.includes(PRIMARY_HEAD));
  }

  /* ---- 4. The '</contact>' rendering artifact is gone ---- */

  const artifactCases = ['How do I contact CJHQ?', 'What is the CJHQ contact information?',
    'How do I contact the mayor of the Plateau?', 'Where do I apply for a passport?',
    'How do I report a municipal service problem in Outremont?'];
  for(const q of artifactCases){
    const { res, ctx } = await ctxFor(q);
    for(const line of ctx.split('\n').filter(l => l.startsWith('Link offered to the user:'))){
      t.check('no angle-bracket URL in offered link: ' + q, !/[<>]/.test(line));
      t.check('offered link uses parentheses: ' + q, /\([^()]+\)$/.test(line));
    }
    // The rendered action itself is untouched.
    for(const a of (res.actions || []))
      t.check('action url still reaches the context verbatim: ' + q, ctx.includes(a.url));
  }
  {
    const { ctx } = await ctxFor('How do I contact CJHQ?');
    t.eq('contact action rendered as plain text',
      ctx.includes('Link offered to the user: Contact CJHQ (/contact)'), true);
    t.eq('no </contact> anywhere in the context', ctx.includes('</contact>'), false);
  }

  /* ---- 5. PRIMARY and RELATED stay distinct ---- */

  {
    const { ctx } = await ctxFor('Where do I apply for a passport?');
    const iP = ctx.indexOf(PRIMARY_HEAD), iR = ctx.indexOf('RELATED VERIFIED RESOURCES');
    t.check('both blocks present', iP > -1 && iR > -1);
    t.check('primary detail precedes related', iP < iR);
    // Siblings are still capped supporting context, not promoted to full detail.
    const relBlock = ctx.slice(iR);
    t.check('related block still uses the sibling renderer',
      /Which route applies:/.test(relBlock));
    t.check('related block carries no primary detail heading',
      !relBlock.includes(PRIMARY_HEAD));
  }

  // The clarification branch has no primary resource, by design, and must not
  // acquire one.
  {
    const r = askCjhqResources('I want to complain in Outremont about street cleaning.', 'en');
    if(r && r.handled && !r.resourceTitle){
      t.check('clarification branch has no primary', !r.primary);
      t.check('clarification context has no primary detail block',
        !askBuildContext(r).includes(PRIMARY_HEAD));
    }
  }

  /* ---- 6. No URLs are introduced by the new block ---- */

  for(const q of artifactCases){
    const { res, ctx } = await ctxFor(q);
    const detail = ctx.includes(PRIMARY_HEAD)
      ? ctx.slice(ctx.indexOf(PRIMARY_HEAD), ctx.indexOf('\n\n', ctx.indexOf(PRIMARY_HEAD)))
      : '';
    t.check('primary detail block contains no URL: ' + q, !/https?:\/\//.test(detail));
  }

  /* ---- 7. Handlers with no resource record are untouched ---- */

  for(const q of ['Is the eruv up?', 'What time is shkia today?', 'I need Hatzolah',
                  'When is Pesach?', 'Where can I find a mikvah?',
                  'Can I carry in the eruv on Shabbos according to halacha?']){
    const { res, ctx } = await ctxFor(q);
    t.check('no primary attached: ' + q, !res.primary);
    t.check('no primary detail block: ' + q, !ctx.includes(PRIMARY_HEAD));
  }

  /* ---- 8. askContextPrimary itself ---- */

  t.eq('empty entry renders nothing', askContextPrimary(null, false), '');
  t.eq('entry without an item renders nothing', askContextPrimary({}, false), '');
  t.eq('record with no renderable field renders nothing',
    askContextPrimary({ item:{ en:'X', slug:'x' } }, false), '');
  {
    const r = await askRun('How do I report a municipal service problem in Outremont?', { useAI:false });
    const fr = askContextPrimary(r.primary, true);
    t.check('French rendering uses the French fields',
      fr.includes(r.primary.item.answer_fr) && !fr.includes(r.primary.item.answer_en));
  }

  /* ---- 9. End to end: what the AI adapter actually receives ----

     askBuildContext is exercised directly above. This drives the real askRun
     path with a stub adapter and captures the context argument the model is
     handed: the primary record's inline Q&A must be in it, and an answer built
     from that context must survive the phrasing verifier.                    */

  const seen = [];
  const recorder = {
    ready(){ return true; },
    async ask(question, context){
      seen.push({ question, context });
      // A context-faithful model: answer from the PRIMARY RESOURCE DETAIL
      // block and nothing else. Echoing only the caution would - correctly -
      // be rejected by the coverage check for dropping the steps and the
      // requirements, so the stub uses the whole block, which is what a model
      // told to preserve the substantive information is supposed to do.
      const i = String(context || '').indexOf(PRIMARY_HEAD);
      if(i < 0) return 'No verified detail was supplied.';
      const block = context.slice(i).split('\n\n')[0]
        .split('\n').slice(1)
        .filter(l => !/^If this record states a limit/.test(l))
        .map(l => l.replace(/^\s*(?:[-\d]+[.)]?\s*)?/, '').trim())
        .filter(Boolean);
      return block.join(' ');
    }
  };

  {
    seen.length = 0;
    const r = await askRun('How do I report a municipal service problem in Outremont?',
                           { useAI:true }, recorder);
    t.check('the adapter was called', seen.length > 0);
    const ctx = seen.length ? seen[0].context : '';
    t.check('adapter context carries the primary detail block',
      ctx.includes(PRIMARY_HEAD));
    t.check('adapter context carries the inline Q&A label',
      /This resource also answers a specific question about itself:/.test(ctx));
    t.check('adapter context carries the routing caution',
      /Start with 311 for a routine service problem/i.test(ctx));

    // The answer a context-faithful model produces from that block keeps the
    // caution and the 311-first routing.
    const ans = String(r.answer || '');
    t.check('answer keeps the 311-first routing',
      /Start with 311 for a routine service problem/i.test(ans));
    t.check('answer keeps the escalation path',
      /borough office/i.test(ans) && /elected official/i.test(ans));
  }

  // The same faithful answer must survive the phrasing verifier - a fix that
  // delivered the caution but got it rejected would change nothing in practice.
  {
    const r = await askRun('How do I report a municipal service problem in Outremont?', { useAI:false });
    const ctx = askBuildContext(r);
    const rec = r.primary.item;
    const faithful = [rec.what_en, rec.question_en, rec.answer_en,
      (rec.need_list_en||[]).join(' '), (rec.steps_list_en||[]).join(' '),
      (rec.tips_list_en||[]).join(' ')].filter(Boolean).join(' ');
    t.eq('a context-faithful answer is accepted by the verifier',
      askVerifyPhrasing(faithful, 'How do I report a municipal service problem in Outremont?', r, ctx),
      null);
  }

  // Two more records with material inline Q&A, driven the same way.
  for(const q of ['How do I report a municipal service problem in Outremont?',
                  'Where do I apply for a passport?']){
    seen.length = 0;
    await askRun(q, { useAI:true }, recorder);
    const ctx = seen.length ? seen[0].context : '';
    t.check('adapter context has primary detail: ' + q, ctx.includes(PRIMARY_HEAD));
    t.check('adapter context has no angle-bracket offered link: ' + q,
      !/Link offered to the user: [^\n]*</.test(ctx));
  }

  return t.report();
}
