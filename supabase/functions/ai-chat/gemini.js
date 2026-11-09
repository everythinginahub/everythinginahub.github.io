import {providerError} from './handler.js';

// Google restricts Gemini 2.5 to existing users. Use the current Flash-Lite model
// recommended for new projects and its default minimal thinking level.
export const GEMINI_MODEL='gemini-3.5-flash-lite';
export function createGeminiGenerator({key,fetcher=fetch,timeout=()=>AbortSignal.timeout(45000)}){
 return async message=>{
  const response=await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
   body:JSON.stringify({contents:[{role:'user',parts:[{text:message}]}],generationConfig:{maxOutputTokens:1024}}),
   signal:timeout()
  });
  if(!response.ok)throw providerError(response.status);
  const result=await response.json();
  return result.candidates?.[0]?.content?.parts?.filter(part=>!part.thought).map(part=>part.text||'').join('')||'';
 };
}
