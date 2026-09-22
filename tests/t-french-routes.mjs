import { readFileSync, existsSync } from 'node:fs';
import { makeSuite } from './harness.mjs';
const ROOT = new URL('../', import.meta.url).pathname;
const ORIGIN = 'https://cjhq.org';
const MAP = {
  home:'', resources:'ressources', 'stay-informed':'actualites', about:'a-propos',
  contact:'contact', privacy:'politique-de-confidentialite', terms:'conditions-utilisation',
  accessibility:'accessibilite', 'child-travel-consent':'consentement-voyage-enfant'
};
const enUrl = p => p === 'home' ? `${ORIGIN}/` : `${ORIGIN}/${p}`;
const frUrl = p => `${ORIGIN}/fr/${MAP[p] ? MAP[p] : ''}`;
const file = (p, lang) => lang === 'en' ? (p === 'home' ? 'index.html' : `${p}.html`)
  : (p === 'home' ? 'fr/index.html' : `fr/${MAP[p]}.html`);
const one = (s, re) => (s.match(re)||[])[1] || '';
export default async function run(){
  const t=makeSuite('French static routes');
  const sitemap=readFileSync(ROOT+'sitemap.xml','utf8');
  for(const page of Object.keys(MAP)){
    const ef=file(page,'en'), ff=file(page,'fr');
    t.check(`${page}: English file exists`, existsSync(ROOT+ef));
    t.check(`${page}: French file exists`, existsSync(ROOT+ff));
    const en=readFileSync(ROOT+ef,'utf8'), fr=readFileSync(ROOT+ff,'utf8');
    t.check(`${page}: French lang`, /<html[^>]*lang="fr"/.test(fr));
    t.check(`${page}: one initially active page`, (fr.match(/class="page active"/g)||[]).length===1);
    t.check(`${page}: French initial page active`, fr.includes(`class="page active" id="page-${page}"`));
    t.check(`${page}: French visible H1 in active page`, new RegExp(`class="page active" id="page-${page}"[\\s\\S]*?<h1[\\s\\S]*?data-fr`).test(fr));
    t.check(`${page}: self canonical`, one(fr,/<link rel="canonical" id="canonicalTag" href="([^"]+)">/)===frUrl(page));
    for(const [lang,url] of [['en',enUrl(page)],['fr',frUrl(page)],['x-default',enUrl(page)]]){
      const tag=`<link rel="alternate" hreflang="${lang}" href="${url}">`;
      t.check(`${page}: reciprocal ${lang} on English`, en.includes(tag));
      t.check(`${page}: reciprocal ${lang} on French`, fr.includes(tag));
    }
    const schema=one(fr,/<script type="application\/ld\+json" id="pageSchema">([\s\S]*?)<\/script>/);
    let json={}; try{json=JSON.parse(schema);}catch(e){}
    t.check(`${page}: valid French WebPage JSON-LD`, json['@type']==='WebPage' && json.url===frUrl(page) && json.inLanguage==='fr-CA');
    t.check(`${page}: stable Organization relationship`, json.about && json.about['@id']==='https://cjhq.org/#organization');
    t.check(`${page}: sitemap exactly once`, sitemap.split(`<loc>${frUrl(page)}</loc>`).length-1===1);
  }
  t.check('admin omitted from sitemap', !sitemap.includes('/admin'));
  t.check('tools partial omitted from sitemap', !sitemap.includes('/tools/'));
  return t.report();
}
if(import.meta.url === `file://${process.argv[1]}`) await run();
