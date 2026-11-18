import {createAssistantIdentityPrompt,createWebSearchContext} from './identity.js';
// Groq's OpenAI-compatible API requires an operator-owned key even on its free plan.
const BASE='https://api.groq.com/openai/v1';
const supported=new Map([['openai/gpt-oss-20b','GPT-OSS 20B'],['llama-3.3-70b-versatile','Llama 3.3 70B'],['llama-3.1-8b-instant','Llama 3.1 8B']]);
export function createFreeModelService({runner,groqKey='',fetcher=fetch,now=Date.now}){
 let cached=[],expires=0,pending=null;
 async function groqModels(signal){
  if(!groqKey)return [];
  if(expires>now())return cached;
  if(pending)return pending;
  pending=(async()=>{
   try{
    const response=await fetcher(`${BASE}/models`,{headers:{Authorization:`Bearer ${groqKey}`},signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(8000)]),redirect:'error'});
    if(!response.ok){cached=[];expires=now()+12000;return [];}
    const payload=await response.json();
    cached=[...supported].filter(([id])=>payload?.data?.some(item=>item.id===id&&item.active!==false)).map(([id,name])=>({id,name,provider:'groq',category:'standard',maxOutputTokens:1024}));
    expires=now()+90000;return cached;
   }catch{expires=now()+12000;cached=[];return [];}finally{pending=null;}
  })();return pending;
 }
 return {
  async listModels(options={}){
   const [groq,other]=await Promise.all([groqModels(options.signal),runner.listModels(options).catch(()=>[])]);
   return [...other.filter(model=>model.provider==='llm7'&&!/gpt-oss[:/-]120b/i.test(model.id)).map(model=>({...model,category:'standard'})),...groq];
  },
  searchWeb:(...args)=>runner.searchWeb(...args),
  async generate(message,options={}){
   if(options.provider!=='groq')return runner.generate(message,options);
   if(!groqKey||!supported.has(options.model))throw new Error('Requested free-tier model is not configured.');
   const response=await fetcher(`${BASE}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${groqKey}`,'Content-Type':'application/json'},redirect:'error',signal:options.signal,body:JSON.stringify({model:options.model,messages:[{role:'system',content:createAssistantIdentityPrompt('Groq',options.model,{webSearch:!!options.webResults?.length})},{role:'user',content:createWebSearchContext(message,options.webResults)}],max_completion_tokens:1024,stream:false})});
   if(!response.ok){const error=new Error(response.status===429?'The free-tier model quota is busy. Please retry later.':'The free-tier model provider could not answer.');error.name='ProviderError';error.status=response.status===429?429:503;throw error;}
   const answer=(await response.json())?.choices?.[0]?.message?.content;
   if(typeof answer!=='string'||!answer.trim())throw new Error('The free-tier model returned no answer.');
   return {answer:answer.slice(0,20000),provider:'groq',model:options.model};
  }
 };
}
