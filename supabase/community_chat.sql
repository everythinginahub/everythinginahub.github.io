-- Apply after live_chat.sql. This is a limited English-language rule filter, not a safety guarantee.
create function public.chat_text_allowed(p_text text) returns boolean language plpgsql immutable set search_path = '' as $$
declare s text; compact text;
begin
  if p_text is null or p_text ~ '[[:cntrl:]]' then return false; end if;
  s := lower(p_text);
  compact := translate(regexp_replace(s,'[^a-z0-9]','','g'),'013457','oieast');
  if s ~* '(https?://|www[. ]|[a-z0-9-]+[.][a-z]{2,}|@)' or length(regexp_replace(s,'[^0-9]','','g'))>=7 then return false; end if;
  if s ~ '\m(fuck|fucking|shit|bitch|cunt|bastard|nigger|nigga|faggot|retard|whore|porn|nude|nudes|rape|rapist|suicide|kys)\M' then return false; end if;
  if compact ~ '(fuck|nigger|nigga|faggot|killyourself|sendnudes|sexualassault)' then return false; end if;
  return true;
end $$;
revoke all on function public.chat_text_allowed(text) from public, anon, authenticated;

create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create index community_messages_time_idx on public.community_messages(created_at desc,id desc);
create table public.community_reports (
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  primary key(message_id,user_id)
);
create table public.community_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  message_window_at timestamptz,
  message_window_count integer not null default 0,
  report_window_at timestamptz,
  report_window_count integer not null default 0
);
alter table public.community_messages enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_limits enable row level security;
revoke all on public.community_messages,public.community_reports,public.community_limits from public,anon,authenticated;

create function public.community_chat_list() returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to use chat.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.nickname,'text',m.body,'mine',m.user_id=auth.uid(),'createdAt',m.created_at) order by m.created_at,m.id),'[]'::jsonb) into result
    from (select c.* from public.community_messages c where c.created_at>now()-interval '24 hours' and not c.hidden and not exists(select 1 from public.community_reports r where r.message_id=c.id and r.user_id=auth.uid()) order by c.created_at desc,c.id desc limit 100) m;
  return result;
end $$;

create function public.community_chat_send(p_nickname text,p_text text) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); t timestamptz; lim public.community_limits%rowtype;
begin
  if u is null then raise exception 'Sign in to use chat.'; end if;
  if p_nickname is null or char_length(trim(p_nickname)) not between 2 and 24 or p_text is null or char_length(trim(p_text)) not between 1 and 250 then raise exception 'Use a nickname of 2–24 characters and a message of 1–250 characters.'; end if;
  if lower(trim(p_nickname)) in ('admin','moderator','staff','revisepro') or not public.chat_text_allowed(p_nickname) or not public.chat_text_allowed(p_text) then raise exception 'Message or nickname blocked by the automatic filter. Avoid contact details, links and harmful language.'; end if;
  insert into public.community_limits(user_id) values(u) on conflict do nothing;
  select * into lim from public.community_limits where user_id=u for update; t:=clock_timestamp();
  if lim.last_message_at is not null and t-lim.last_message_at<interval '3 seconds' then raise exception 'Please wait a few seconds before sending again.'; end if;
  if lim.message_window_at is not null and t-lim.message_window_at<interval '1 minute' and lim.message_window_count>=15 then raise exception 'Chat limit reached. Try again in a minute.'; end if;
  update public.community_limits set last_message_at=t, message_window_at=case when message_window_at is null or t-message_window_at>=interval '1 minute' then t else message_window_at end, message_window_count=case when message_window_at is null or t-message_window_at>=interval '1 minute' then 1 else message_window_count+1 end where user_id=u;
  insert into public.community_messages(user_id,nickname,body,created_at) values(u,trim(p_nickname),trim(p_text),t);
  delete from public.community_messages where created_at<now()-interval '24 hours';
  -- Bound storage even when many accounts post. Cleanup runs on sends, not a scheduled job.
  perform pg_catalog.pg_advisory_xact_lock(1769035101);
  delete from public.community_messages where id in (select id from public.community_messages order by created_at desc,id desc offset 1000);
end $$;

create function public.community_chat_delete(p_message uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to use chat.'; end if;
  delete from public.community_messages where id=p_message and user_id=auth.uid();
  if not found then raise exception 'Message unavailable or not yours.'; end if;
end $$;

create function public.community_chat_report(p_message uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); t timestamptz; lim public.community_limits%rowtype; m public.community_messages%rowtype;
begin
  if u is null then raise exception 'Sign in to use chat.'; end if;
  insert into public.community_limits(user_id) values(u) on conflict do nothing;
  select * into lim from public.community_limits where user_id=u for update; t:=clock_timestamp();
  if lim.report_window_at is not null and t-lim.report_window_at<interval '1 hour' and lim.report_window_count>=10 then raise exception 'Report limit reached. Try again later.'; end if;
  select * into m from public.community_messages where id=p_message and created_at>now()-interval '24 hours' and not hidden for update;
  if not found or m.user_id=u then raise exception 'Message unavailable or cannot be reported.'; end if;
  insert into public.community_reports(message_id,user_id) values(m.id,u) on conflict do nothing;
  if not found then raise exception 'You already reported this message.'; end if;
  update public.community_limits set report_window_at=case when report_window_at is null or t-report_window_at>=interval '1 hour' then t else report_window_at end, report_window_count=case when report_window_at is null or t-report_window_at>=interval '1 hour' then 1 else report_window_count+1 end where user_id=u;
  if (select count(*) from public.community_reports where message_id=m.id)>=3 then update public.community_messages set hidden=true where id=m.id; end if;
end $$;


-- Suppress previously stored messages and nicknames that trip the same filter.
create or replace function public.live_chat_list(p_room uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; messages jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now();
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.nickname,'text',m.body,'mine',m.player_id=me.id,'createdAt',m.created_at) order by m.created_at,m.id),'[]'::jsonb) into messages
  from (select c.id,c.player_id,c.body,c.created_at,case when public.chat_text_allowed(p.nickname) then p.nickname else 'Player' end as nickname from public.live_chat_messages c join public.live_players p on p.id=c.player_id where c.room_id=r.id and public.chat_text_allowed(c.body) order by c.created_at desc,c.id desc limit 60) m;
  return jsonb_build_object('enabled',r.chat_enabled,'messages',messages);
end $$;

-- Apply the same text filter to in-game chat while retaining all room checks and host controls.
create or replace function public.live_chat_send(p_room uuid,p_text text) returns void language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; t timestamptz:=clock_timestamp();
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now() for update;
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  if not r.chat_enabled then raise exception 'The host has paused chat.'; end if;
  if p_text is null or char_length(trim(p_text)) not between 1 and 250 or p_text ~ '[[:cntrl:]]' then raise exception 'Use 1 to 250 characters on one line.'; end if;
  if not public.chat_text_allowed(p_text) then raise exception 'Message blocked by the automatic filter. Avoid contact details, links and harmful language.'; end if;
  if me.last_chat_at is not null and t-me.last_chat_at < interval '3 seconds' then raise exception 'Please wait a few seconds before sending again.'; end if;
  if me.chat_window_at is not null and t-me.chat_window_at < interval '1 minute' and me.chat_window_count >= 15 then raise exception 'Chat limit reached. Try again in a minute.'; end if;
  update public.live_players set last_chat_at=t, chat_window_at=case when chat_window_at is null or t-chat_window_at>=interval '1 minute' then t else chat_window_at end,
    chat_window_count=case when chat_window_at is null or t-chat_window_at>=interval '1 minute' then 1 else chat_window_count+1 end where id=me.id;
  insert into public.live_chat_messages(room_id,player_id,body,created_at) values(r.id,me.id,trim(p_text),t);
  delete from public.live_chat_messages where id in (select id from public.live_chat_messages where room_id=r.id order by created_at desc,id desc offset 200);
end $$;
revoke all on function public.community_chat_list(),public.community_chat_send(text,text),public.community_chat_delete(uuid),public.community_chat_report(uuid) from public,anon;
grant execute on function public.community_chat_list(),public.community_chat_send(text,text),public.community_chat_delete(uuid),public.community_chat_report(uuid) to authenticated;
