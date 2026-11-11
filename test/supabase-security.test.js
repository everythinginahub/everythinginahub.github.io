import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');

test('base progress table grants and RLS are owner-scoped with no anonymous or delete access',async()=>{
  const sql=await read('../supabase/setup.sql');
  assert.match(sql,/alter table public\.revision_progress enable row level security;/i);
  assert.match(sql,/revoke all on public\.revision_progress from public, anon, authenticated;/i);
  assert.match(sql,/grant select, insert, update on public\.revision_progress to authenticated;/i);
  assert.match(sql,/create policy "Read own progress"[\s\S]*?using\s*\(\(select auth\.uid\(\)\)\s*=\s*user_id\)/i);
  assert.match(sql,/create policy "Insert own progress"[\s\S]*?with check\s*\(\(select auth\.uid\(\)\)\s*=\s*user_id\)/i);
  assert.match(sql,/create policy "Update own progress"[\s\S]*?using\s*\(\(select auth\.uid\(\)\)\s*=\s*user_id\)\s+with check\s*\(\(select auth\.uid\(\)\)\s*=\s*user_id\)/i);
  assert.doesNotMatch(sql,/grant\s+[^;]*\bdelete\b[^;]*\bpublic\.revision_progress\b|grant\s+[^;]*\bdelete\b[^;]*\bto\s+authenticated/i);
});

test('flashcard and live-game tables retain direct-grant and row-level safeguards',async()=>{
  const [flashcards,games,chat]=await Promise.all([read('../supabase/flashcard_sets.sql'),read('../supabase/live_games.sql'),read('../supabase/community_chat.sql')]);
  assert.match(flashcards,/alter table public\.flashcard_sets enable row level security;/i);
  assert.match(flashcards,/revoke all on public\.flashcard_sets from public, anon, authenticated;/i);
  assert.match(flashcards,/grant select, insert, update, delete on public\.flashcard_sets to authenticated;/i);
  assert.match(flashcards,/using\s*\(is_public\s+or\s+\(select auth\.uid\(\)\)\s*=\s*owner_id\)/i);
  for(const table of ['live_rooms','live_players','live_answers','live_bans'])assert.match(games,new RegExp(`alter table public\\.${table} enable row level security;`,'i'));
  assert.match(games,/revoke all on public\.live_rooms, public\.live_players, public\.live_answers, public\.live_bans from public, anon, authenticated;/i);
  assert.match(chat,/revoke all on public\.community_messages,public\.community_reports,public\.community_limits from public,anon,authenticated;/i);
  assert.match(chat,/alter table public\.community_messages enable row level security;/i);
});

test('privacy hardening makes postgres-created public objects opt-in for browser roles',async()=>{
  const sql=await read('../supabase/privacy_hardening.sql');
  assert.match(sql,/alter default privileges for role postgres\s+revoke execute on functions from public/i);
  assert.match(sql,/alter default privileges for role postgres in schema public\s+revoke all on tables from anon, authenticated/i);
  assert.match(sql,/alter default privileges for role postgres in schema public\s+revoke all on sequences from anon, authenticated/i);
  assert.match(sql,/alter default privileges for role postgres in schema public\s+revoke execute on functions from anon, authenticated/i);
});

test('every SQL security-definer routine pins an empty search_path',async()=>{
  const files=(await readdir(new URL('../supabase/',import.meta.url))).filter(path=>path.endsWith('.sql'));
  for(const file of files){
    const sql=await readFile(new URL(`../supabase/${file}`,import.meta.url),'utf8');
    for(const match of sql.matchAll(/create(?:\s+or\s+replace)?\s+function\b[\s\S]*?\$\$;/gi)){
      const definition=match[0];
      if(!/\bsecurity\s+definer\b/i.test(definition))continue;
      const signature=definition.slice(0,definition.indexOf('as $$'));
      assert.match(signature,/security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i,`${file} has a SECURITY DEFINER routine without an empty search_path`);
    }
  }
});
