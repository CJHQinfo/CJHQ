import { execFileSync } from 'node:child_process';
import aq from './t-answer-quality.mjs';
import cl from './t-content-loss.mjs';
import rg from './t-regression.mjs';
import df from './t-differential.mjs';
import p0 from './t-p0-fixes.mjs';
import jg from './t-jurisdiction.mjs';
import mu from './t-municipal.mjs';
import pc from './t-primary-context.mjs';
const out = [];
for(const f of [aq, cl, p0, jg, mu, pc, rg, df]) out.push(await f({}));
try{ execFileSync('node', ['syntax-check.mjs'], { cwd: new URL('.', import.meta.url).pathname, stdio:'inherit' });
     out.push({ name:'inline script syntax', pass:1, fail:0 }); }
catch(e){ out.push({ name:'inline script syntax', pass:0, fail:1 }); }
console.log('\n================ SUMMARY ================');
let P=0,F=0;
out.forEach(s=>{ P+=s.pass; F+=s.fail; console.log((s.fail? 'FAIL ':'ok   ') + s.name.padEnd(42) + s.pass + ' passed, ' + s.fail + ' failed'); });
console.log('-----------------------------------------');
console.log((F? 'FAILED ':'ALL GREEN ') + P + ' assertions passed, ' + F + ' failed');
process.exit(F?1:0);
