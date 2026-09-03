/* Contact + municipal services.

   Two routing fixes and four verified records. The assertions are structural:
   which record answers, that the link is application-controlled and official,
   and that nothing that was already right moved. No expected prose. */
import { askRun, askBuildContext, askMatchResources, ASK_CJHQ_CONTACT } from '../ask-core.mjs';
import { categories } from '../ask-data.mjs';
import { makeSuite, urlsIn } from './harness.mjs';

const NEW_SLUGS = ['report-a-problem-311','outremont-borough-services',
                   'plateau-borough-services','outdoor-public-events-permits'];

/* Every URL the new records are allowed to offer. Anything outside this set in
   an action or source means a link was invented or mistyped. */
const OFFICIAL = [
  'https://montreal.ca/en/how-to/report-cleanliness-issue',
  'https://montreal.ca/en/contact-us',
  'https://montreal.ca/en/311-montreal-mobile-app',
  'https://montreal.ca/outremont',
  'https://montreal.ca/conseils-decisionnels/conseil-darrondissement-doutremont',
  'https://montreal.ca/lieux/mairie-darrondissement-doutremont',
  'https://montreal.ca/lieux/comptoir-des-permis-outremont',
  'https://montreal.ca/en/city-government/plateau-mont-royal-borough-council',
  'https://montreal.ca/lieux/mairie-darrondissement-du-plateau-mont-royal',
  'https://montreal.ca/en/how-to/organize-public-event-your-borough',
  'https://montreal.ca/en/topics/public-events-and-festivals',
  'https://montreal.ca/en/permits-and-authorizations'
];

const slugOf = r => (r.sources && r.sources[0] && r.sources[0].url)
  ? r.sources[0].url.split('/').pop() : '';

export default async function run(){
  const t = makeSuite('Contact + municipal services');
  const items = []; categories.forEach(c => (c.groups||[]).forEach(g => (g.items||[]).forEach(it => items.push(it))));
  const bySlug = new Map(items.map(it => [it.slug, it]));

  // ---------- P0 #1: contact information -----------------------------------
  const CONTACT = ['How do I contact CJHQ?','How can I contact CJHQ?','I want to contact CJHQ',
    'What is the CJHQ contact information?',"What is CJHQ's contact information?",
    'How do I get in touch with CJHQ?','What is the best way to contact CJHQ?',
    'contact CJHQ','CJHQ phone number','CJHQ email','How do I reach CJHQ?',
    'Quelles sont les coordonnées du CJHQ?'];
  for(const q of CONTACT){
    const r = await askRun(q, { useAI:false });
    t.eq('contact handler for ' + JSON.stringify(q.slice(0,40)), r.handler, 'Contact CJHQ');
    t.check('returns the /contact action for ' + JSON.stringify(q.slice(0,40)),
      (r.actions||[]).some(a => a.url === '/contact'), JSON.stringify((r.actions||[]).map(a=>a.url)));
    t.check('cites the CJHQ contact source', (r.sources||[]).some(s => s.url === 'https://cjhq.org/contact'));
    t.check('answer carries the verified phone and email',
      r.answer.indexOf(ASK_CJHQ_CONTACT.phone) >= 0 && r.answer.indexOf(ASK_CJHQ_CONTACT.email) >= 0);
  }

  // ---------- P0 #2: the municipal misroutes -------------------------------
  const MUST_NOT_BE_PARKING = [
    'How do I report a municipal service problem in Outremont?',
    'How do I report a municipal service problem in the Plateau?',
    'I want to complain about street cleaning in Outremont.',
    'How do I report a street cleaning problem in Outremont?',
    'How do I report a municipal problem in Outremont?',
    'How do I contact Outremont about a city service problem?',
    'I have a municipal complaint in Outremont.',
    'I want to complain about street cleaning in the Plateau.',
    'How do I report a street cleaning problem in the Plateau?',
    'How do I report a municipal problem in the Plateau?',
    'How do I contact the Plateau about a city service problem?',
    'I have a municipal complaint in the Plateau.',
    'I want to complain to the city about garbage',
    'report a pothole'
  ];
  for(const q of MUST_NOT_BE_PARKING){
    const r = await askRun(q, { useAI:false });
    const offered = (r.actions||[]).map(a => a.url).join(' ');
    t.check('no visitor-parking record for ' + JSON.stringify(q.slice(0,44)),
      offered.indexOf('visitor-parking') < 0 && offered.indexOf('arr-outremont.ca') < 0,
      offered);
    t.check('routes to a municipal record for ' + JSON.stringify(q.slice(0,44)),
      NEW_SLUGS.some(sl => offered.indexOf(sl) >= 0) || offered.indexOf('/resources/local-borough-services') >= 0,
      offered);
    t.check('offers a next step: ' + JSON.stringify(q.slice(0,44)), (r.actions||[]).length >= 1);
  }

  // ---------- parking must be untouched ------------------------------------
  for(const [q, want] of [['How do I get visitor parking in Outremont?','outremont-visitor-parking'],
                          ['Where can I get visitor parking in Outremont?','outremont-visitor-parking'],
                          ['How does visitor parking work in the Plateau?','le-plateau-mont-royal-visitor-parking']]){
    const r = await askRun(q, { useAI:false });
    t.eq('parking still answers: ' + JSON.stringify(q.slice(0,40)), slugOf(r), want);
  }

  // ---------- borough / elected-official routing ---------------------------
  for(const [q, want] of [['How do I contact the mayor of Outremont?','outremont-borough-services'],
                          ['How do I contact the Outremont borough office?','outremont-borough-services'],
                          ['How do I contact city officials in Outremont?','outremont-borough-services'],
                          ['How do I contact the mayor of the Plateau?','plateau-borough-services'],
                          ['How do I contact the Plateau borough office?','plateau-borough-services']]){
    const r = await askRun(q, { useAI:false });
    t.eq('borough routing: ' + JSON.stringify(q.slice(0,42)), slugOf(r), want);
  }
  // no elected official's NAME is asserted anywhere in the data
  for(const nm of ['Caroline Braun','Cathy Wong','Soraya Martinez Ferrada','Marie Plourde','Alex Norris']){
    const hit = items.some(it => JSON.stringify(it).indexOf(nm) >= 0);
    t.check('no hard-coded elected official: ' + nm, !hit);
  }

  // ---------- events / Hachnoses Sefer Torah -------------------------------
  const EVENTS = ['How do I get a permit for an outdoor festival?',
                  'How do I get a permit for a Hachnoses Sefer Torah?',
                  'We want to hold a Hachnoses Sefer Torah outdoors.',
                  'Do I need a permit for an outdoor Jewish event?',
                  'How do I close a street for an event?',
                  'Who do I contact for a permit for a street event?'];
  for(const q of EVENTS){
    const r = await askRun(q, { useAI:false });
    t.eq('event routing: ' + JSON.stringify(q.slice(0,44)), slugOf(r), 'outdoor-public-events-permits');
    t.check('offers the official City event page: ' + JSON.stringify(q.slice(0,44)),
      (r.actions||[]).some(a => a.url.indexOf('organize-public-event-your-borough') >= 0),
      JSON.stringify((r.actions||[]).map(a=>a.url)));
  }
  {
    const rec = bySlug.get('outdoor-public-events-permits');
    const blob = JSON.stringify(rec);
    t.check('the event record does NOT assert a permit category for a Hachnoses Sefer Torah',
      blob.indexOf('cannot tell you which category applies') >= 0);
    t.check('it tells the person to confirm with the borough',
      /[Cc]onfirm your specific event with your borough/.test(blob));
    t.check('it states CJHQ is not the permitting authority',
      blob.indexOf('CJHQ is not the permitting authority') >= 0);
    t.check('it does NOT promise approval',
      blob.indexOf('cannot obtain or guarantee an approval') >= 0);
    for(const bad of ['guarantee approval','we will obtain','CJHQ will get you','permit is guaranteed']){
      t.check('no promissory wording: ' + JSON.stringify(bad), blob.indexOf(bad) < 0);
    }
  }

  // ---------- the CJHQ CC guidance -----------------------------------------
  let ccCount = 0;
  for(const sl of NEW_SLUGS){
    const rec = bySlug.get(sl);
    t.check('new record exists: ' + sl, !!rec);
    if(!rec) continue;
    const tips = (rec.tips_list_en||[]).join(' ');
    if(tips.indexOf('info@cjhq.org') >= 0) ccCount++;
    t.check('CC guidance present on ' + sl, tips.indexOf('info@cjhq.org') >= 0);
    t.check('CC guidance is non-promissory on ' + sl,
      /can assist or follow up where appropriate/.test(tips)
      && !/will (?:follow up|intervene|resolve|represent)/.test(tips)
      && tips.indexOf('on your behalf') < 0, tips.slice(0,160));
  }
  t.eq('CC guidance appears on all four new records', ccCount, NEW_SLUGS.length);
  // and NOWHERE else - it must not become a global instruction
  const elsewhere = items.filter(it => NEW_SLUGS.indexOf(it.slug) < 0
                                    && JSON.stringify(it).indexOf('info@cjhq.org') >= 0);
  t.eq('CC guidance is not attached to unrelated records', elsewhere.length, 0,
    JSON.stringify(elsewhere.map(x=>x.slug)));

  // ---------- links are official and application-controlled ----------------
  for(const sl of NEW_SLUGS){
    const rec = bySlug.get(sl); if(!rec) continue;
    const urls = (rec.official_links||[]).map(l => l.url).concat(rec.url ? [rec.url] : []);
    for(const u of urls){
      t.check('official URL on ' + sl + ': ' + u.slice(0,58), OFFICIAL.indexOf(u) >= 0, u);
    }
    t.check('no unverified email stored on ' + sl,
      !/[a-z0-9._%+-]+@(?!cjhq\.org)[a-z0-9.-]+\.[a-z]{2,}/i.test(JSON.stringify(rec)),
      sl);
  }
  // no municipal URL may reach the user that the application did not choose
  for(const q of MUST_NOT_BE_PARKING.concat(EVENTS)){
    const r = await askRun(q, { useAI:false });
    const allowed = new Set((r.actions||[]).map(a=>a.url).concat((r.sources||[]).map(s=>s.url||'')));
    t.eq('no ungrounded URL in the answer: ' + JSON.stringify(q.slice(0,40)),
      urlsIn(r.answer).filter(u => !allowed.has(u)).length, 0);
    const ctx = askBuildContext(r);
    t.check('context built for ' + JSON.stringify(q.slice(0,40)), ctx.indexOf('PRIMARY RESOURCE:') >= 0);
  }

  // ---------- the new records must not disturb their neighbours ------------
  for(const [q, want] of [['When is waste collection in Outremont?','waste-collection'],
                          ['How do I pay my property taxes?','property-taxes'],
                          ['How do I get a building permit?','building-permits'],
                          ['STM fares','public-transit-stm']]){
    const r = await askRun(q, { useAI:false });
    if(r.handled) t.eq('neighbouring record unchanged: ' + JSON.stringify(q.slice(0,40)), slugOf(r), want);
    else t.check('neighbouring record still reachable: ' + JSON.stringify(q.slice(0,40)),
      (r.actions||[]).some(a => a.url.indexOf(want) >= 0), JSON.stringify((r.actions||[]).map(a=>a.url)));
  }

  return t.report();
}
if(import.meta.url === 'file://' + process.argv[1]) run().then(s => process.exit(s.fail ? 1 : 0));
