import {corsPreflightResponse,corsResponseHeaders} from '../_shared/cors.js';

// Dependency injection keeps authentication, quota enforcement and provider calls testable.
const responseHeaders={
 'Content-Type':'application/json',
 'Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer'
};
const json=(request,status,body,extraHeaders={})=>new Response(JSON.stringify(body),{status,headers:corsResponseHeaders(request,{...responseHeaders,...extraHeaders})});
async function readLimited(request){
 const reader=request.body?.getReader();if(!reader)throw Error('empty');
 let total=0;const parts=[];
 for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>20000){await reader.cancel();throw Error('large');}parts.push(value);}
 const all=new Uint8Array(total);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(all));
}
function safeSources(sources){
 if(!Array.isArray(sources))return [];
 const result=[];
 for(const source of sources.slice(0,5)){
  if(!source||typeof source.title!=='string'||typeof source.url!=='string')continue;
  try{const url=new URL(source.url);if(url.protocol!=='https:'||!url.hostname||url.username||url.password)continue;result.push({title:source.title.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,180),url:url.href,snippet:typeof source.snippet==='string'?source.snippet.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,700):''});}catch{}
 }
 return result;
}
// Only fixed, non-sensitive diagnostics are returned to clients. Never forward provider bodies.
export function providerError(status){
 const messages={400:'Google rejected the AI request (400). The site owner needs to check the model settings.',401:'Google rejected the Gemini API key (401). The site owner needs to check the key.',403:'Google denied access (403). The site owner needs to check the key, API restrictions and project access.',404:'The Gemini model is unavailable for this project (404). The site owner needs to check model access.',429:'The shared AI quota is unavailable right now (429). Please try again later.'};
 const error=new Error(messages[status]||'Google AI is temporarily unavailable. Please try again later.');error.name='ProviderError';error.status=status===429?429:503;return error;
}
export function createHandler({authenticate,reserve,generate,listModels,configured=true}){
 return async request=>{
  if(request.method==='OPTIONS')return corsPreflightResponse(request,responseHeaders);
  if(request.method!=='POST')return json(request,405,{error:'Method not allowed.'});
  if(!configured)return json(request,503,{error:'AI chat is not configured yet.'});
  try{
   const user=await authenticate(request.headers.get('authorization')||'');
   if(!user?.id||!user.email_confirmed_at||user.is_anonymous)return json(request,401,{error:'Sign in with a confirmed account to use AI chat.'});
   let body;try{body=await readLimited(request);}catch{return json(request,400,{error:'Invalid request.'});}
   if(body?.action==='models'){
    if(typeof listModels!=='function')return json(request,503,{error:'The live model catalog is unavailable right now.'});
    if(body.refresh!==undefined&&typeof body.refresh!=='boolean')return json(request,400,{error:'Invalid model-list request.'});
    try{
     const models=await listModels({refresh:body.refresh===true,signal:request.signal});
     return json(request,200,{models:Array.isArray(models)?models:[]});
    }catch{return json(request,503,{error:'The live model catalog is unavailable right now. Try refreshing in a moment.'});}
   }
   if(body?.action!==undefined&&body.action!=='chat')return json(request,400,{error:'Invalid AI action.'});
   if(!body||typeof body.message!=='string'||!body.message.trim()||body.message.length>4000)return json(request,400,{error:'Enter a question of up to 4,000 characters.'});
   if((body.provider!==undefined&&typeof body.provider!=='string')||(body.model!==undefined&&typeof body.model!=='string')||Boolean(body.provider)!==Boolean(body.model))return json(request,400,{error:'Choose an available AI model.'});
   if(body.webSearch!==undefined&&typeof body.webSearch!=='boolean')return json(request,400,{error:'Invalid web-search setting.'});
   if(body.searchQuery!==undefined&&(typeof body.searchQuery!=='string'||body.searchQuery.length>240))return json(request,400,{error:'Web-search query must be 240 characters or fewer.'});
   if(body.webSearch===true&&(!body.searchQuery?.trim()||body.searchQuery.length>240))return json(request,400,{error:'Enter a question of up to 240 characters to search the web.'});
   const reserved=await reserve(user.id);
   if(!reserved)return json(request,429,{error:'You have sent too many AI requests in a short period. Please wait for the rate limit to reset and try again.'});
   const generated=await generate(body.message.trim(),{
    provider:body.provider,
    model:body.model,
    signal:request.signal,
    webSearch:body.webSearch===true,
    searchQuery:body.webSearch===true?body.searchQuery.trim():''
   });
   const answer=typeof generated==='string'?generated:generated?.answer;
   if(typeof answer!=='string'||!answer.trim())return json(request,502,{error:'The AI could not provide an answer. This attempt counts towards the short-term rate limit.'});
   const result={answer:answer.slice(0,20000)};
   if(generated&&typeof generated==='object'){
    if(typeof generated.provider==='string')result.provider=generated.provider.slice(0,40);
    if(typeof generated.model==='string')result.model=generated.model.slice(0,180);
    if(generated.failedOverFrom&&typeof generated.failedOverFrom==='object')result.failedOverFrom={provider:String(generated.failedOverFrom.provider||'').slice(0,40),model:String(generated.failedOverFrom.model||'').slice(0,180)};
    const sources=safeSources(generated.sources);if(sources.length)result.sources=sources;
   }
   return json(request,200,result);
  }catch(error){
   // Never expose upstream responses, credentials or user prompts in logs or errors.
   if(error?.name==='QuotaError')return json(request,503,{error:'AI request protection is unavailable. The site owner needs to check the Supabase limiter configuration.'});
   if(error?.name==='ProviderError')return json(request,error.status,{error:error.message+' This attempt may count towards the short-term rate limit.'},error.retryAfter?{'Retry-After':error.retryAfter}:{});
   if(error?.name==='RunnerError'||String(error?.message||'').startsWith('Web search'))return json(request,503,{error:String(error.message).slice(0,220)+' This attempt may count towards the short-term rate limit.'});
   return json(request,503,{error:'AI chat is unavailable right now. If your request reached the AI, the attempt may count towards the short-term rate limit.'});
  }
 };
}
