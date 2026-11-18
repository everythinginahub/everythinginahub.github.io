import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAiRouting} from '../supabase/functions/ai-chat/routing.js';
const model={id:'large-20b',provider:'llm7',category:'standard'};
function setup({catalog=[model],publicFail=false,geminiFail=false,searchFail=false,signal}={}){
 const calls=[];
 const routing=createAiRouting({runner:{listModels:async()=>catalog,searchWeb:async()=>{calls.push('search');if(searchFail)throw Error('Web search unavailable');return [{title:'source',url:'https://example.org'}];},generate:async(_message,options)=>{calls.push('public');if(publicFail)throw Error('offline');return {answer:'public',provider:options.provider,model:options.model};}},geminiModel:'gemini-model',kindleHubModel:'kindle-model',geminiGenerator:async()=>{calls.push('gemini');if(geminiFail)throw Error('offline');return 'Gemini';},kindleHubGenerator:async()=>{calls.push('kindlehub');return 'KindleHub';}});
 return {routing,calls};
}
test('automatic option exists even when the live catalog is empty',async()=>{const {routing}=setup({catalog:[]});assert.equal((await routing.listModels())[0].provider,'auto');});
test('automatic chooses live models without calling KindleHub or Gemini',async()=>{const {routing,calls}=setup();const answer=await routing.generate('hello',{provider:'auto',model:'automatic'});assert.equal(answer.provider,'llm7');assert.deepEqual(calls,['public']);});
test('legacy message-only requests also use public models first',async()=>{const {routing,calls}=setup();await routing.generate('hello');assert.deepEqual(calls,['public']);});
test('KindleHub is last after public and Gemini fail, with truthful attribution',async()=>{const {routing,calls}=setup({publicFail:true,geminiFail:true});const answer=await routing.generate('hello',{provider:'auto'});assert.deepEqual(calls,['public','gemini','kindlehub']);assert.equal(answer.provider,'kindlehub');assert.equal(answer.model,'kindle-model');assert.equal(answer.failedOverFrom.provider,'llm7');});
test('successful Gemini prevents KindleHub usage',async()=>{const {routing,calls}=setup({publicFail:true});await routing.generate('hello');assert.deepEqual(calls,['public','gemini']);});
test('search failure never silently drops requested search or spends model quota',async()=>{const {routing,calls}=setup({searchFail:true});await assert.rejects(()=>routing.generate('hello',{webSearch:true,searchQuery:'hello'}),/Web search/);assert.deepEqual(calls,['search']);});
test('cancelled requests do not trigger fallback',async()=>{const {routing,calls}=setup();await assert.rejects(()=>routing.generate('hello',{signal:AbortSignal.abort()}),{name:'AbortError'});assert.deepEqual(calls,[]);});
test('catalog outage still permits the fallback chain',async()=>{const calls=[];const routing=createAiRouting({runner:{listModels:async()=>{throw Error('offline');}},kindleHubGenerator:async()=>{calls.push('kindlehub');return 'ok';},kindleHubModel:'last'});assert.equal((await routing.generate('hi')).provider,'kindlehub');assert.deepEqual(calls,['kindlehub']);});

test('tries a bounded set of public models across providers before the final fallback',async()=>{
 const calls=[];
 const catalog=[{id:'one',provider:'aihorde'},{id:'two',provider:'aihorde'},{id:'three',provider:'llm7'},{id:'four',provider:'llm7'}];
 const routing=createAiRouting({runner:{listModels:async()=>catalog,generate:async(_message,options)=>{calls.push(options.model);assert.equal(options.fallbackLimit,0);throw Error('offline');}},kindleHubGenerator:async()=>{calls.push('kindlehub');return 'ok';},kindleHubModel:'last'});
 const result=await routing.generate('hi',{provider:'aihorde',model:'two'});
 assert.deepEqual(calls,['two','three','four','kindlehub']);assert.equal(result.provider,'kindlehub');
});

test('a successful alternate public model never invokes KindleHub',async()=>{
 const routing=createAiRouting({runner:{listModels:async()=>[model,{id:'second',provider:'aihorde'}],generate:async(_message,options)=>{if(options.model===model.id)throw Error('offline');return{answer:'ok',provider:options.provider,model:options.model};}},kindleHubGenerator:async()=>assert.fail('must not use last resort')});
 const result=await routing.generate('hi');assert.equal(result.model,'second');assert.equal(result.failedOverFrom.model,model.id);
});
