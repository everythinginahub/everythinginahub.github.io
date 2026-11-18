import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createHandler } from './handler.js';
import { createGeminiGenerator, GEMINI_MODEL } from './gemini.js';
import { createKindleHubGenerator, DEFAULT_KINDLEHUB_MODEL } from './kindlehub.js';
import { createRunnerService } from './runner.js';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const kindleHubKey = Deno.env.get('KINDLEHUB_API_KEY') || '';
const geminiKey = Deno.env.get('GEMINI_API_KEY') || '';
const kindleHubModel = Deno.env.get('KINDLEHUB_MODEL') || DEFAULT_KINDLEHUB_MODEL;
const kindleHubGenerator = kindleHubKey ? createKindleHubGenerator({ key: kindleHubKey, model: kindleHubModel }) : null;
const geminiGenerator = !kindleHubKey && geminiKey ? createGeminiGenerator({ key: geminiKey }) : null;
const managedGenerator = kindleHubGenerator || geminiGenerator;
const managedProvider = kindleHubGenerator ? 'KindleHub' : geminiGenerator ? 'Google Gemini' : '';
const managedModelId = kindleHubGenerator ? kindleHubModel : geminiGenerator ? GEMINI_MODEL : '';
const managedModel = managedGenerator ? {
 id: 'hub-managed', provider: 'hub', name: `Everything Hub · ${managedProvider} · ${managedModelId}`,
 category: 'standard', parametersB: 0, contextLength: 0, maxOutputTokens: 1024, workers: 0, queued: 0
} : null;
const runner = createRunnerService({ llm7Key: Deno.env.get('LLM7_API_KEY') || '' });
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function listModels(options: { refresh?: boolean; signal?: AbortSignal } = {}) {
 const liveModels = await runner.listModels(options);
 return managedModel ? [managedModel, ...liveModels] : liveModels;
}

async function generate(message: string, options: {
 provider?: string; model?: string; signal?: AbortSignal; webSearch?: boolean; searchQuery?: string
} = {}) {
 // The original #ai chat intentionally remains on the site's configured provider only.
 if (!options.provider) {
  if (!managedGenerator) throw new Error('No managed AI provider is configured.');
  return managedGenerator(message, { signal: options.signal });
 }
 let webResults: Array<{ title: string; url: string; snippet: string }> = [];
 if (options.webSearch) webResults = await runner.searchWeb(options.searchQuery || message, options.signal);
 if (options.provider === 'hub') {
  if (!managedGenerator || options.model !== managedModel?.id) throw new Error('The managed AI model is not available. Refresh the model list and choose another.');
  try {
   const answer = await managedGenerator(message, { signal: options.signal, webResults });
   return { answer, provider: 'hub', model: managedModel.id, sources: webResults };
  } catch (error) {
   // A managed-provider outage may fail over to one live standard model. The UI discloses this.
   if (error?.name !== 'ProviderError') throw error;
   const available = await runner.listModels({ signal: options.signal });
   const fallback = available.find(model => model.category === 'standard');
   if (!fallback) throw error;
   const result = await runner.generate(message, { provider: fallback.provider, model: fallback.id, signal: options.signal, webResults, fallbackLimit: 1 });
   return { ...result, failedOverFrom: { provider: 'hub', model: managedModel.id }, sources: webResults };
  }
 }
 const result = await runner.generate(message, { provider: options.provider, model: options.model, signal: options.signal, webResults });
 return webResults.length ? { ...result, sources: webResults } : result;
}

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
  if (error) throw new Error('Quota unavailable');
  return data;
 }
}));
