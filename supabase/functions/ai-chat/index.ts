import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler } from './handler.js';
import { createGeminiGenerator } from './gemini.js';
import { createKindleHubGenerator } from './kindlehub.js';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const kindleHubKey = Deno.env.get('KINDLEHUB_API_KEY') || '';
const geminiKey = Deno.env.get('GEMINI_API_KEY') || '';
const kindleHubGenerator = kindleHubKey ? createKindleHubGenerator({
 key: kindleHubKey,
 model: Deno.env.get('KINDLEHUB_MODEL') || ''
}) : null;
const geminiGenerator = !kindleHubKey && geminiKey ? createGeminiGenerator({key:geminiKey}) : null;
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(createHandler({
 configured: !!(url && serviceKey && (kindleHubKey || geminiKey)),
 generate: kindleHubGenerator || geminiGenerator,
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
 }
}));
