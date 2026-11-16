import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../supabase/site_feedback.sql',import.meta.url),'utf8');

test('feedback database storage is private, constrained and guarded by an atomic rate limit',()=>{
 assert.match(sql,/create table if not exists public\.site_feedback/i);
 assert.match(sql,/category in \('suggestion', 'problem', 'other'\)/i);
 assert.match(sql,/char_length\(message\) between 10 and 1500/i);
 assert.match(sql,/page ~ '\^\[a-z0-9-\]\{1,40\}\$'/i);
 assert.match(sql,/alter table public\.site_feedback enable row level security/i);
 assert.match(sql,/alter table public\.site_feedback_rate_limits enable row level security/i);
 assert.match(sql,/revoke all on public\.site_feedback, public\.site_feedback_rate_limits from public, anon, authenticated, service_role/i);
 assert.match(sql,/security definer\s+set search_path = ''/i);
 assert.match(sql,/for update/i,'same-fingerprint submissions serialize before checking the limit');
 assert.match(sql,/submissions >= 5/i);
 assert.match(sql,/interval '1 hour'/i);
 assert.match(sql,/window_started_at < v_now - interval '24 hours'/i);
 assert.match(sql,/revoke all on function public\.site_feedback_submit\(text, text, text, text\) from public, anon, authenticated/i);
 assert.match(sql,/grant execute on function public\.site_feedback_submit\(text, text, text, text\) to service_role/i);
 assert.doesNotMatch(sql,/grant\s+[^;]*\b(?:anon|authenticated)\s*;/i);
});
