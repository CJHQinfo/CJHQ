// Full-page EN/FR startup regression. Network is isolated; no auth or data writes.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,'..');
 const browser=await chromium.launch({...(process.env.CJHQ_QA_CHROME==='playwright'?{}:{executablePath:'/usr/bin/google-chrome'}),headless:true,args:['--no-sandbox']});
 for(const lang of ['en','fr']){
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(lang=>localStorage.setItem('cjhq_language',lang),lang);
  await page.route('https://test.local/**',r=>{
   let f=path.join(root,new URL(r.request().url()).pathname);
   if(f.endsWith('/admin'))f+='.html';
   if(fs.existsSync(f)&&fs.statSync(f).isFile())r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':'application/octet-stream'});else r.abort();
  });
  await page.route(/https:\/\/(?!test.local)/,r=>r.abort());
  await page.goto('https://test.local/admin');
  const state=await page.evaluate(async()=>({lang:document.documentElement.lang,routes:Object.keys(FRENCH_ROUTE_BY_PAGE).length,countries:SPECIAL_INFO_COUNTRIES.length,partners:PARTNERS_DATA.length,answer:await askCommunityAssistant('How do I renew my RAMQ?',{useAI:false}),publicAsk:ASK_CJHQ_PUBLIC,authDefined:typeof initFirebase}));
  assert.deepStrictEqual(errors,[],`${lang} startup errors`);
  assert(state.routes>0&&state.countries>0&&state.partners>0,`${lang} data initialized`);
  assert.strictEqual(state.publicAsk,false);
  assert(/health card|carte.*assurance|carte.*maladie/i.test(state.answer.answer),`${lang} RAMQ answer`);
  for(const next of ['fr','en',lang]){
   await page.click(next==='fr'?'#btnFR':'#btnEN');
   assert.strictEqual(await page.evaluate(()=>localStorage.getItem('cjhq_language')),next);
   assert.strictEqual(await page.evaluate(()=>document.documentElement.lang),next);
  }
  assert.deepStrictEqual(errors,[],`${lang} language switch errors`);
  console.log(`PASS complete admin ${lang}: data, RAMQ, public flag OFF, FR/EN switch`);
  if(process.env.CJHQ_STARTUP_SCREENSHOTS)await page.screenshot({path:`/downloads/admin-startup-${lang}.png`});
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
