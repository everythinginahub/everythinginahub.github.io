import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';

const compiled=build({entryPoints:['supabase/functions/ai-chat/index.ts'],bundle:true,format:'esm',platform:'neutral',external:['npm:*'],minify:true,write:false});
async function boot(){
 const source=(await compiled).outputFiles[0].text;
 assert.doesNotMatch(source,/import\s*['"]https:\/\/raw\.githubusercontent/,'remote entry points previously failed during live startup');
 const importMatch=source.match(/import\{createClient as (\w+)\}from"npm:[^"]+";/);
 assert.ok(importMatch,'only the pinned Supabase npm dependency remains external');
 const requests=[];let handler;
 const service={auth:{getUser:async token=>token==='valid'?{data:{user:{id:'confirmed',email_confirmed_at:'now'}},error:null}:{data:{user:null},error:{message:'invalid'}}},rpc:async()=>({data:1,error:null})};
 const context={Request,Response,Headers,URL,AbortSignal,AbortController,DOMException,TextEncoder,TextDecoder,Uint8Array,setTimeout,clearTimeout,
  [importMatch[1]]:()=>service,
  Deno:{env:{get:key=>({SUPABASE_URL:'https://project.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only'})[key]},serve:fn=>{handler=fn;}},
  fetch:async(url,options)=>{requests.push({url,options});if(String(url).endsWith('/models'))return Response.json({data:[{id:'gpt-oss:20b'}]});return Response.json({choices:[{message:{content:'Test answer'}}]});}
 };
 runInNewContext(source.replace(importMatch[0],''),context,{timeout:5000});
 assert.equal(typeof handler,'function');return{handler,requests};
}
const req=(body,token='')=>new Request('https://project.supabase.co/functions/v1/ai-chat',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
test('deployable bundle starts and registers a handler',async()=>{
 const {handler}=await boot();const response=await handler(new Request('https://project.supabase.co/functions/v1/ai-chat'));assert.equal(response.status,405);
});
test('bundle rejects unauthenticated and invalid tokens without provider calls',async()=>{
 const {handler,requests}=await boot();for(const token of ['','invalid']){assert.equal((await handler(req({action:'models'},token))).status,401);assert.equal((await handler(req({message:'hello'},token))).status,401);}assert.equal(requests.length,0);
});
test('bundle discovers and uses GPT-OSS with a verified account and no LLM7 key',async()=>{
 const {handler,requests}=await boot();
 const catalog=await handler(req({action:'models'},'valid'));assert.equal(catalog.status,200);assert.ok((await catalog.json()).models.some(model=>model.id==='gpt-oss:20b'));
 const response=await handler(req({message:'Hello',provider:'auto',model:'automatic'},'valid'));assert.equal(response.status,200);const result=await response.json();assert.equal(result.answer,'Test answer');assert.equal(result.provider,'llm7');assert.equal(result.model,'gpt-oss:20b');
 assert.ok(requests.every(({options})=>!options.headers.Authorization),'no model credentials are sent in anonymous mode');
});
