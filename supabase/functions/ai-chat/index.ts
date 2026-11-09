import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHandler } from './handler.js';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const geminiKey = Deno.env.get('GEMINI_API_KEY') || '';
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(createHandler({
 configured: !!(url && serviceKey && geminiKey),
 async authenticate(authorization: string) {
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;
  const { data, error } = await service.auth.getUser(match[1]);
  return error ? null : data.user;
 },
 async reserve(userId: string) {
  const { data, error } = await service.rpc('ai_reserve_request', { p_user_id: userId });
  if (error) throw new Error('Quota unavailable');
  return data;
 },
 async generate(message: string) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', {
   method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},
   body: JSON.stringify({contents:[{role:'user',parts:[{text:message}]}],generationConfig:{maxOutputTokens:1024,temperature:0.7,thinkingConfig:{thinkingBudget:0}}}),
   signal: AbortSignal.timeout(45000)
  });
  if (response.status===429) { const error = new Error('Provider limit'); error.name='ProviderLimit'; throw error; }
  if (!response.ok) throw new Error('Provider unavailable');
  const result=await response.json();
  return result.candidates?.[0]?.content?.parts?.map((part: {text?:string})=>part.text||'').join('') || '';
 }
}));
