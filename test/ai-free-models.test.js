import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFreeModelService} from '../supabase/functions/ai-chat/free-models.js';
const json=body=>new Response(JSON.stringify(body));
const runner={listModels:async()=>[{id:'excluded',provider:'aihorde'},{id:'gpt-oss:20b',provider:'llm7'}],searchWeb:async()=>[]};
test('no Groq token means no Groq calls or advertised models; Horde is excluded',async()=>{
 const service=createFreeModelService({runner,fetcher:()=>assert.fail('no network without key')});
 assert.deepEqual((await service.listModels()).map(item=>item.provider),['llm7']);
});
test('only supported live Groq models are shown and catalogs are cached',async()=>{
 let calls=0;
 const service=createFreeModelService({runner,groqKey:'private',fetcher:async(url,options)=>{calls++;assert.equal(options.headers.Authorization,'Bearer private');return json({data:[{id:'openai/gpt-oss-120b'},{id:'openai/gpt-oss-20b',active:false},{id:'unreviewed'}]});}});
 const models=await service.listModels();await service.listModels();assert.equal(calls,1);assert.equal(models[0].id,'gpt-oss:20b');assert.equal(models.find(model=>model.provider==='groq').id,'openai/gpt-oss-120b');assert.equal(models.some(model=>model.id==='unreviewed'),false);
});
test('GPT-OSS completions use server credentials and return truthful attribution',async()=>{
 const service=createFreeModelService({runner,groqKey:'secret',fetcher:async(url,options)=>{assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');const body=JSON.parse(options.body);assert.equal(body.model,'openai/gpt-oss-20b');assert.equal(body.max_completion_tokens,1024);assert.equal(options.headers.Authorization,'Bearer secret');return json({choices:[{message:{content:'answer'}}]});}});
 const result=await service.generate('hello',{provider:'groq',model:'openai/gpt-oss-20b'});assert.deepEqual(result,{answer:'answer',provider:'groq',model:'openai/gpt-oss-20b'});assert.doesNotMatch(JSON.stringify(result),/secret/);
});
test('provider errors cannot leak upstream bodies or keys',async()=>{
 const service=createFreeModelService({runner,groqKey:'secret',fetcher:async()=>new Response('private upstream details',{status:429})});
 await assert.rejects(()=>service.generate('hello',{provider:'groq',model:'openai/gpt-oss-20b'}),error=>error.status===429&&!/private|secret/.test(error.message));
});
test('failed catalogs are briefly cached and never replaced with fictional availability',async()=>{
 let calls=0;const service=createFreeModelService({runner,groqKey:'secret',fetcher:async()=>{calls++;return new Response('',{status:401});}});
 await service.listModels();await service.listModels();assert.equal(calls,1);
});
