'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const listeners = {};
const writes = [];
const counter = new Map();
let failWrite=false; const events=[];
const originalLoad = Module._load;
Module._load = function(name, ...rest) {
  if (name === '@google-cloud/functions-framework') return {http:(n,handler)=>listeners[n]=handler};
  if (name === 'firebase-admin') return {
    initializeApp(){}, firestore:Object.assign(()=>({
      collection(name){return {doc(id){return {name,id,async create(data){if(failWrite) throw new Error('simulated Firestore outage'); events.push('save'); writes.push({name,id,data})},async update(data){writes.push({name,id,update:data})}}},async add(data){writes.push({name,data})}}},
      async runTransaction(fn){return fn({async get(ref){return {exists:counter.has(ref.id),data(){return {count:counter.get(ref.id)}}}},set(ref,data){counter.set(ref.id,data.count)}})}
    }),{Timestamp:{fromMillis:n=>n}, FieldValue:{serverTimestamp:()=>new Date()}})
  };
  return originalLoad.call(this,name,...rest);
};
const {validate} = require('./index.js');
Module._load = originalLoad;
process.env.TURNSTILE_SECRET='test-secret'; process.env.RATE_SALT='test-salt'; process.env.FORM_ENDPOINT='https://formspree.io/f/test';
const payload = {inquiry_type:'Community Member',lang:'en',full_name:'Jane Smith',email:'jane@example.com',subject:'Question',message:'Can you help?', 'cf-turnstile-response':'good'};
const makeReq=(body,origin='https://cjhq.org',ip='192.0.2.1')=>({method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':ip+', 198.51.100.10'},body});
const makeRes=()=>({statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(x){this.body=x;return this},send(x){this.body=x;return this}});
const originalFetch=global.fetch;
function setFetch(valid=true,formspree=true){global.fetch=async (url)=> url.includes('siteverify') ? {ok:true,json:async()=>({success:valid,hostname:'cjhq.org'})} : (events.push('notice'),{ok:formspree,status:formspree?200:402});}
async function call(body,origin,ip){const res=makeRes();await listeners.contactIntake(makeReq(body,origin,ip),res);return res;}
test('valid EN and FR messages are saved first then notified after verification',async()=>{
 setFetch();const a=await call(payload);assert.equal(a.statusCode,200);assert.deepEqual(events.slice(0,2),['save','notice']);assert.equal(writes.filter(x=>x.name==='contact_submissions' && x.data).length,1);
 const b=await call({...payload,lang:'fr'});assert.equal(b.statusCode,200);assert.equal(writes.filter(x=>x.name==='contact_submissions' && x.data).length,2);
 global.fetch=originalFetch;
});
test('bad token and invalid fields never enter Messages; notification failure retains accepted message',async()=>{
 const initial=writes.filter(x=>x.name==='contact_submissions' && x.data).length;
 setFetch(false);assert.equal((await call(payload)).statusCode,400);
 setFetch();assert.equal((await call({...payload,subject:'',email:'bad'})).statusCode,400);
 assert.equal(writes.filter(x=>x.name==='contact_submissions' && x.data).length,initial);
 setFetch(true,false);assert.equal((await call(payload)).statusCode,200);
 assert.equal(writes.filter(x=>x.name==='contact_submissions' && x.data).length,initial+1);
 assert.equal(writes.filter(x=>x.name==='contact_submissions' && x.data).at(-1).data.notificationStatus,'pending');
 delete process.env.FORM_ENDPOINT; setFetch(true,true); assert.equal((await call(payload,undefined,'192.0.2.2')).statusCode,200);
 assert.equal(writes.filter(x=>x.name==='contact_submissions' && x.data).length,initial+2);
 process.env.FORM_ENDPOINT='https://formspree.io/f/test';
 global.fetch=originalFetch;
});
test('Firestore outage fails closed without Formspree notification',async()=>{
 setFetch();const before=events.length;failWrite=true;
 assert.equal((await call(payload,undefined,'192.0.2.3')).statusCode,503);
 assert.equal(events.length,before);failWrite=false;global.fetch=originalFetch;
});
test('origin blocked; repeated submissions rate limited',async()=>{
 setFetch();assert.equal((await call(payload,'https://evil.invalid')).statusCode,403);
 // Earlier tests have consumed five permitted requests. Subsequent calls are blocked.
 assert.equal((await call(payload)).statusCode,429);
 global.fetch=originalFetch;
});
test('valid field sets reject extra keys and accepts French values',()=>{
 assert.equal(validate({...payload,admin:true}),null);
 assert.equal(validate({...payload,'_gotcha':'bot'}),null);
 assert.equal(validate({...payload,lang:'fr',subject:'Question en français'}).lang,'fr');
});
