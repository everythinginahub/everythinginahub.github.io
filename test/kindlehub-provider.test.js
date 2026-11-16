import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createKindleHubGenerator,KINDLEHUB_API_BASE,DEFAULT_KINDLEHUB_MODEL} from '../supabase/functions/ai-chat/kindlehub.js';
import {createAssistantIdentityPrompt} from '../supabase/functions/ai-chat/identity.js';

const success=payload=>({ok:true,status:200,json:async()=>payload});
const failure=(status,code,retryAfter='')=>({
 ok:false,status,
 headers:new Headers(retryAfter?{'Retry-After':retryAfter}:{}),
 clone(){return {json:async()=>({error:{code,message:'private upstream detail'}})};}
});

test('uses the documented OpenAI-compatible KindleHub endpoint, bearer auth and model',async()=>{
 let call;
 const signal=new AbortController().signal;
 const generate=createKindleHubGenerator({key:'kh_live_test-secret',timeout:()=>signal,fetcher:async(url,options)=>(call={url,options},success({choices:[{message:{content:'A useful answer'}}]}))});
 assert.equal(await generate('Hello'),'A useful answer');
 assert.equal(call.url,`${KINDLEHUB_API_BASE}/chat/completions`);
 assert.equal(call.options.method,'POST');
 assert.equal(call.options.headers.Authorization,'Bearer kh_live_test-secret');
 assert.equal(Object.hasOwn(call.options.headers,'Origin'),false);
 assert.equal(call.options.headers['Content-Type'],'application/json');
 assert.deepEqual(JSON.parse(call.options.body),{
  model:DEFAULT_KINDLEHUB_MODEL,
  messages:[
   {role:'system',content:createAssistantIdentityPrompt('KindleHub API',DEFAULT_KINDLEHUB_MODEL)},
   {role:'user',content:'Hello'}
  ],
  max_tokens:1024
 });
 assert.equal(call.options.signal,signal);
});

test('allows an account-accessible model override and reads text-block response content',async()=>{
 let body;
 const generate=createKindleHubGenerator({key:'secret',model:'another-model',fetcher:async(_url,options)=>{
  body=JSON.parse(options.body);
  return success({choices:[{message:{content:[{type:'text',text:'Hello'},{type:'text',text:' there'}]}}]});
 }});
 assert.equal(await generate('question'),'Hello there');
 assert.equal(body.model,'another-model');
 assert.equal(body.messages[0].content,createAssistantIdentityPrompt('KindleHub API','another-model'));
});

test('maps documented provider errors safely and preserves numeric Retry-After',async()=>{
 const cases=[
  [400,'model_not_found',503,/model/i],
  [401,'invalid_api_key',503,/KINDLEHUB_API_KEY/i],
  [403,'not_invited',503,/invited/i],
  [403,'origin_not_allowed',503,/origin/i],
  [429,'rate_limit_exceeded',429,/rate limit/i],
  [429,'plan_quota_exceeded',429,/daily AI allowance/i],
  [429,'capacity_exceeded',429,/capacity/i],
  [503,'api_off',503,/temporarily switched off/i]
 ];
 for(const [status,code,expectedStatus,message] of cases){
  const generate=createKindleHubGenerator({key:'private-key-value',fetcher:async()=>failure(status,code,status===429?'3600':'')});
  await assert.rejects(generate('question'),error=>{
   assert.equal(error.name,'ProviderError');
   assert.equal(error.status,expectedStatus);
   assert.match(error.message,message);
   assert.doesNotMatch(error.message,/private-key-value|private upstream detail/);
   assert.equal(error.retryAfter,status===429?'3600':undefined);
   return true;
  });
 }
});

test('does not leak provider bodies for unknown errors and rejects malformed success payloads safely',async()=>{
 const unavailable=createKindleHubGenerator({key:'secret',fetcher:async()=>failure(500,'internal_error')});
 await assert.rejects(unavailable('question'),error=>error.name==='ProviderError'&&!error.message.includes('private upstream detail'));
 const malformed=createKindleHubGenerator({key:'secret',fetcher:async()=>success({choices:[]})});
 assert.equal(await malformed('question'),'');
});
