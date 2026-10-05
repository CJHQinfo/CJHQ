import {askRun,askVerifyPhrasing,askBuildContext} from '../ask-core.mjs';
import {makeSuite} from './harness.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export default async function run(){
 const t=makeSuite('Readiness - zero AI and verifier boundaries');
 const res={answer:'Call CJHQ for passport help.',actions:[],sources:[{name:'CJHQ',url:'https://cjhq.org/resources'}]};
 const ctx=askBuildContext(res);
 for(const url of ['https://cjhq.org/resource','https://cjhq.org','https://cjhq.org/resources-fake'])
  t.eq('reject non-exact URL '+url,askVerifyPhrasing('Passport help: '+url,'passport',res,ctx),'invented-link');
 t.eq('accept exact URL',askVerifyPhrasing('Passport help: https://cjhq.org/resources.','passport',res,ctx),null);
 for(const n of ['5145550199','+15145550199','(514) 555-0199','514.555.0199'])
  t.eq('reject invented number '+n,askVerifyPhrasing('Call '+n+' for passport help.','passport',res,ctx),'invented-number');
 const phoneCtx=ctx+' Verified phone: (514) 555-0199';
 for(const n of ['5145550199','+15145550199','514-555-0199'])
  t.eq('preserve verified number across formatting '+n,askVerifyPhrasing('Call '+n+' for passport help.','passport',res,phoneCtx),null);
 const r=await askRun('How long does a passport take?',{useAI:false});
 t.eq('duration question never answers with trip registration',r.handler,'none');
 t.eq('duration gap is disclosed',r.handled,false);
 for(const q of ['How do I renew my RAMQ?', 'Comment renouveler ma RAMQ?', 'Replace my RAMQ card']){
  const r=await askRun(q,{useAI:false});
  t.eq('RAMQ renewal selects health-card record '+q,r.primary?.item.slug,'replace-or-renew-your-health-card');
  t.check('RAMQ renewal excludes unrelated routes '+q,r.actions.every(a=>!/passport|nexus/i.test(a.url)));
 }
 const source=readFileSync(new URL('../tools/ask-engine.js',import.meta.url),'utf8');
 const wrapper=source.slice(source.indexOf('const ASK_BROWSER_AI ='));
 t.check('App Check blocked at entry',source.includes("function ensureAppCheck(){\n  if(!ASK_BROWSER_AI_ENABLED) return Promise.resolve(false);"));
 t.check('Model loader blocked at entry',source.includes("async function askGetModel(){\n  if(!ASK_BROWSER_AI_ENABLED) throw new Error('ai-disabled');"));
 t.check('Backend blocked at entry',source.includes("async ask(question, context){\n    if(!ASK_BROWSER_AI_ENABLED) throw new Error('ai-disabled');"));
 const flag=source.match(/const ASK_BROWSER_AI_ENABLED = (true|false);/)[0];
 let calls=0;
 const box={ASK_AI_CONFIG:{model:'unused'},ASK_BACKEND:{ask(){calls++;throw Error('must not call');}},firebaseReady:true,
  askRun:async(q,opts,a)=>({q, useAI:opts.useAI,ready:a.ready()})};
 vm.createContext(box);vm.runInContext(flag+'\n'+wrapper+'\nthis.answer=askCommunityAssistant;',box);
 for(const opts of [undefined,{useAI:true},{useAI:false}]){
  const result=await box.answer('passport',opts);
  t.eq('browser useAI is false '+JSON.stringify(opts),result.useAI,false);
  t.eq('browser adapter refuses network '+JSON.stringify(opts),result.ready,false);
 }
 t.eq('no backend calls',calls,0);
 return t.report();
}
if(import.meta.url==='file://'+process.argv[1]) run().then(s=>process.exit(s.fail?1:0));
