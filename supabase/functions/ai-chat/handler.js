// Dependency injection keeps authentication, quota enforcement and provider calls testable.
const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers});
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
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json(405,{error:'Method not allowed.'});
  if(!configured)return json(503,{error:'AI chat is not configured yet.'});
  try{
   const user=await authenticate(request.headers.get('authorization')||'');
   if(!user?.id||!user.email_confirmed_at||user.is_anonymous)return json(401,{error:'Sign in with a confirmed account to use AI chat.'});
   let body;try{body=await readLimited(request);}catch{return json(400,{error:'Invalid request.'});}
   if(!body || typeof body.message!=='string' || !body.message.trim() || body.message.length>4000)return json(400,{error:'Enter a question of up to 4,000 characters.'});
   const used=await reserve(user.id);
   if(used===null)return json(429,{error:'You have used your 10 questions for today. Your allowance resets at midnight UTC.'});
   const answer=await generate(body.message.trim());
   if(typeof answer!=='string'||!answer.trim())return json(502,{error:'The AI could not provide an answer. This attempt counts towards your daily allowance.'});
   return json(200,{answer:answer.slice(0,20000),remaining:10-used});
  }catch(error){
   // Never expose upstream responses, credentials or user prompts in logs or errors.
   if(error?.name==='ProviderError')return json(error.status,{error:error.message+' This attempt counts towards your daily allowance.'});
   return json(503,{error:'AI chat is unavailable right now. If your request reached the AI, the attempt counts towards your daily allowance.'});
  }
 };
}
