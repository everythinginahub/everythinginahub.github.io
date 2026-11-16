import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiGenerator,GEMINI_MODEL} from '../supabase/functions/ai-chat/gemini.js';
import {createAssistantIdentityPrompt} from '../supabase/functions/ai-chat/identity.js';

test('Gemini uses the current model and identifies as Everything Hub AI in its system instruction',async()=>{
 let call;
 const signal=new AbortController().signal;
 const generate=createGeminiGenerator({key:'test-key',timeout:()=>signal,fetcher:async(url,options)=>(call={url,options},{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Answer'}]}}]})})});
 assert.equal(await generate('Hello'),'Answer');
 assert.equal(GEMINI_MODEL,'gemini-3.5-flash-lite');
 assert.equal(call.url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
 assert.equal(call.options.headers['x-goog-api-key'],'test-key');
 assert.deepEqual(JSON.parse(call.options.body),{
  contents:[{role:'user',parts:[{text:'Hello'}]}],
  generationConfig:{maxOutputTokens:1024},
  systemInstruction:{parts:[{text:createAssistantIdentityPrompt('Google Gemini',GEMINI_MODEL)}]}
 });
 assert.equal(call.options.signal,signal);
});

test('provider errors are mapped without exposing response body and thought parts are not returned',async()=>{
 const noBody=createGeminiGenerator({key:'k',fetcher:async()=>({ok:false,status:404,json:()=>{throw Error('should not read');}})});
 await assert.rejects(noBody('hi'),error=>error.name==='ProviderError'&&/404/.test(error.message));
 const answer=createGeminiGenerator({key:'k',fetcher:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'internal',thought:true},{text:'public'}]}}]})})});
 assert.equal(await answer('hi'),'public');
});
