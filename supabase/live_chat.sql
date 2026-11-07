-- Apply after live_games.sql and live_fun_modes.sql. No direct browser access.
alter table public.live_rooms add column chat_enabled boolean not null default true;
alter table public.live_players add column last_chat_at timestamptz, add column chat_window_at timestamptz, add column chat_window_count integer not null default 0;
create table public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  player_id uuid not null references public.live_players(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default clock_timestamp()
);
create index live_chat_room_time_idx on public.live_chat_messages(room_id,created_at desc,id desc);
alter table public.live_chat_messages enable row level security;
revoke all on public.live_chat_messages from public, anon, authenticated;

create function public.live_chat_list(p_room uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; messages jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now();
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.nickname,'text',m.body,'mine',m.player_id=me.id,'createdAt',m.created_at) order by m.created_at,m.id),'[]'::jsonb) into messages
  from (select c.id,c.player_id,c.body,c.created_at,p.nickname from public.live_chat_messages c join public.live_players p on p.id=c.player_id where c.room_id=r.id order by c.created_at desc,c.id desc limit 60) m;
  return jsonb_build_object('enabled',r.chat_enabled,'messages',messages);
end $$;

create function public.live_chat_send(p_room uuid,p_text text) returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; t timestamptz:=clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  if not r.chat_enabled then raise exception 'The host has paused chat.'; end if;
  if p_text is null or char_length(trim(p_text)) not between 1 and 250 or p_text ~ '[[:cntrl:]]' then raise exception 'Use 1 to 250 characters on one line.'; end if;
  if me.last_chat_at is not null and t-me.last_chat_at < interval '3 seconds' then raise exception 'Please wait a few seconds before sending again.'; end if;
  if me.chat_window_at is not null and t-me.chat_window_at < interval '1 minute' and me.chat_window_count >= 15 then raise exception 'Chat limit reached. Try again in a minute.'; end if;
  update public.live_players set last_chat_at=t, chat_window_at=case when chat_window_at is null or t-chat_window_at>=interval '1 minute' then t else chat_window_at end,
    chat_window_count=case when chat_window_at is null or t-chat_window_at>=interval '1 minute' then 1 else chat_window_count+1 end where id=me.id;
  insert into public.live_chat_messages(room_id,player_id,body,created_at) values(r.id,me.id,trim(p_text),t);
  delete from public.live_chat_messages where id in (select id from public.live_chat_messages where room_id=r.id order by created_at desc,id desc offset 200);
end $$;

create function public.live_chat_delete(p_room uuid,p_message uuid) returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  delete from public.live_chat_messages where room_id=r.id and id=p_message and (player_id=me.id or r.host_id=auth.uid());
  if not found then raise exception 'Message is unavailable or cannot be removed.'; end if;
end $$;

create function public.live_chat_toggle(p_room uuid,p_enabled boolean) returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found or r.host_id<>auth.uid() then raise exception 'Only the host can control chat.'; end if;
  if p_enabled is null then raise exception 'Choose a chat setting.'; end if;
  update public.live_rooms set chat_enabled=p_enabled where id=r.id;
end $$;
revoke all on function public.live_chat_list(uuid), public.live_chat_send(uuid,text), public.live_chat_delete(uuid,uuid), public.live_chat_toggle(uuid,boolean) from public, anon;
grant execute on function public.live_chat_list(uuid), public.live_chat_send(uuid,text), public.live_chat_delete(uuid,uuid), public.live_chat_toggle(uuid,boolean) to authenticated;
