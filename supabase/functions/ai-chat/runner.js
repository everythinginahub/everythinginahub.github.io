import {createAssistantIdentityPrompt,createWebSearchContext} from './identity.js';

const AI_HORDE_BASE='https://oai.aihorde.net/v1';
const LLM7_BASE='https://api.llm7.io/v1';
const DUCKDUCKGO_SEARCH='https://html.duckduckgo.com/html/';
const MODEL_CACHE_MS=90_000;
const EMPTY_MODEL_CACHE_MS=12_000;
const MAX_PER_CATEGORY=10;
const MIN_POWER_B=7;
const QUEUE_PER_WORKER_LIMIT=4_000;
const MAX_OUTPUT_TOKENS=1_024;
const SEARCH_TIMEOUT_MS=8_000;
const SEARCH_RESULT_LIMIT=5;
const MAX_SEARCH_QUERY=240;
const MAX_SEARCH_RESPONSE_BYTES=1_000_000;

// A model is offered only when the provider's current /models response includes it.
// Only size-identifiable large candidates are admitted; other aliases stay hidden until provider metadata can qualify them. A live listing is not a guarantee that generation will succeed.
const LLM7_POWER_PROFILES=[
 {suffix:'gpt-oss:120b',name:'GPT-OSS 120B'},
 {suffix:'gpt-oss:20b',name:'GPT-OSS 20B'},
 {suffix:'gemma4:31b',name:'Gemma 4 31B'}
];

const finiteNumber=value=>{const number=Number(value);return Number.isFinite(number)&&number>0?number:0;};
function modelId(value){return typeof value==='string'&&value.trim().length<=180&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():'';}
function parameterCount(id,model={}){
 const explicit=finiteNumber(model.parameters_b||model.parameter_count_b||model.parametersB);
 if(explicit)return explicit;
 const match=String(id||'').match(/(?:^|[^0-9])(\d+(?:\.\d+)?)\s*b(?:$|[^a-z0-9])/i);
 return match?Number(match[1]):0;
}
function categoryFor(id,model={}){
 const explicit=String(model.category||'').toLowerCase();
 if(explicit==='abliterated')return 'abliterated';
 if(explicit==='standard')return 'standard';
 return /abliterat|heretic|uncensored|unfiltered|dolphin|obliterat|lorablated|stheno|cydonia|magnum|skyfall|behemoth|rocinante|lumimaid|dark[-_ ]?orthia|wicked|impish|fimbulvetr|mythomax|noromaid|lunaris|wayfarer/i.test(`${id} ${model.name||''} ${model.display_name||''} ${model.description||''}`)?'abliterated':'standard';
}
function formatHordeName(id){
 return String(id).replace(/^(?:koboldcpp|llamacpp|lmstudio|aphrodite|vllm|tabbyapi)\//i,'').replace(/[-_](?:Q\d(?:_[A-Z0-9]+)+|IQ\d_[A-Z]+|GGUF|AWQ|EXL2)$/i,'').replace(/[_]+/g,' ').trim()||String(id);
}
function readModels(payload){return Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.models)?payload.models:[];}
function normalizedModel({id,provider,name,category,parametersB,contextLength,maxOutputTokens,workers=0,queued=0}){
 return {id,provider,name,category,parametersB,contextLength,maxOutputTokens,workers,queued};
}
function activeHordeModels(payload){
 const result=[];
 for(const item of readModels(payload)){
  const id=modelId(item?.id);if(!id||/debug-/i.test(id))continue;
  const horde=item?.x_horde||item?.horde||{};
  const workers=finiteNumber(horde.workers??item.workers??item.worker_count??item.count);
  const queued=Number.isFinite(Number(horde.queued??item.queued))?Math.max(0,Number(horde.queued??item.queued)):0;
  if(workers<1||queued/workers>QUEUE_PER_WORKER_LIMIT)continue;
  const parametersB=parameterCount(id,item);
  if(parametersB<MIN_POWER_B)continue;
  const contextLength=finiteNumber(item.context_length||item.top_provider?.context_length);
  if(contextLength&&contextLength<4_096)continue;
  const maxOutputTokens=Math.min(MAX_OUTPUT_TOKENS,finiteNumber(item.top_provider?.max_completion_tokens||item.max_completion_tokens)||MAX_OUTPUT_TOKENS);
  if(maxOutputTokens<512)continue;
  result.push(normalizedModel({id,provider:'aihorde',name:formatHordeName(id),category:categoryFor(id,item),parametersB,contextLength,maxOutputTokens,workers,queued}));
 }
 return result;
}
function candidateProfile(id){
 const normalized=String(id||'').toLowerCase();
 return LLM7_POWER_PROFILES.find(profile=>normalized===profile.suffix||normalized.endsWith(`/${profile.suffix}`))||null;
}
function listedLlm7Models(payload){
 const result=[];
 for(const item of readModels(payload)){
  const id=modelId(item?.id||item?.name);if(!id)continue;
  const profile=candidateProfile(id);if(!profile)continue;
  const parametersB=parameterCount(id,item);if(parametersB<MIN_POWER_B)continue;
  const contextLength=finiteNumber(item.context_length||item.context_window||item.max_model_len);
  if(contextLength&&contextLength<4_096)continue;
  const maxOutputTokens=Math.min(MAX_OUTPUT_TOKENS,finiteNumber(item.max_completion_tokens||item.max_output_tokens)||MAX_OUTPUT_TOKENS);
  if(maxOutputTokens<512)continue;
  result.push(normalizedModel({id,provider:'llm7',name:profile.name,category:'standard',parametersB,contextLength,maxOutputTokens}));
 }
 return result;
}
function rankModels(a,b){
 if(a.category!==b.category)return a.category==='abliterated'?-1:1;
 if(b.parametersB!==a.parametersB)return b.parametersB-a.parametersB;
 const queueA=a.queued/Math.max(1,a.workers),queueB=b.queued/Math.max(1,b.workers);
 if(queueA!==queueB)return queueA-queueB;
 if(b.workers!==a.workers)return b.workers-a.workers;
 return a.name.localeCompare(b.name);
}
function filterCatalog(input){
 const unique=new Map();
 for(const model of input){const key=`${model.provider}:${model.id}`;if(!unique.has(key))unique.set(key,model);}
 const sorted=[...unique.values()].sort(rankModels);
 return [...sorted.filter(model=>model.category==='abliterated').slice(0,MAX_PER_CATEGORY),...sorted.filter(model=>model.category==='standard').slice(0,MAX_PER_CATEGORY)];
}
function timedSignal(parentSignal,milliseconds){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(new DOMException('Provider request timed out.','TimeoutError')),milliseconds);
 const onAbort=()=>controller.abort(parentSignal.reason||new DOMException('Request cancelled.','AbortError'));
 if(parentSignal?.aborted)onAbort();else parentSignal?.addEventListener('abort',onAbort,{once:true});
 return {signal:controller.signal,dispose(){clearTimeout(timeout);parentSignal?.removeEventListener('abort',onAbort);}};
}
async function fetchJson(fetcher,url,{signal,timeoutMs=8_000,headers={}}={}){
 const timed=timedSignal(signal,timeoutMs);
 try{
  const response=await fetcher(url,{method:'GET',headers:{Accept:'application/json',...headers},signal:timed.signal,redirect:'error'});
  if(!response.ok)return null;
  return JSON.parse(await readTextLimited(response,MAX_SEARCH_RESPONSE_BYTES));
 }catch{return null;}finally{timed.dispose();}
}
async function readTextLimited(response,limit){
 const declared=Number(response.headers?.get?.('content-length')||0);
 if(declared>limit){await response.body?.cancel?.();throw new Error('The web search response was too large.');}
 if(!response.body?.getReader){const text=await response.text();if(new TextEncoder().encode(text).byteLength>limit)throw new Error('The web search response was too large.');return text;}
 const reader=response.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error('The web search response was too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder().decode(bytes);
}
function decodeHtml(value){
 return String(value||'').replace(/&#(x[\da-f]+|\d+);?/gi,(_,code)=>{const number=code[0]?.toLowerCase()==='x'?parseInt(code.slice(1),16):parseInt(code,10);return Number.isFinite(number)&&number>0&&number<=0x10ffff?String.fromCodePoint(number):' ';}).replace(/&nbsp;?/gi,' ').replace(/&amp;?/gi,'&').replace(/&quot;?/gi,'"').replace(/&#39;|&apos;?/gi,"'").replace(/&lt;?/gi,'<').replace(/&gt;?/gi,'>');
}
function plainText(value){return decodeHtml(String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ')).replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim();}
function attribute(source,name){const match=String(source||'').match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,'i'));return match?decodeHtml(match[2]):'';}
function searchUrl(href){
 try{
  const parsed=new URL(decodeHtml(href),'https://html.duckduckgo.com');
  if(parsed.hostname==='duckduckgo.com'||parsed.hostname.endsWith('.duckduckgo.com')){
   const target=parsed.searchParams.get('uddg');if(!target)return '';
   const resolved=new URL(target);if(resolved.protocol!=='https:'||!resolved.hostname||resolved.username||resolved.password)return '';
   return resolved.href;
  }
  return parsed.protocol==='https:'&&parsed.hostname&&!parsed.username&&!parsed.password?parsed.href:'';
 }catch{return '';}
}
function parseSearchResults(html){
 const titles=[],snippets=[];
 for(const match of String(html||'').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
  const attrs=match[1]||'',classes=attribute(attrs,'class');
  if(/(?:^|\s)result__a(?:\s|$)/.test(classes))titles.push({title:plainText(match[2]),url:searchUrl(attribute(attrs,'href'))});
  if(/(?:^|\s)result__snippet(?:\s|$)/.test(classes))snippets.push(plainText(match[2]));
 }
 const results=[],seen=new Set();
 for(let index=0;index<titles.length&&results.length<SEARCH_RESULT_LIMIT;index++){
  const {title,url}=titles[index];if(!title||!url||seen.has(url))continue;seen.add(url);
  results.push({title:title.slice(0,180),url,snippet:(snippets[index]||'').slice(0,700)});
 }
 return results;
}
function providerFailure(status){
 const error=new Error(status===429?'The selected public model service is busy or rate-limited.':'The selected public model is temporarily unavailable.');
 error.name='ProviderError';error.status=status===429?429:503;return error;
}
function answerText(payload){
 const content=payload?.choices?.[0]?.message?.content;
 if(typeof content==='string')return content;
 if(Array.isArray(content))return content.filter(part=>part?.type==='text'&&typeof part.text==='string').map(part=>part.text).join('');
 return '';
}

export function createRunnerService({fetcher=fetch,now=()=>Date.now(),cacheMs=MODEL_CACHE_MS,llm7Key=''}={}){
 let cache=null,inFlight=null;
 let lastRefresh=-Infinity;
 async function loadCatalog({refresh=false,signal}={}){
  if(cache&&cache.expiresAt>now()&&(!refresh||now()-lastRefresh<12_000))return cache.models.map(model=>({...model}));
  if(inFlight)return (await inFlight).map(model=>({...model}));
  lastRefresh=now();
  const request=(async()=>{
   const [hordePayload,llm7Payload]=await Promise.all([
    fetchJson(fetcher,`${AI_HORDE_BASE}/models`,{signal}),
    llm7Key?fetchJson(fetcher,`${LLM7_BASE}/models`,{signal,headers:{Authorization:`Bearer ${llm7Key}`}}):null
   ]);
   const models=filterCatalog([...activeHordeModels(hordePayload),...listedLlm7Models(llm7Payload)]);
   cache={models,expiresAt:now()+(models.length?cacheMs:EMPTY_MODEL_CACHE_MS)};
   return models;
  })();
  inFlight=request;
  try{return (await request).map(model=>({...model}));}finally{if(inFlight===request)inFlight=null;}
 }
 async function searchWeb(query,signal){
  const normalized=String(query||'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,MAX_SEARCH_QUERY);
  if(!normalized)throw new Error('Enter a question before using web search.');
  const timed=timedSignal(signal,SEARCH_TIMEOUT_MS),url=new URL(DUCKDUCKGO_SEARCH);url.searchParams.set('q',normalized);
  try{
   const response=await fetcher(url.href,{method:'GET',headers:{Accept:'text/html'},signal:timed.signal,redirect:'error'});
   if(!response.ok)throw new Error('Web search is temporarily unavailable. Turn off web search and try again.');
   const results=parseSearchResults(await readTextLimited(response,MAX_SEARCH_RESPONSE_BYTES));
   if(!results.length)throw new Error('Web search did not return usable results. Turn off web search and try again.');
   return results;
  }catch(error){
   if(signal?.aborted||error?.name==='AbortError')throw error;
   if(error?.message?.startsWith('Web search'))throw error;
   throw new Error('Web search is temporarily unavailable. Turn it off and try again.');
  }finally{timed.dispose();}
 }
 async function complete(model,message,signal,webResults=[]){
  const base=model.provider==='aihorde'?AI_HORDE_BASE:LLM7_BASE;
  const withWeb=Array.isArray(webResults)&&webResults.length>0;
  const body={model:model.id,messages:[
   {role:'system',content:createAssistantIdentityPrompt(model.provider==='aihorde'?'AI Horde':'LLM7',model.id,{webSearch:withWeb})},
   {role:'user',content:createWebSearchContext(message,webResults)}
  ],temperature:0.7,max_tokens:Math.min(MAX_OUTPUT_TOKENS,model.maxOutputTokens),stream:false};
  const headers={'Content-Type':'application/json',Accept:'application/json'};
  if(model.provider==='llm7')headers.Authorization=`Bearer ${llm7Key}`;
  if(model.provider==='aihorde'){
   headers.Authorization='Bearer 0000000000';
   body.horde={conformance:'best_effort'};
  }
  const timed=timedSignal(signal,45_000);
  try{
   const response=await fetcher(`${base}/chat/completions`,{method:'POST',headers,body:JSON.stringify(body),signal:timed.signal,redirect:'error'});
   if(!response.ok)throw providerFailure(response.status);
   const text=answerText(await response.json()).trim();
   if(!text)throw providerFailure(502);
   return text.slice(0,20_000);
  }finally{timed.dispose();}
 }
 async function generate(message,{provider,model,signal,webResults=[],fallbackLimit=2}={}){
  if(!['aihorde','llm7'].includes(provider)||typeof model!=='string'||!model)throw providerFailure(404);
  let catalog=await loadCatalog({signal});
  let selected=catalog.find(item=>item.provider===provider&&item.id===model);
  if(!selected){catalog=await loadCatalog({refresh:true,signal});selected=catalog.find(item=>item.provider===provider&&item.id===model);}
  if(!selected)throw new Error('That model is no longer listed with suitable active capacity. Refresh the model list and choose another.');
  const fallbacks=catalog.filter(item=>item.category===selected.category&&(item.provider!==selected.provider||item.id!==selected.id)).slice(0,Math.max(0,Math.min(2,fallbackLimit)));
  const attempts=[selected,...fallbacks];let lastStatus=503;
  for(let index=0;index<attempts.length;index++){
   const candidate=attempts[index];
   if(signal?.aborted)throw new DOMException('Request cancelled.','AbortError');
   try{
    const answer=await complete(candidate,message,signal,webResults);
    return {answer,provider:candidate.provider,model:candidate.id,failedOverFrom:index?{provider:selected.provider,model:selected.id}:null};
   }catch(error){
    if(signal?.aborted||error?.name==='AbortError')throw error;
    lastStatus=Number(error?.status)||503;
   }
  }
  if(lastStatus===429)throw providerFailure(429);
  throw new Error('The selected model and up to two same-category fallbacks are currently unavailable. Refresh the model list and try again.');
 }
 return {listModels:loadCatalog,generate,searchWeb};
}

export const runnerModelRules={MIN_POWER_B,QUEUE_PER_WORKER_LIMIT,MAX_OUTPUT_TOKENS,MAX_SEARCH_QUERY};
