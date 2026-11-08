-- Apply after community_chat.sql. Nicknames are private account settings;
-- messages retain the nickname they had when posted. Existing accounts that
-- signed up before nicknames were requested must choose one in settings.
create table if not exists public.community_nicknames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null
);
alter table public.community_nicknames enable row level security;
revoke all on public.community_nicknames from public, anon, authenticated;

create or replace function public.community_nickname_valid(p_nickname text) returns boolean
language sql immutable set search_path = '' as $$
  select p_nickname is not null
    and char_length(trim(p_nickname)) between 2 and 24
    and lower(trim(p_nickname)) not in ('admin','moderator','staff','revisepro')
    and public.chat_text_allowed(trim(p_nickname));
$$;
revoke all on function public.community_nickname_valid(text) from public, anon, authenticated;

-- Import only an explicitly chosen nickname from new signup metadata; never
-- publish legacy names automatically, since they may be identifying.
create or replace function public.community_nickname_get() returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); result text; candidate text;
begin
  if u is null then raise exception 'Sign in to use chat.'; end if;
  select nickname into result from public.community_nicknames where user_id=u;
  if found then return result; end if;
  select raw_user_meta_data->>'nickname' into candidate from auth.users where id=u;
  if public.community_nickname_valid(candidate) then
    insert into public.community_nicknames(user_id,nickname) values(u,trim(candidate)) on conflict (user_id) do nothing;
    select nickname into result from public.community_nicknames where user_id=u;
  end if;
  return result;
end $$;

create or replace function public.community_nickname_set(p_nickname text) returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); clean text := trim(p_nickname);
begin
  if u is null then raise exception 'Sign in to change your nickname.'; end if;
  if not public.community_nickname_valid(clean) then
    raise exception 'Choose a nickname of 2–24 characters without links, contact details, reserved names or harmful language.';
  end if;
  insert into public.community_nicknames(user_id,nickname) values(u,clean)
    on conflict (user_id) do update set nickname=excluded.nickname;
  return clean;
end $$;
revoke all on function public.community_nickname_get(), public.community_nickname_set(text) from public, anon;
grant execute on function public.community_nickname_get(), public.community_nickname_set(text) to authenticated;

-- Keep the old RPC signature for cached clients, but never trust its nickname.
create or replace function public.community_chat_send(p_nickname text,p_text text) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid:=auth.uid(); t timestamptz; lim public.community_limits%rowtype; chat_name text;
begin
  if u is null then raise exception 'Sign in to use chat.'; end if;
  chat_name := public.community_nickname_get();
  if chat_name is null then raise exception 'Choose a chat nickname in profile settings before sending.'; end if;
  if p_text is null or char_length(trim(p_text)) not between 1 and 250 then raise exception 'Use a message of 1–250 characters.'; end if;
  if not public.chat_text_allowed(p_text) then raise exception 'Message blocked by the automatic filter. Avoid contact details, links and harmful language.'; end if;
  insert into public.community_limits(user_id) values(u) on conflict do nothing;
  select * into lim from public.community_limits where user_id=u for update; t:=clock_timestamp();
  if lim.last_message_at is not null and t-lim.last_message_at<interval '3 seconds' then raise exception 'Please wait a few seconds before sending again.'; end if;
  if lim.message_window_at is not null and t-lim.message_window_at<interval '1 minute' and lim.message_window_count>=15 then raise exception 'Chat limit reached. Try again in a minute.'; end if;
  update public.community_limits set last_message_at=t, message_window_at=case when message_window_at is null or t-message_window_at>=interval '1 minute' then t else message_window_at end, message_window_count=case when message_window_at is null or t-message_window_at>=interval '1 minute' then 1 else message_window_count+1 end where user_id=u;
  insert into public.community_messages(user_id,nickname,body,created_at) values(u,chat_name,trim(p_text),t);
  delete from public.community_messages where created_at<now()-interval '24 hours';
  -- Bound storage even when many accounts post. Cleanup runs on sends, not a scheduled job.
  perform pg_catalog.pg_advisory_xact_lock(1769035101);
  delete from public.community_messages where id in (select id from public.community_messages order by created_at desc,id desc offset 1000);
end $$;

