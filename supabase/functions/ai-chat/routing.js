// Unified routing: live public models, optional Gemini, then KindleHub last.
export const automaticModel={id:'automatic',provider:'auto',name:'Automatic · best available',category:'standard',parametersB:0,maxOutputTokens:1024};
export function createAiRouting({runner,geminiGenerator,kindleHubGenerator,geminiModel,kindleHubModel}){
 async function listModels(options={}){return [automaticModel,...await runner.listModels(options)];}
 async function generate(message,options={}){
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(75000)]):AbortSignal.timeout(75000);
  const checkAbort=()=>{if(signal?.aborted)throw new DOMException('Request cancelled.','AbortError');};
  checkAbort();
  // Search failures are not model failures: never silently answer without requested search.
  const webResults=options.webSearch?await runner.searchWeb(options.searchQuery||message,signal):[];
  let selected=null,lastError;
  try{
   const catalog=await runner.listModels({signal});checkAbort();
   selected=options.provider&& !['auto','hub'].includes(options.provider)
    ?catalog.find(model=>model.provider===options.provider&&model.id===options.model)||catalog[0]
    :catalog[0];
   const candidates=selected?[selected,...catalog.filter(model=>model.provider!==selected.provider||model.id!==selected.id).sort((a,b)=>Number(a.provider===selected.provider)-Number(b.provider===selected.provider))].slice(0,3):[];
   for(const candidate of candidates){
    checkAbort();
    try{
     const result=await runner.generate(message,{provider:candidate.provider,model:candidate.id,signal:AbortSignal.any([signal,AbortSignal.timeout(10000)]),webResults,fallbackLimit:0});
     return {...result,sources:webResults,failedOverFrom:candidate===selected?result.failedOverFrom:{provider:selected.provider,model:selected.id}};
    }catch(error){checkAbort();lastError=error;}
   }
  }catch(error){checkAbort();lastError=error;}
  for(const [provider,model,generator] of [['gemini',geminiModel,geminiGenerator],['kindlehub',kindleHubModel,kindleHubGenerator]]){
   if(!generator)continue;checkAbort();
   try{
    const answer=await generator(message,{signal,webResults});
    return {answer,provider,model,sources:webResults,failedOverFrom:{provider:selected?.provider||options.provider||'auto',model:selected?.id||options.model||'automatic'}};
   }catch(error){checkAbort();lastError=error;}
  }
  if(lastError?.name==='ProviderError')throw lastError;
  const error=new Error('No AI provider could answer right now. Please retry shortly or connect a local server.');error.name='RunnerError';throw error;
 }
 return {listModels,generate};
}
