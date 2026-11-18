import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler } from './handler.js';
import { createGeminiGenerator, GEMINI_MODEL } from './gemini.js';
import { createKindleHubGenerator, DEFAULT_KINDLEHUB_MODEL } from './kindlehub.js';
import { createRunnerService } from './runner.js';
import { createAiRouting } from './routing.js';
import { createFreeModelService } from './free-models.js';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const kindleHubKey = Deno.env.get('KINDLEHUB_API_KEY') || '';
const geminiKey = Deno.env.get('GEMINI_API_KEY') || '';
const kindleHubModel = Deno.env.get('KINDLEHUB_MODEL') || DEFAULT_KINDLEHUB_MODEL;
const kindleHubGenerator = kindleHubKey ? createKindleHubGenerator({ key: kindleHubKey, model: kindleHubModel, timeout: () => AbortSignal.timeout(12000) }) : null;
const geminiGenerator = geminiKey ? createGeminiGenerator({ key: geminiKey, timeout: () => AbortSignal.timeout(8000) }) : null;
const runner = createFreeModelService({ runner: createRunnerService({ llm7Key: Deno.env.get('LLM7_API_KEY') || '', includeHorde: false }), groqKey: Deno.env.get('GROQ_API_KEY') || '' });
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { listModels, generate } = createAiRouting({ runner, geminiGenerator, kindleHubGenerator,
 geminiModel: GEMINI_MODEL, kindleHubModel });

Deno.serve(createHandler({
 // Public provider catalogs work without a site-owned model key; Supabase still authenticates users.
 configured: !!(url && serviceKey),
 generate,
 listModels,
 async authenticate(authorization: string) {
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;
  const { data, error } = await service.auth.getUser(match[1]);
  return error ? null : data.user;
 },
 async reserve(userId: string) {
  const { data, error } = await service.rpc('ai_reserve_request', { p_user_id: userId });
  if (error) { const failure = new Error('AI request protection is unavailable. The site owner needs to check the Supabase limiter permissions.'); failure.name = 'QuotaError'; throw failure; }
  return data;
 }
}));
