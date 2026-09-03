/* PART J - content loss, tested directly.

   Four drafts against one verified multi-unit answer. The first two must pass
   (a shorter answer that keeps the information is the whole point of the
   phrasing pass); the fourth must fail; the third is the calibration case -
   it must fail only because material information is CLEARLY gone, not because
   it is shorter. Then the end-to-end path: a model that fails twice must leave
   the user with the deterministic answer, never the no-answer template. */
import { askRun, askBuildContext, askVerifyPhrasing, askCoverageLoss, askContentUnits, ASK_TEMPLATES } from '../ask-core.mjs';
import { makeSuite } from './harness.mjs';

const Q = 'Where do I apply for a passport?';

const DRAFTS = {
  complete:
    "This is for anyone applying for their very first Canadian adult passport. To apply: complete the "
  + "passport application, have your passport photos taken, gather your required documents, have your "
  + "guarantor complete the required sections, and submit your application by mail or at a Passport "
  + "Office. Passport photos must meet Government of Canada specifications, your name must match your "
  + "citizenship document exactly, and if you are travelling soon review the current processing times.",
  concise:
    "To apply, complete the application, get compliant passport photos, gather your documents and "
  + "guarantor information, then submit it by mail or at a Passport Office. If you're travelling soon, "
  + "check current processing times.",
  partial:
    "Complete the passport application and have your photos taken, then submit it by mail or at a "
  + "Passport Office.",
  truncated:
    "You can submit your application by mail or at a Passport Office."
};

function adapterReturning(seq){
  let i = 0;
  return { model:'test', ready(){ return true; },
           async ask(){ return seq[Math.min(i++, seq.length - 1)]; } };
}

export default async function run(){
  const t = makeSuite('Part J - content loss');
  const res = await askRun(Q, { useAI:false });
  const ctx = askBuildContext(res);

  t.check('the verified answer has enough units to judge', askContentUnits(res).length >= 3, askContentUnits(res).length);

  // --- the four drafts, through the real validator -------------------------
  t.eq('1. complete answer PASSES',            askVerifyPhrasing(DRAFTS.complete,  Q, res, ctx), null);
  t.eq('2. concise but complete answer PASSES', askVerifyPhrasing(DRAFTS.concise,  Q, res, ctx), null);
  t.eq('3. partially compressed answer REJECTED', askVerifyPhrasing(DRAFTS.partial, Q, res, ctx), 'content-loss');
  t.eq('4. severely truncated answer REJECTED',  askVerifyPhrasing(DRAFTS.truncated, Q, res, ctx), 'content-loss');

  // --- it is coverage, not length -----------------------------------------
  t.check('the concise draft is much shorter than the deterministic answer',
    DRAFTS.concise.length < res.answer.length * 0.75, DRAFTS.concise.length + ' vs ' + res.answer.length);
  t.eq('and is still not flagged as content loss', askCoverageLoss(DRAFTS.concise, res), false);
  t.eq('the truncated draft is flagged', askCoverageLoss(DRAFTS.truncated, res), true);

  // --- the check never fires where it cannot judge -------------------------
  const thin = { answer:'CJHQ has a resource for that.', units:['Only one unit here'] };
  t.eq('fewer than three units: no judgement, no rejection', askCoverageLoss('Anything at all.', thin), false);
  t.eq('no units at all: no judgement, no rejection', askCoverageLoss('Anything at all.', { answer:'x', units:[] }), false);

  // --- end to end: two failures fall back to the deterministic answer -------
  const det = res.answer;
  const bad = await askRun(Q, { useAI:true }, adapterReturning([DRAFTS.truncated, DRAFTS.truncated]));
  t.eq('two failed attempts -> exactly two Gemini calls', bad.aiAttempts, 2);
  t.eq('two failed attempts -> AI not used', bad.aiUsed, false);
  t.eq('two failed attempts -> the DETERMINISTIC answer is returned', bad.answer, det);
  t.check('two failed attempts -> NOT the no-answer template',
    bad.answer !== ASK_TEMPLATES.noAnswer && bad.answer.indexOf('could not match') < 0, bad.answer.slice(0,80));
  t.eq('first rejection reason recorded', bad.aiRejected, 'content-loss');
  t.eq('second rejection reason recorded', bad.aiRejected2, 'content-loss');

  // --- a good second attempt is accepted -----------------------------------
  const rescued = await askRun(Q, { useAI:true }, adapterReturning([DRAFTS.truncated, DRAFTS.concise]));
  t.eq('attempt 2 recovers -> two calls', rescued.aiAttempts, 2);
  t.eq('attempt 2 recovers -> AI answer used', rescued.aiUsed, true);
  t.eq('attempt 2 recovers -> that is the answer', rescued.answer, DRAFTS.concise);
  t.eq('deterministic answer kept for admin comparison', rescued.deterministicAnswer, det);

  // --- a good first attempt costs exactly one call --------------------------
  let calls = 0;
  const counting = { model:'test', ready(){ return true; },
                     async ask(){ calls++; return DRAFTS.concise; } };
  const good = await askRun(Q, { useAI:true }, counting);
  t.eq('a good first attempt costs one call', calls, 1);
  t.eq('a good first attempt is used', good.aiUsed, true);

  // --- the retry prompt names the problem ----------------------------------
  let secondPrompt = null, n = 0;
  const capture = { model:'test', ready(){ return true; },
    async ask(q, c){ n++; if(n === 2) secondPrompt = c; return DRAFTS.truncated; } };
  await askRun(Q, { useAI:true }, capture);
  t.check('retry prompt states the omission explicitly',
    /omitted substantial verified information/.test(secondPrompt || ''), (secondPrompt||'').slice(-400));
  t.check('retry prompt still permits a concise answer',
    /combine or rephrase/.test(secondPrompt || ''));
  t.check('retry prompt carries the full verified context',
    (secondPrompt||'').includes('PRIMARY RESOURCE:') && (secondPrompt||'').includes('Verified CJHQ answer: '));
  t.check('retry prompt carries the rejected draft', (secondPrompt||'').includes(DRAFTS.truncated));

  // --- safety checks still take precedence ---------------------------------
  const invented = DRAFTS.complete + ' Call 514-555-0199 for help.';
  t.eq('an invented number is still caught before coverage',
    askVerifyPhrasing(invented, Q, res, ctx), 'invented-number');
  const inventedLink = DRAFTS.complete + ' See https://example.com/passport for details.';
  t.eq('an invented link is still caught before coverage',
    askVerifyPhrasing(inventedLink, Q, res, ctx), 'invented-link');

  return t.report();
}
if(import.meta.url === 'file://' + process.argv[1]) run().then(s => process.exit(s.fail ? 1 : 0));
