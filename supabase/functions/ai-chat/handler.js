import {corsPreflightResponse,corsResponseHeaders} from '../_shared/cors.js';

// Dependency injection keeps authentication, quota enforcement and provider calls testable.
const responseHeaders = {
 'Content-Type':'application/json',
 'Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer'
};
const json=(request,status,body,extraHeaders={})=>new Response(JSON.stringify(body),{status,headers:corsResponseHeaders(request,{...responseHeaders,...extraHeaders})});
async function readLimited(request){
 const reader=request.body?.getReader(); if(!reader)throw Error('empty');
 let total=0;const parts=[];
 for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>20000){await reader.cancel();throw Error('large');}parts.push(value);}
 const all=new Uint8Array(total);let offset=0;for(const part of parts){all.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder().decode(all));
}
// Only fixed, non-sensitive diagnostics are returned to clients. Never forward provider bodies.
export function providerError(status){
 const messages={400:'Google rejected the AI request (400). The site owner needs to check the model settings.',401:'Google rejected the Gemini API key (401). The site owner needs to check the key.',403:'Google denied access (403). The site owner needs to check the key, API restrictions and project access.',404:'The Gemini model is unavailable for this project (404). The site owner needs to check model access.',429:'The shared AI quota is unavailable right now (429). Please try again later.'};
 const error=new Error(messages[status]||'Google AI is temporarily unavailable. Please try again later.');error.name='ProviderError';error.status=status===429?429:503;return error;
}
export function createHandler({authenticate,reserve,generate,configured=true}){
 return async request=>{
  if(request.method==='OPTIONS')return corsPreflightResponse(request,responseHeaders);
  if(request.method!=='POST')return json(request,405,{error:'Method not allowed.'});
  if(!configured)return json(request,503,{error:'AI chat is not configured yet.'});
  try{
   const user=await authenticate(request.headers.get('authorization')||'');
   if(!user?.id||!user.email_confirmed_at||user.is_anonymous)return json(request,401,{error:'Sign in with a confirmed account to use AI chat.'});
   let body;try{body=await readLimited(request);}catch{return json(request,400,{error:'Invalid request.'});}
   if(!body || typeof body.message!=='string' || !body.message.trim() || body.message.length>4000)return json(request,400,{error:'Enter a question of up to 4,000 characters.'});
   const reserved=await reserve(user.id);
   if(!reserved)return json(request,429,{error:'You have sent too many AI requests in a short period. Please wait for the rate limit to reset and try again.'});
   const answer=await generate(body.message.trim());
   if(typeof answer!=='string'||!answer.trim())return json(request,502,{error:'The AI could not provide an answer. This attempt counts towards the short-term rate limit.'});
   return json(request,200,{answer:answer.slice(0,20000)});
  }catch(error){
   // Never expose upstream responses, credentials or user prompts in logs or errors.
   if(error?.name==='ProviderError')return json(request,error.status,{error:error.message+' This attempt may count towards the short-term rate limit.'},error.retryAfter?{'Retry-After':error.retryAfter}:{});
   return json(request,503,{error:'AI chat is unavailable right now. If your request reached the AI, the attempt may count towards the short-term rate limit.'});
  }
 };
}
