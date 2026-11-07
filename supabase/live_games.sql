-- Live games. All access is through the authenticated security-definer RPCs below.
-- Questions contain answer keys: never grant direct table access to clients.
create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  mode text not null check (mode in ('hosted','race')),
  status text not null default 'lobby' check (status in ('lobby','question','reveal','finished')),
  current_question integer not null default 0,
  questions jsonb not null,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);
create table public.live_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  finished_at timestamptz,
  joined_at timestamptz not null default now(),
  unique(room_id,user_id)
);
create table public.live_answers (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  player_id uuid not null references public.live_players(id) on delete cascade,
  question_number integer not null,
  choice integer not null,
  correct boolean not null,
  primary key (room_id,player_id,question_number)
);
create table public.live_bans (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(room_id,user_id)
);
create index live_players_room_idx on public.live_players(room_id);
alter table public.live_rooms enable row level security;
alter table public.live_players enable row level security;
alter table public.live_answers enable row level security;
alter table public.live_bans enable row level security;
revoke all on public.live_rooms, public.live_players, public.live_answers, public.live_bans from public, anon, authenticated;

create function public.live_create(p_title text, p_mode text, p_questions jsonb, p_nickname text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code text; v_room uuid; q jsonb; c jsonb; n integer; k integer; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in to play.'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 100 or p_nickname is null or char_length(trim(p_nickname)) not between 2 and 24 or p_mode not in ('hosted','race') or p_mode is null then raise exception 'Check the game details and nickname.'; end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' or octet_length(p_questions::text) > 60000 then raise exception 'Invalid questions.'; end if;
  n := jsonb_array_length(p_questions);
  if n < 2 or n > 20 then raise exception 'Games need 2 to 20 questions.'; end if;
  for q in select value from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q) <> 'object' or jsonb_typeof(q->'question') is distinct from 'string' or char_length(trim(q->>'question')) not between 1 and 1000 or jsonb_typeof(q->'choices') is distinct from 'array' or jsonb_typeof(q->'correct') is distinct from 'number' or (q->>'correct') !~ '^[0-3]$' then raise exception 'Invalid question.'; end if;
    k := jsonb_array_length(q->'choices');
    if k < 2 or k > 4 or (q->>'correct')::integer >= k then raise exception 'Invalid choices.'; end if;
    for c in select value from jsonb_array_elements(q->'choices') loop
      if jsonb_typeof(c) <> 'string' or char_length(trim(c #>> '{}')) not between 1 and 1000 then raise exception 'Invalid choice.'; end if;
    end loop;
  end loop;
  -- Serialize a host's creates, and bound room creation on the free tier.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,0));
  -- Expired rooms are removed opportunistically; no scheduler is required.
  delete from public.live_rooms where expires_at < now();
  if (select count(*) from public.live_rooms where host_id=v_uid and created_at > now() - interval '2 hours') >= 10 then raise exception 'You have hosted 10 games recently. Try again later.'; end if;
  if (select count(*) from public.live_rooms where host_id=v_uid and status <> 'finished' and expires_at > now()) >= 3 then raise exception 'You already have three active games. End one before hosting another.'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    begin
      insert into public.live_rooms(code,host_id,title,mode,questions) values(v_code,v_uid,trim(p_title),p_mode,p_questions) returning id into v_room;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  insert into public.live_players(room_id,user_id,nickname) values(v_room,v_uid,trim(p_nickname));
  return jsonb_build_object('id',v_room,'code',v_code);
end $$;

create function public.live_join(p_code text, p_nickname text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in to play.'; end if;
  if p_code is null or upper(trim(p_code)) !~ '^[0-9A-F]{10}$' or p_nickname is null or char_length(trim(p_nickname)) not between 2 and 24 then raise exception 'Enter a valid game code and nickname.'; end if;
  select * into r from public.live_rooms where code=upper(trim(p_code)) and expires_at>now() for update;
  if not found then raise exception 'Game not found or expired.'; end if;
  if exists(select 1 from public.live_bans where room_id=r.id and user_id=v_uid) then raise exception 'The host removed you from this game.'; end if;
  if not exists(select 1 from public.live_players where room_id=r.id and user_id=v_uid) then
    if r.status <> 'lobby' then raise exception 'This game has already started.'; end if;
    if (select count(*) from public.live_players where room_id=r.id) >= 30 then raise exception 'This game is full.'; end if;
    if exists(select 1 from public.live_players where room_id=r.id and lower(nickname)=lower(trim(p_nickname))) then raise exception 'That nickname is already in use.'; end if;
    insert into public.live_players(room_id,user_id,nickname) values(r.id,v_uid,trim(p_nickname));
  end if;
  return jsonb_build_object('id',r.id,'code',r.code);
end $$;

create function public.live_state(p_room uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; n integer; pos integer; q jsonb; chosen integer; board jsonb; answered integer; last_answer jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now();
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  n := jsonb_array_length(r.questions);
  select count(*) into pos from public.live_answers where room_id=r.id and player_id=me.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.nickname,'host',p.user_id=r.host_id,'score',
    (select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id and a.correct and (r.mode='race' or r.status in ('reveal','finished') or a.question_number<r.current_question)),
    'progress',(select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id),'finishedAt',p.finished_at) order by p.joined_at,p.id),'[]'::jsonb)
    into board from public.live_players p where p.room_id=r.id;
  if r.status in ('question','reveal') then
    if r.mode='hosted' then pos := r.current_question; end if;
    if pos<n then
      q := r.questions->pos;
      select choice into chosen from public.live_answers where room_id=r.id and player_id=me.id and question_number=pos;
      select count(*) into answered from public.live_answers where room_id=r.id and question_number=pos;
      q := jsonb_build_object('number',pos,'text',q->>'question','choices',q->'choices','selected',chosen,'answered',answered,
        'correct',case when r.mode='hosted' and r.status='reveal' then (q->>'correct')::integer else null end);
    end if;
  end if;
  if r.mode='race' then
    select jsonb_build_object('correct',a.correct,'answer',(r.questions->a.question_number->'choices'->((r.questions->a.question_number->>'correct')::integer))) into last_answer
      from public.live_answers a where a.room_id=r.id and a.player_id=me.id order by a.question_number desc limit 1;
  end if;
  return jsonb_build_object('id',r.id,'code',r.code,'title',r.title,'mode',r.mode,'status',r.status,'isHost',r.host_id=auth.uid(),
    'nickname',me.nickname,'total',n,'question',q,'players',board,'lastAnswer',last_answer,'expiresAt',r.expires_at);
end $$;

create function public.live_control(p_room uuid, p_action text, p_player uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found or r.host_id<>auth.uid() then raise exception 'Only the host can control this game.'; end if;
  if p_action='kick' then
    if r.status='finished' then raise exception 'This game has ended.'; end if;
    insert into public.live_bans(room_id,user_id) select room_id,user_id from public.live_players where id=p_player and room_id=r.id and user_id<>r.host_id on conflict do nothing;
    delete from public.live_players where id=p_player and room_id=r.id and user_id<>r.host_id;
    if r.mode='race' and r.status='question' and not exists(select 1 from public.live_players p where p.room_id=r.id and (select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id)<jsonb_array_length(r.questions)) then update public.live_rooms set status='finished' where id=r.id; end if;
  elsif p_action='start' and r.status='lobby' then
    if (select count(*) from public.live_players where room_id=r.id)<2 then raise exception 'At least two players are needed.'; end if;
    update public.live_rooms set status='question' where id=r.id;
  elsif p_action='reveal' and r.mode='hosted' and r.status='question' then
    update public.live_rooms set status='reveal' where id=r.id;
  elsif p_action='next' and r.mode='hosted' and r.status='reveal' then
    update public.live_rooms set status=case when r.current_question+1>=jsonb_array_length(r.questions) then 'finished' else 'question' end,current_question=least(r.current_question+1,jsonb_array_length(r.questions)-1) where id=r.id;
  elsif p_action='finish' and r.status<>'finished' then
    update public.live_rooms set status='finished' where id=r.id;
  else raise exception 'That action is not available now.';
  end if;
end $$;

create function public.live_answer(p_room uuid, p_question integer, p_choice integer)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; pos integer; q jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found or r.status<>'question' then raise exception 'This game is not accepting answers.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  if r.mode='hosted' then pos := r.current_question; else select count(*) into pos from public.live_answers where room_id=r.id and player_id=me.id; end if;
  if p_question is null or p_question<>pos or pos>=jsonb_array_length(r.questions) then raise exception 'That question is no longer active.'; end if;
  q := r.questions->pos;
  if p_choice is null or p_choice<0 or p_choice>=jsonb_array_length(q->'choices') then raise exception 'Choose an answer.'; end if;
  insert into public.live_answers(room_id,player_id,question_number,choice,correct) values(r.id,me.id,pos,p_choice,p_choice=(q->>'correct')::integer);
  if r.mode='race' and pos+1=jsonb_array_length(r.questions) then update public.live_players set finished_at=clock_timestamp() where id=me.id; end if;
  if r.mode='race' and not exists(select 1 from public.live_players p where p.room_id=r.id and (select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id)<jsonb_array_length(r.questions)) then
    update public.live_rooms set status='finished' where id=r.id;
  end if;
exception when unique_violation then raise exception 'You have already answered this question.';
end $$;

revoke all on function public.live_create(text,text,jsonb,text), public.live_join(text,text), public.live_state(uuid), public.live_control(uuid,text,uuid), public.live_answer(uuid,integer,integer) from public, anon;
grant execute on function public.live_create(text,text,jsonb,text), public.live_join(text,text), public.live_state(uuid), public.live_control(uuid,text,uuid), public.live_answer(uuid,integer,integer) to authenticated;
