-- Apply after live_games.sql. Rewards and scores are resolved on the server.
alter table public.live_rooms drop constraint live_rooms_mode_check;
alter table public.live_rooms add constraint live_rooms_mode_check check (mode in ('hosted','race','treasure','rocket'));
alter table public.live_rooms add column last_event text;
alter table public.live_players add column game_score integer not null default 0 check (game_score >= 0), add column streak integer not null default 0, add column shield boolean not null default false;
alter table public.live_answers add column chest_opened boolean not null default false, add column chest_result text;

create or replace function public.live_create(p_title text, p_mode text, p_questions jsonb, p_nickname text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_code text; v_room uuid; q jsonb; c jsonb; n integer; k integer; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in to play.'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 100 or p_nickname is null or char_length(trim(p_nickname)) not between 2 and 24 or p_mode not in ('hosted','race','treasure','rocket') or p_mode is null then raise exception 'Check the game details and nickname.'; end if;
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

create or replace function public.live_state(p_room uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; n integer; pos integer; q jsonb; chosen integer; board jsonb; answered integer; last_answer jsonb; pending integer; chest_result text;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now();
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  n := jsonb_array_length(r.questions);
  select count(*) into pos from public.live_answers where room_id=r.id and player_id=me.id;
  if r.mode='treasure' then
    select a.question_number into pending from public.live_answers a where a.room_id=r.id and a.player_id=me.id and a.correct and not a.chest_opened order by a.question_number desc limit 1;
    select a.chest_result into chest_result from public.live_answers a where a.room_id=r.id and a.player_id=me.id and a.chest_opened and a.question_number=pos-1 limit 1;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.nickname,'host',p.user_id=r.host_id,'score',
    case when r.mode in ('treasure','rocket') then p.game_score else
    (select count(*)::integer from public.live_answers a where a.room_id=r.id and a.player_id=p.id and a.correct and (r.mode='race' or r.status in ('reveal','finished') or a.question_number<r.current_question)) end,
    'progress',(select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id),'finishedAt',p.finished_at,
    'shield',case when r.mode='treasure' then p.shield else false end,
    'streak',case when r.mode='rocket' then p.streak else 0 end) order by p.joined_at,p.id),'[]'::jsonb)
    into board from public.live_players p where p.room_id=r.id;
  if r.status in ('question','reveal') then
    if r.mode='hosted' then pos := r.current_question; end if;
    if pos<n and pending is null then
      q := r.questions->pos;
      select choice into chosen from public.live_answers where room_id=r.id and player_id=me.id and question_number=pos;
      select count(*) into answered from public.live_answers where room_id=r.id and question_number=pos;
      q := jsonb_build_object('number',pos,'text',q->>'question','choices',q->'choices','selected',chosen,'answered',answered,
        'correct',case when r.mode='hosted' and r.status='reveal' then (q->>'correct')::integer else null end);
    end if;
  end if;
  if r.mode in ('race','rocket','treasure') then
    select jsonb_build_object('correct',a.correct,'answer',(r.questions->a.question_number->'choices'->((r.questions->a.question_number->>'correct')::integer))) into last_answer
      from public.live_answers a where a.room_id=r.id and a.player_id=me.id order by a.question_number desc limit 1;
  end if;
  return jsonb_build_object('id',r.id,'code',r.code,'title',r.title,'mode',r.mode,'status',r.status,'isHost',r.host_id=auth.uid(),
    'nickname',me.nickname,'total',n,'question',q,'players',board,'lastAnswer',last_answer,'pendingChest',pending,
    'chestResult',chest_result,'lastEvent',r.last_event,'expiresAt',r.expires_at);
end $$;

create or replace function public.live_control(p_room uuid, p_action text, p_player uuid default null)
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
    if r.mode in ('race','treasure','rocket') and r.status='question' and not exists(select 1 from public.live_players p where p.room_id=r.id and ((select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id)<jsonb_array_length(r.questions) or exists(select 1 from public.live_answers a where a.room_id=r.id and a.player_id=p.id and a.correct and not a.chest_opened and r.mode='treasure'))) then update public.live_rooms set status='finished' where id=r.id; end if;
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

create or replace function public.live_answer(p_room uuid, p_question integer, p_choice integer)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; pos integer; q jsonb; is_correct boolean; new_streak integer;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found or r.status<>'question' then raise exception 'This game is not accepting answers.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  if r.mode='treasure' and exists(select 1 from public.live_answers a where a.room_id=r.id and a.player_id=me.id and a.correct and not a.chest_opened) then raise exception 'Open your chest first.'; end if;
  if r.mode='hosted' then pos := r.current_question; else select count(*) into pos from public.live_answers where room_id=r.id and player_id=me.id; end if;
  if p_question is null or p_question<>pos or pos>=jsonb_array_length(r.questions) then raise exception 'That question is no longer active.'; end if;
  q := r.questions->pos;
  if p_choice is null or p_choice<0 or p_choice>=jsonb_array_length(q->'choices') then raise exception 'Choose an answer.'; end if;
  is_correct := p_choice=(q->>'correct')::integer;
  insert into public.live_answers(room_id,player_id,question_number,choice,correct) values(r.id,me.id,pos,p_choice,is_correct);
  if r.mode='rocket' then
    new_streak := case when is_correct then me.streak+1 else 0 end;
    update public.live_players set streak=new_streak, game_score=game_score+case when is_correct then 10+5*least(new_streak-1,4) else 0 end where id=me.id;
  end if;
  if r.mode in ('race','rocket','treasure') and pos+1=jsonb_array_length(r.questions) and (r.mode<>'treasure' or not is_correct) then update public.live_players set finished_at=clock_timestamp() where id=me.id; end if;
  if r.mode in ('race','rocket','treasure') and not exists(select 1 from public.live_players p where p.room_id=r.id and ((select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id)<jsonb_array_length(r.questions) or (r.mode='treasure' and exists(select 1 from public.live_answers a where a.room_id=r.id and a.player_id=p.id and a.correct and not a.chest_opened)))) then
    update public.live_rooms set status='finished' where id=r.id;
  end if;
exception when unique_violation then raise exception 'You have already answered this question.';
end $$;

-- Every chest has the same odds. Results are generated only after the pick; no client-provided reward is trusted.
create function public.live_open_chest(p_room uuid, p_question integer, p_chest integer)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; victim public.live_players%rowtype; roll double precision; amount integer; result text; event text;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found or r.mode<>'treasure' or r.status<>'question' then raise exception 'This game cannot open a chest now.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  if p_chest is null or p_chest not between 0 and 2 or p_question is null or not exists(select 1 from public.live_answers a where a.room_id=r.id and a.player_id=me.id and a.question_number=p_question and a.correct and not a.chest_opened) then raise exception 'That chest is not available.'; end if;
  roll := random();
  if roll < 0.60 then
    amount:=25+25*floor(random()*4)::integer;
    update public.live_players set game_score=game_score+amount where id=me.id;
    result:=format('You found %s gold!',amount); event:=format('%s found %s gold!',me.nickname,amount);
  elsif roll < 0.85 then
    select * into victim from public.live_players where room_id=r.id and id<>me.id and game_score>0 order by game_score desc,joined_at,id limit 1;
    if not found then
      update public.live_players set game_score=game_score+25 where id=me.id;
      result:='No gold to steal, so you found 25 gold!'; event:=format('%s found 25 gold!',me.nickname);
    elsif victim.shield then
      update public.live_players set shield=false where id=victim.id;
      result:=format('%s’s shield blocked your steal!',victim.nickname); event:=format('%s’s shield blocked %s’s steal!',victim.nickname,me.nickname);
    else
      amount:=least(50,victim.game_score);
      update public.live_players set game_score=game_score-amount where id=victim.id;
      update public.live_players set game_score=game_score+amount where id=me.id;
      result:=format('You stole %s gold from %s!',amount,victim.nickname); event:=format('%s stole %s gold from %s!',me.nickname,amount,victim.nickname);
    end if;
  else
    update public.live_players set shield=true where id=me.id;
    result:='You found a shield! It blocks one steal.'; event:=format('%s found a shield!',me.nickname);
  end if;
  update public.live_answers set chest_opened=true,chest_result=result where room_id=r.id and player_id=me.id and question_number=p_question;
  update public.live_rooms set last_event=event where id=r.id;
  if (select count(*) from public.live_answers where room_id=r.id and player_id=me.id)=jsonb_array_length(r.questions) then update public.live_players set finished_at=clock_timestamp() where id=me.id; end if;
  if not exists(select 1 from public.live_players p where p.room_id=r.id and ((select count(*) from public.live_answers a where a.room_id=r.id and a.player_id=p.id)<jsonb_array_length(r.questions) or exists(select 1 from public.live_answers a where a.room_id=r.id and a.player_id=p.id and a.correct and not a.chest_opened))) then update public.live_rooms set status='finished' where id=r.id; end if;
end $$;
revoke all on function public.live_open_chest(uuid,integer,integer) from public, anon;
grant execute on function public.live_open_chest(uuid,integer,integer) to authenticated;
