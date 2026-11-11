import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('owner checks use trusted confirmed app metadata, never a published email',async()=>{
  const [ownerSql,ownerSeedSql,usernameSql,migration,appJs]=await Promise.all([
    read('../supabase/community_owner_names.sql'),
    read('../supabase/community_owner_shay.sql'),
    read('../supabase/username_auth.sql'),
    read('../supabase/privacy_hardening.sql'),
    read('../public/app.js')
  ]);
  for(const source of [ownerSql,ownerSeedSql,usernameSql,migration])assert.doesNotMatch(source,/@/,'owner SQL must not publish an email literal');
  const ownerCheck=ownerSql.match(/create or replace function public\.chat_is_owner\([\s\S]*?\$\$;/i)?.[0];
  assert.ok(ownerCheck,'owner check function should be present');
  assert.match(ownerCheck,/raw_app_meta_data->>'site_owner'='true'/);
  assert.match(ownerCheck,/email_confirmed_at is not null/);
  assert.doesNotMatch(ownerCheck,/raw_user_meta_data/i,'user-editable metadata must not grant owner status');
  assert.doesNotMatch(ownerSql,/lower\s*\(\s*email\s*\)\s*=/i);
  assert.doesNotMatch(ownerSeedSql,/lower\s*\(\s*email\s*\)\s*=/i);
  assert.doesNotMatch(usernameSql,/where\s+lower\s*\(\s*email\s*\)/i);
  assert.match(ownerSeedSql,/public\.chat_is_owner\(id\)/);
  assert.match(usernameSql,/public\.chat_is_owner\(id\)/);
  assert.match(migration,/raw_app_meta_data->>'site_owner'='true'/);
  assert.doesNotMatch(appJs,/accountUser\.email\?\.toLowerCase\(\)\s*===/);
  assert.match(appJs,/accountUser\.app_metadata\?\.site_owner\s*===\s*true/,'the owner display name uses trusted metadata instead of a hard-coded email');
});

test('public username login returns a session after password auth without exposing internal emails',async()=>{
  const [handler,index,backend,sql]=await Promise.all([
    read('../supabase/functions/username-auth/handler.js'),
    read('../supabase/functions/username-auth/index.ts'),
    read('../public/account-backend.js'),
    read('../supabase/username_auth.sql')
  ]);
  assert.match(handler,/action==='login'/);
  assert.match(handler,/session:\{access_token:session\.access_token,refresh_token:session\.refresh_token\}/);
  assert.doesNotMatch(handler,/action==='resolve'|reply\(200,\{email:/);
  assert.match(index,/auth\.auth\.signInWithPassword\(\{email:account\.email,password\}\)/);
  assert.match(backend,/usernameRequest\(\{action:'login',username,password\}\)/);
  assert.match(backend,/client\.auth\.setSession\(\{access_token:session\.access_token,refresh_token:session\.refresh_token\}\)/);
  assert.doesNotMatch(backend,/action:'resolve'/);
  assert.match(sql,/revoke all on function public\.account_username_finalize\(uuid,text,text\[\]\), public\.account_username_resolve\(text\) from public, anon, authenticated;/i);
  assert.match(sql,/grant execute on function public\.account_username_finalize\(uuid,text,text\[\]\), public\.account_username_resolve\(text\) to service_role;/i);
});

test('login and recovery limits are isolated by normalized username before privileged lookup',async()=>{
  const [setup,migration,edge,migrationFile]=await Promise.all([
    read('../supabase/username_auth.sql'),read('../supabase/privacy_hardening.sql'),
    read('../supabase/functions/username-auth/handler.js'),read('../supabase/auth_rate_limit_hardening.sql')
  ]);
  for(const source of [setup,migration]){
    assert.match(source,/when 'login' then 30/i);
    assert.match(source,/when 'recover' then 10/i);
    assert.doesNotMatch(source,/when 'login_unknown'/i);
    assert.match(source,/grant execute on function public\.account_auth_reserve\(text,text\) to service_role/i);
  }
  assert.match(setup,/primary key\(action,subject_key\)/i);
  assert.match(migrationFile,/primary key\(action,subject_key\)/i);
  assert.match(migrationFile,/when 'login_unknown' then 600/i,'legacy one-argument calls retain a separate compatibility bucket');
  assert.match(migrationFile,/when 'recover_unknown' then 120/i);
  assert.match(edge,/reserve\('login',`username:\$\{username\}`\)/);
  assert.match(edge,/reserve\('recover',`username:\$\{username\}`\)/);
  const login=edge.slice(edge.indexOf("if(action==='login')"),edge.indexOf("if(action==='codes')"));
  assert.ok(login.indexOf("reserve('login'")<login.indexOf('await resolve(username)'));
  const recovery=edge.slice(edge.indexOf("if(action==='signup')"));
  assert.ok(recovery.indexOf("reserve('recover'")<recovery.indexOf('await resolve(username)'));
});

test('AI quota reservation has an empty search path and service-role-only access',async()=>{
  const quota=await read('../supabase/ai_quota.sql');
  const migration=await read('../supabase/privacy_hardening.sql');
  for(const source of [quota,migration]){
    const functionSql=source.match(/create or replace function public\.ai_reserve_request\(p_user_id uuid\)[\s\S]*?\$\$;/i)?.[0];
    assert.ok(functionSql,'AI quota function should be present');
    assert.match(functionSql,/security definer\s+set search_path\s*=\s*''/i);
    assert.match(functionSql,/insert into public\.ai_daily_usage as usage_row/i);
    assert.match(functionSql,/where usage_row\.used < 10/i);
    assert.match(source,/revoke all on function public\.ai_reserve_request\(uuid\) from public, anon, authenticated;/i);
    assert.match(source,/grant execute on function public\.ai_reserve_request\(uuid\) to service_role;/i);
  }
});
