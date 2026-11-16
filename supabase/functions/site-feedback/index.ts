import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { createFeedbackHandler, hashClientAddress } from './handler.js';

const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const service = url && serviceKey
  ? createClient(url, serviceKey, {auth:{persistSession:false,autoRefreshToken:false}})
  : null;

Deno.serve(createFeedbackHandler({
  configured: !!service,
  hashAddress: request => hashClientAddress(request, serviceKey),
  async submit({ipHash,category,message,page}) {
    const {error} = await service.rpc('site_feedback_submit', {
      p_ip_hash: ipHash,
      p_category: category,
      p_message: message,
      p_page: page
    });
    if (error) {
      if (String(error.message || '').includes('feedback_rate_limited')) {
        throw Object.assign(new Error('Feedback rate limit reached.'), {code:'feedback_rate_limited'});
      }
      throw error;
    }
  }
}));
