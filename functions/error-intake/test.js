'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const Module=require('node:module');
const listeners={};const writes=[];const counter=new Map();let fail=false;
const original=Module._load;
Module._load=function(name,...rest){
 if(name==='@google-cloud/functions-framework')return {http:(n,fn)=>listeners[n]=fn};
 if(name==='firebase-admin')return {initializeApp(){},firestore:Object.assign(()=>({
  collection(name){return {doc(id){return {id,async create(data){if(fail)throw new Error('outage');writes.push({name,data});}}},async add(data){writes.push({name,data})}}},
  async runTransaction(fn){return fn({async get(ref){return {exists:counter.has(ref.id),data:()=>({count:counter.get(ref.id)})}},set(ref,data){counter.set(ref.id,data.count)}})}
 }),{Timestamp:{fromMillis:x=>x},FieldValue:{serverTimestamp:()=>new Date()}})};
 return original.call(this,name,...rest);
};
const {validate}=require('./index.js');Module._load=original;process.env.RATE_SALT='test';
const body=()=>({type:'broken_link',attemptedUrl:'https://cjhq.org/missing',message:'',referrer:'',userAgent:'Mozilla',lang:'en',reportedAt:new Date().toISOString()});
const call=async(b,origin='https://cjhq.org',ip='192.0.2.1')=>{
 const req={method:'POST',headers:{origin,'content-type':'application/json','x-forwarded-for':ip+', 198.51.100.10'},body:b};
 const res={headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(x){this.body=x;return this},send(x){this.body=x;return this}};
 await listeners.errorIntake(req,res);return res;
};
test('accepts legitimate report, disallows foreign origins and fields',async()=>{
 assert.equal((await call(body())).statusCode,200);
 assert.equal(writes.filter(w=>w.name==='error_reports').length,1);
 assert.equal((await call(body(),'https://evil.invalid')).statusCode,403);
 assert.equal((await call({...body(),admin:true})).statusCode,400);
 assert.equal((await call({...body(),message:'x'.repeat(2001)})).statusCode,400);
 assert.equal((await call({...body(),attemptedUrl:'https://evil.invalid'})).statusCode,400);
});
test('caps per IP and fails closed on database outage',async()=>{
 for(let i=1;i<20;i++)assert.equal((await call(body())).statusCode,200);
 assert.equal((await call(body())).statusCode,429);
 fail=true;assert.equal((await call(body(),'https://cjhq.org','192.0.2.2')).statusCode,503);
});
