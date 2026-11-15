import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,providerError} from '../supabase/functions/ai-chat/handler.js';

const req=(body,auth='Bearer token')=>new Request('https://example.test',{method:'POST',headers:{authorization:auth,'Content-Type':'application/json'},body:JSON.stringify(body)});
const confirmed={id:'user',email_confirmed_at:'now'};

test('authenticates and validates before reserving a short-term request slot or calling the provider',async()=>{
 let uid,question;
 const handle=createHandler({
  authenticate:async authorization=>authorization==='Bearer token'?confirmed:null,
  reserve:async id=>(uid=id,true),
  generate:async message=>(question=message,'answer')
 });
 assert.equal((await handle(req({message:'hi'},''))).status,401);
 assert.equal((await handle(req({message:' '}))).status,400);
 assert.equal(uid,undefined);
 const response=await handle(req({message:' hi ',history:['private']}));
 assert.deepEqual(await response.json(),{answer:'answer'});
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.equal(response.headers.get('referrer-policy'),'no-referrer');
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(uid,'user');
 assert.equal(question,'hi');
});

test('denies anonymous, unconfirmed and oversized inputs before reserving a request slot',async()=>{
 for(const user of [{id:'u',is_anonymous:true,email_confirmed_at:'now'},{id:'u'},null]){
  const handle=createHandler({authenticate:async()=>user,reserve:()=>{throw Error('must not call');},generate:()=>{}});
  assert.equal((await handle(req({message:'hello'}))).status,401);
 }
 const handle=createHandler({authenticate:async()=>confirmed,reserve:()=>{throw Error('must not call');},generate:()=>{}});
 assert.equal((await handle(req({message:'x'.repeat(20001)}))).status,400);
 assert.equal((await handle(req({message:'x'.repeat(4001)}))).status,400);
});

test('short-term rate limit denies before provider calls and provider failures do not leak secrets',async()=>{
 let calls=0;
 let handle=createHandler({authenticate:async()=>confirmed,reserve:async()=>false,generate:async()=>{calls++;}});
 const limited=await handle(req({message:'hi'}));
 assert.equal(limited.status,429);
 assert.match((await limited.json()).error,/short period/i);
 assert.equal(calls,0);
 handle=createHandler({authenticate:async()=>confirmed,reserve:async()=>true,generate:async()=>{throw Error('secret-key');}});
 const response=await handle(req({message:'hi'}));
 assert.equal(response.status,503);
 const text=await response.text();
 assert.match(text,/short-term rate limit/i);
 assert.doesNotMatch(text,/secret-key/);
});

test('preflight and unconfigured responses work',async()=>{
 const handle=createHandler({configured:false});
 assert.equal((await handle(new Request('https://example.test',{method:'OPTIONS'}))).status,204);
 assert.equal((await handle(req({message:'hi'}))).status,503);
});

test('provider errors give actionable status without exposing provider response data',async()=>{
 for(const status of [400,401,403,404,429,500]){
  const handle=createHandler({authenticate:async()=>confirmed,reserve:async()=>true,generate:async()=>{throw providerError(status);}});
  const response=await handle(req({message:'hi'}));
  const body=await response.json();
  assert.equal(response.status,status===429?429:503);
  assert.match(body.error,/short-term rate limit/i);
  if(status!==500)assert.match(body.error,new RegExp(String(status)));
  assert.doesNotMatch(body.error,/secret-key/);
 }
 const retry=new Error('Please retry later.');retry.name='ProviderError';retry.status=429;retry.retryAfter='120';
 const handle=createHandler({authenticate:async()=>confirmed,reserve:async()=>true,generate:async()=>{throw retry;}});
 const limited=await handle(req({message:'hi'}));
 assert.equal(limited.headers.get('retry-after'),'120');
});
