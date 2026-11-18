import {providerError} from './handler.js';
import {createAssistantIdentityPrompt,createWebSearchContext} from './identity.js';

// Google restricts Gemini 2.5 to existing users. Use the current Flash-Lite model
// recommended for new projects and its default minimal thinking level.
export const GEMINI_MODEL='gemini-3.5-flash-lite';
export function createGeminiGenerator({key,fetcher=fetch,timeout=()=>AbortSignal.timeout(45000)}){
 return async (message,{webResults=[],signal}={})=>{
  const requestSignal=signal?AbortSignal.any([signal,timeout()]):timeout();
  const hasWeb=Array.isArray(webResults)&&webResults.length>0;
  const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({contents:[{role:'user',parts:[{text:createWebSearchContext(message,webResults)}]}],generationConfig:{maxOutputTokens:1024},systemInstruction:{parts:[{text:createAssistantIdentityPrompt('Google Gemini',GEMINI_MODEL,{webSearch:hasWeb})}]}}),
   signal:requestSignal
  });
  if(!response.ok)throw providerError(response.status);
  const result=await response.json();
  return result.candidates?.[0]?.content?.parts?.filter(part=>!part.thought).map(part=>part.text||'').join('')||'';
 };
}
