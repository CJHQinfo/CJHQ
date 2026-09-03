/* PRIMARY RESOURCE CONTEXT.

   The live smoke test of 2026-09-03 found that "What do I need to do for a
   Hachnoses Sefer Torah?" produced an answer asserting that the event needs a
   borough permit - the exact category claim the record was written to avoid.
   The record was right; the model never saw it. askBuildContext built the
   PRIMARY block from res.answer alone, and the deterministic answer is
   selective: askResourceIntent chooses which list to render, tips appear only
   for a steps or needs question, and answer_* is emitted only for intent
   'right'. The record's caution lives in answer_en, so on this question it was
   dropped before the context was assembled. askContextResource - the only
   function that surfaces answer_* - ran only for RELATED siblings.

   These assertions pin the fix: the primary record's complete verified content,
   including its own inline Q&A, reaches the context; the caution survives; and
   the context no longer renders an internal action URL as '</contact>'.        */
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
    { q:'What do I need to do for a Hachnoses Sefer Torah?',
      slug:'outdoor-public-events-permits',
      needle:'CJHQ cannot tell you which category applies' },
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

  /* ---- 3. Hachnoses Sefer Torah: the caution, in full ---- */

  {
    const { ctx } = await ctxFor('What do I need to do for a Hachnoses Sefer Torah?');
    t.check('caution: CJHQ cannot determine the category',
      /CJHQ cannot tell you which category applies/i.test(ctx));
    t.check('caution: the parade/procession category is attributed to the City',
      /lists a parade, march or procession among the activities a borough permit covers/i.test(ctx));
    t.check('caution: the conflicting religious-ceremony exclusion is present',
      /religious ceremony/i.test(ctx) && /does not cover/i.test(ctx));
    t.check('caution: confirm the specific event with the borough',
      /Confirm your specific event with your borough/i.test(ctx));
    t.check('caution: the police-station caveat survives',
      /neighbourhood police station/i.test(ctx));
    // The bare what_en sentence alone is what misled the model. It may still be
    // present - it is verified - but it must no longer be the only statement
    // about which activities are covered.
    t.check('the covering sentence is no longer unqualified',
      ctx.indexOf('cannot tell you which category applies') > -1);
  }

  /* ---- 4. The '</contact>' rendering artifact is gone ---- */

  const artifactCases = ['How do I contact CJHQ?', 'What is the CJHQ contact information?',
    'What do I need to do for a Hachnoses Sefer Torah?', 'Where do I apply for a passport?',
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
    const { ctx } = await ctxFor('What do I need to do for a Hachnoses Sefer Torah?');
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
    const r = await askRun('What do I need to do for a Hachnoses Sefer Torah?', { useAI:false });
    const fr = askContextPrimary(r.primary, true);
    t.check('French rendering uses the French fields',
      fr.includes(r.primary.item.answer_fr) && !fr.includes(r.primary.item.answer_en));
  }

  /* ---- 9. End to end: what the AI adapter actually receives ----

     askBuildContext is exercised directly above. This drives the real askRun
     path with a stub adapter and captures the context argument the model is
     handed, which is the thing that was actually broken: the caution existed
     in the record, the deterministic answer was correct, and the model still
     never saw it.                                                            */

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
    const r = await askRun('What do I need to do for a Hachnoses Sefer Torah?',
                           { useAI:true }, recorder);
    t.check('the adapter was called', seen.length > 0);
    const ctx = seen.length ? seen[0].context : '';
    t.check('adapter context carries the primary detail block',
      ctx.includes(PRIMARY_HEAD));
    t.check('adapter context carries: CJHQ cannot determine the category',
      /CJHQ cannot tell you which category applies/i.test(ctx));
    t.check('adapter context carries: religious-ceremony exclusion',
      /religious ceremony/i.test(ctx) && /does not cover/i.test(ctx));
    t.check('adapter context carries: confirm with the borough',
      /Confirm your specific event with your borough/i.test(ctx));
    t.check('adapter context carries: police-station caveat',
      /neighbourhood police station/i.test(ctx));

    // The answer a context-faithful model produces from that block preserves
    // the uncertainty and asserts no category.
    const ans = String(r.answer || '');
    t.check('answer preserves the uncertainty',
      /cannot tell you which category applies/i.test(ans));
    t.check('answer does not assert that a permit is required for this event',
      !/\bhachnoses[^.]{0,80}\byou need a permit\b/i.test(ans));
    t.check('answer keeps the borough-confirmation instruction',
      /Confirm your specific event with your borough/i.test(ans));
  }

  // The same faithful answer must survive the phrasing verifier - a fix that
  // delivered the caution but got it rejected would change nothing in practice.
  {
    const r = await askRun('What do I need to do for a Hachnoses Sefer Torah?', { useAI:false });
    const ctx = askBuildContext(r);
    const faithful = 'A permit is required to hold a public event on public property in '
      + 'Montréal, and applications go to your borough. CJHQ cannot tell you which '
      + 'category applies to a Hachnoses Sefer Torah. The City lists a parade, march or '
      + 'procession among the activities a borough permit covers, and separately lists a '
      + 'religious ceremony among the events the standard public-event permit does not '
      + 'cover; a procession on a street may also involve your neighbourhood police '
      + 'station. Confirm your specific event with your borough before you plan around a '
      + 'date. The City generally requires a legally incorporated organization as the '
      + 'applicant, proof of liability insurance, a site plan and the event programme, a '
      + 'SOCAN permit if there will be music, and additional fees and conditions if a '
      + 'street is closed. Deadlines differ by borough, so confirm the current deadline '
      + 'with the borough itself. CJHQ is not the permitting authority and cannot obtain '
      + 'or guarantee an approval, but can help you prepare a request and follow up. You '
      + 'can copy info@cjhq.org when you write to the City or a borough.';
    t.eq('a cautious, context-faithful answer is accepted by the verifier',
      askVerifyPhrasing(faithful, 'What do I need to do for a Hachnoses Sefer Torah?', r, ctx),
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
