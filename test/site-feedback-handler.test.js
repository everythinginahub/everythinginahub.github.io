import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashClientAddress,isFeedbackOriginAllowed,createFeedbackHandler} from '../supabase/functions/site-feedback/handler.js';

const origin='https://everythinginahub.github.io';
const valid={category:'suggestion',message:'Please add a dark theme to the planner.',page:'planner',website:''};
const jsonRequest=(body,options={})=>new Request('https://project.supabase.co/functions/v1/site-feedback',{
 method:options.method||'POST',
 headers:{origin:options.origin??origin,'content-type':options.contentType??'application/json',...(options.headers||{})},
 body:options.method==='OPTIONS'||options.method==='GET'?undefined:typeof body==='string'?body:JSON.stringify(body)
});
const responseBody=async response=>await response.json();
function handlerFor({submit=async()=>{},hashAddress=async()=>'a'.repeat(64),configured=true}={}){
 return createFeedbackHandler({configured,submit,hashAddress});
}

test('feedback CORS admits the production site, local development and trusted previews only',()=>{
 for(const value of [origin,'http://localhost:3000','http://127.0.0.1:3000','https://3000-sandbox-id.e2b.app'])assert.equal(isFeedbackOriginAllowed(value),true,value);
 for(const value of [null,'https://evil.test','https://everythinginahub.github.io.evil.test','https://3000-sandbox-id.e2b.app.evil.test','http://3000-sandbox-id.e2b.app','https://not-a-port-sandbox.e2b.app'])assert.equal(isFeedbackOriginAllowed(value),false,String(value));
});

test('allowed preflight responds with the exact origin and only the required methods and headers',async()=>{
 const handler=handlerFor();
 const response=await handler(new Request('https://project.supabase.co/functions/v1/site-feedback',{method:'OPTIONS',headers:{origin,'access-control-request-method':'POST'}}));
 assert.equal(response.status,204);assert.equal(response.headers.get('access-control-allow-origin'),origin);assert.doesNotMatch(response.headers.get('access-control-allow-headers'),/authorization/,'anonymous feedback does not send a user credential');assert.match(response.headers.get('access-control-allow-headers'),/apikey/);assert.equal(response.headers.get('access-control-allow-methods'),'POST, OPTIONS');assert.equal(response.headers.get('vary'),'Origin');assert.equal(response.headers.get('cache-control'),'no-store');
 const blocked=await handler(new Request('https://project.supabase.co/functions/v1/site-feedback',{method:'OPTIONS',headers:{origin:'https://evil.test'}}));assert.equal(blocked.status,403);assert.equal(blocked.headers.get('access-control-allow-origin'),null);
});

test('valid feedback is trimmed, page identifiers are constrained and only approved fields reach storage',async()=>{
 let stored=null,hashedRequest=null;
 const handler=handlerFor({submit:async value=>{stored=value;},hashAddress:async request=>(hashedRequest=request,'b'.repeat(64))});
 const response=await handler(jsonRequest({...valid,message:'  Please add a dark theme to the planner.  ',page:'PLANner',email:'private@example.test'}));
 assert.equal(response.status,200);assert.deepEqual(await responseBody(response),{ok:true});
 assert.deepEqual(stored,{ipHash:'b'.repeat(64),category:'suggestion',message:'Please add a dark theme to the planner.',page:'planner'});assert.equal(hashedRequest.headers.get('origin'),origin);
 const invalidPage=await handler(jsonRequest({...valid,page:'../../admin'}));assert.equal(invalidPage.status,200);assert.equal(stored.page,'website');
});

test('honeypot accepts bot noise without hashing or writing it',async()=>{
 let writes=0,hashes=0;
 const handler=handlerFor({submit:async()=>{writes++;},hashAddress:async()=>(hashes++,'b'.repeat(64))});
 const response=await handler(jsonRequest({website:'https://spam.example',category:'invalid',message:'bot'}));
 assert.equal(response.status,200);assert.deepEqual(await responseBody(response),{ok:true});assert.equal(writes,0);assert.equal(hashes,0);
});

test('invalid origin, method, configuration, content type, payload, category, text and size fail safely',async()=>{
 const handler=handlerFor();
 let response=await handler(jsonRequest(valid,{origin:'https://evil.test'}));assert.equal(response.status,403);
 response=await handler(new Request('https://project.supabase.co/functions/v1/site-feedback',{method:'GET',headers:{origin}}));assert.equal(response.status,405);assert.equal(response.headers.get('allow'),'POST, OPTIONS');
 response=await handlerFor({configured:false})(jsonRequest(valid));assert.equal(response.status,503);
 response=await handler(jsonRequest(valid,{contentType:'text/plain'}));assert.equal(response.status,415);
 response=await handler(jsonRequest(valid,{contentType:'application/jsonp'}));assert.equal(response.status,415);
 response=await handler(jsonRequest('{not json'));assert.equal(response.status,400);
 response=await handler(jsonRequest([]));assert.equal(response.status,400);
 response=await handler(jsonRequest({...valid,category:'unknown'}));assert.equal(response.status,400);
 response=await handler(jsonRequest({...valid,message:'too short'}));assert.equal(response.status,400);
 response=await handler(jsonRequest({...valid,message:'x'.repeat(1501)}));assert.equal(response.status,400);
 response=await handler(jsonRequest({...valid,message:'😀'.repeat(5)}));assert.equal(response.status,400,'five emoji are five database characters, not ten UTF-16 units');
 response=await handler(jsonRequest({...valid,message:'😀'.repeat(10)}));assert.equal(response.status,200,'ten emoji meet the minimum character count');
 response=await handler(jsonRequest({...valid,message:'This message includes '+String.fromCharCode(0)+' a null byte.'}));assert.equal(response.status,400);
 response=await handler(jsonRequest('x'.repeat(20000)));assert.equal(response.status,413);
 response=await handler(new Request('https://project.supabase.co/functions/v1/site-feedback',{method:'POST',headers:{origin,'content-type':'application/json','content-length':'20000'},body:'{}'}));assert.equal(response.status,413);
});

test('rate limits and storage faults return generic, non-sensitive responses',async()=>{
 const limited=handlerFor({submit:async()=>{throw Object.assign(new Error('private detail'),{code:'feedback_rate_limited'});}});
 let response=await limited(jsonRequest(valid));assert.equal(response.status,429);assert.match((await responseBody(response)).error,/about an hour/);
 const unavailable=handlerFor({submit:async()=>{throw new Error('database password must not leak');}});
 response=await unavailable(jsonRequest(valid));assert.equal(response.status,503);assert.doesNotMatch(JSON.stringify(await responseBody(response)),/database password/);
});

test('rate-limit fingerprints are stable for one IP and secret but do not reveal the address',async()=>{
 const request=new Request('https://project.supabase.co/functions/v1/site-feedback',{headers:{'cf-connecting-ip':'203.0.113.7','x-forwarded-for':'198.51.100.22'}});
 const first=await hashClientAddress(request,'server-only-secret'),same=await hashClientAddress(request,'server-only-secret'),different=await hashClientAddress(request,'rotated-secret');
 assert.match(first,/^[a-f0-9]{64}$/);assert.equal(first,same);assert.notEqual(first,different);assert.doesNotMatch(first,/203\.0\.113\.7|198\.51\.100\.22|server-only-secret/);
});
