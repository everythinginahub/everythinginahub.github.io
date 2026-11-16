import {createAssistantIdentityPrompt} from './identity.js';

export const KINDLEHUB_API_BASE='https://kindlehub-api.arancool3000.workers.dev/v1';
export const DEFAULT_KINDLEHUB_MODEL='gemini-3.1-flash-lite';

function providerError(status,code,retryAfter){
 const messages={
  'model_not_found':'KindleHub does not offer the configured model for this key. Check KINDLEHUB_MODEL or the models available to your account.',
  'bad_messages':'KindleHub rejected the question format. Please try a shorter, plain-text question.',
  'context_length_exceeded':'This question is too long for the available KindleHub model.',
  'invalid_api_key':'KindleHub rejected the server-side API key. Check KINDLEHUB_API_KEY or create a valid key in an invited account.',
  'origin_not_allowed':'KindleHub refused the server-side request because of the key’s website-origin restrictions. Adjust the key settings for server-side use.',
  'not_invited':'This API key belongs to an account without KindleHub Developer API access. The account must be invited.',
  'account_suspended':'KindleHub has suspended the account associated with this API key.',
  'rate_limit_exceeded':'The KindleHub per-key rate limit has been reached. Please wait and try again.',
  'plan_quota_exceeded':'The KindleHub account’s daily AI allowance has been used. API use shares that allowance with the KindleHub app.',
  'capacity_exceeded':'KindleHub’s shared AI capacity is full for today. Please try again later.',
  'api_off':'KindleHub has temporarily switched off its API.'
 };
 const message=messages[code]||messages[status]||`KindleHub could not process the request (${status}). Please try again later.`;
 const error=new Error(message);
 error.name='ProviderError';
 error.status=status===429?429:503;
 if(status===429&&typeof retryAfter==='string'&&/^\d{1,5}$/.test(retryAfter))error.retryAfter=retryAfter;
 return error;
}

async function assertOk(response){
 if(response.ok)return;
 let code='';
 try{code=(await response.clone().json())?.error?.code||'';}catch{}
 throw providerError(response.status,code,response.headers?.get?.('Retry-After')||'');
}

function answerText(payload){
 const content=payload?.choices?.[0]?.message?.content;
 if(typeof content==='string')return content;
 if(Array.isArray(content))return content.filter(part=>part?.type==='text'&&typeof part.text==='string').map(part=>part.text).join('');
 return '';
}

export function createKindleHubGenerator({key,model=DEFAULT_KINDLEHUB_MODEL,fetcher=fetch,timeout=()=>AbortSignal.timeout(45000)}={}){
 return async message=>{
  if(typeof key!=='string'||!key.trim())throw new Error('KindleHub API is not configured.');
  const selectedModel=typeof model==='string'&&model.trim()?model.trim():DEFAULT_KINDLEHUB_MODEL;
  const response=await fetcher(`${KINDLEHUB_API_BASE}/chat/completions`,{
   method:'POST',
   headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
   body:JSON.stringify({model:selectedModel,messages:[{role:'system',content:createAssistantIdentityPrompt('KindleHub API',selectedModel)},{role:'user',content:message}],max_tokens:1024}),
   signal:timeout()
  });
  await assertOk(response);
  let payload;
  try{payload=await response.json();}catch{throw new Error('KindleHub returned an invalid AI response.');}
  return answerText(payload);
 };
}
