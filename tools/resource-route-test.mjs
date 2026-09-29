import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {resourceItems} from './resource-detail-routes.mjs';
const root=join(import.meta.dirname,'..');
const items=resourceItems(root);
for(const item of items){
  for(const [lang,prefix] of [['en','resources'],['fr','fr/ressources']]){
    const name=`${prefix}/${item.slug}.html`, html=readFileSync(join(root,name),'utf8');
    const url=`https://cjhq.org/${prefix}/${item.slug}`;
    const title=lang==='fr'?item.fr:item.en, desc=lang==='fr'?item.desc_fr:item.desc_en;
    const head=html.split('</head>')[0];
    if(!head.includes(`href="${url}"`) || !head.includes(`content="${url}"`)) throw new Error(`${name}: URL`);
    if(!head.includes(`"@id": "${url}#webpage"`)) throw new Error(`${name}: schema`);
    if(!head.includes(`"description": ${JSON.stringify(desc)}`)) throw new Error(`${name}: description`);
    if(!head.includes(`"name": ${JSON.stringify(title+' | CJHQ')}`)) throw new Error(`${name}: title`);
    if(!html.includes('id="page-resources"')) throw new Error(`${name}: body`);
    if(lang==='fr' && !html.includes('data-force-lang="fr"')) throw new Error(`${name}: language`);
  }
}
console.log(`Verified ${items.length*2} resource routes and metadata`);
