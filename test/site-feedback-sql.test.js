import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../supabase/site_feedback.sql',import.meta.url),'utf8');
const ownerReadSql=await readFile(new URL('../supabase/site_feedback_owner_read.sql',import.meta.url),'utf8');

test('owner feedback reader verifies the authenticated site owner on the server and keeps the table private',()=>{
 assert.match(ownerReadSql,/create or replace function public\.site_feedback_admin_list\(p_limit integer default 100\)/i);
 assert.match(ownerReadSql,/security definer\s+set search_path = ''/i);
 assert.match(ownerReadSql,/auth\.uid\(\)/i);
 assert.match(ownerReadSql,/public\.chat_is_owner\(v_user\)/i);
 assert.match(ownerReadSql,/raise exception using errcode = '42501', message = 'not_authorized'/i);
 assert.match(ownerReadSql,/from public\.site_feedback as feedback\s+order by feedback\.created_at desc, feedback\.id desc\s+limit v_limit/i);
 assert.match(ownerReadSql,/revoke all on function public\.site_feedback_admin_list\(integer\) from public, anon, authenticated, service_role/i);
 assert.match(ownerReadSql,/grant execute on function public\.site_feedback_admin_list\(integer\) to authenticated/i);
 assert.doesNotMatch(ownerReadSql,/grant\s+select\s+on\s+public\.site_feedback\s+to\s+(?:public|anon|authenticated)/i);
});

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
