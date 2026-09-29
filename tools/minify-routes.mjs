#!/usr/bin/env node
/* Minify generated route copies, keeping index.html as the editable source.
 * Run only after sync-ask-core and generate-routes. Admin auth and bilingual
 * pages are included; the source parsers never consume these minified copies.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {resourceItems} from './resource-detail-routes.mjs';
import {minify} from 'terser';
import {transform} from 'lightningcss';
const root=join(dirname(fileURLToPath(import.meta.url)), '..');
const routes=['admin.html','about.html','accessibility.html','child-travel-consent.html','contact.html','privacy.html','resources.html','stay-informed.html','terms.html','fr/index.html','fr/ressources.html','fr/actualites.html','fr/a-propos.html','fr/contact.html','fr/politique-de-confidentialite.html','fr/conditions-utilisation.html','fr/accessibilite.html','fr/consentement-voyage-enfant.html'];
for(const item of resourceItems(root)) for(const prefix of ['resources','fr/ressources']) routes.push(`${prefix}/${item.slug}.html`);
const check=process.argv.includes('--check');
const changed=process.argv.includes('--changed');
const changedFiles=changed ? new Set(execFileSync('git',['diff','--name-only'],{cwd:root,encoding:'utf8'}).trim().split('\n')) : null;
let drift=0;
if(import.meta.url === `file://${process.argv[1]}`){
  for(const file of routes){
    if(changed && !changedFiles.has(file)) continue;
    let src=readFileSync(join(root,file),'utf8');
    let out=await minifyHtml(src,file);
    if(out!==src){
    if(check){console.error('DRIFT:',file);drift++;}
    else {writeFileSync(join(root,file),out);console.log('minified:',file,src.length,'->',out.length);}
    }else console.log('ok:',file);
  }
  if(check&&drift) process.exitCode=1;
}
export async function minifyHtml(src,file){
  let out=src;
  // Preserve JSON-LD and external scripts; minify inline executable code.
  out=await replaceAsync(out,/<script([^>]*)>([\s\S]*?)<\/script>/g,async(full,attrs,js)=>{
    if(!js.trim() || /application\/ld\+json/i.test(attrs)) return full;
    const result=await minify(js,{module:false,compress:false,mangle:false,format:{comments:false}});
    if(!result.code) throw new Error(file+': empty JS output');
    return `<script${attrs}>${result.code}</script>`;
  });
  out=out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g,(full,attrs,css)=>{
    const result=transform({filename:file+'.css',code:Buffer.from(css),minify:true});
    return `<style${attrs}>${result.code.toString()}</style>`;
  });
  return out;
}
async function replaceAsync(str,re,fn){
  const matches=[...str.matchAll(re)];
  const replacements=await Promise.all(matches.map(m=>fn(...m)));
  let i=0; return str.replace(re,()=>replacements[i++]);
}
