-- Apply after community_nicknames.sql. This is a limited impersonation filter,
-- not a guarantee against every spelling or visual lookalike.
create or replace function public.nickname_restricted(p_name text) returns boolean
language sql immutable set search_path = '' as $$
  with folded as (
    select regexp_replace(translate(regexp_replace(translate(lower(normalize(coalesce(p_name,''), NFKD)),
      'ѕһаyуiіeеoоοaαiιυ', 'shayyiieeoooaaiiy'), '[^a-z0-9]', '', 'g'),
      '0134578','oieastb'), '(.)\1+', '\1', 'g') as name
  )
  select name ~ '(shay|shai|shae|shea|shey|owner|admin|moderator|moderation|staf|founder|creator|developer|suport|oficial)'
    or name in ('mod','themod','dev','bos','ceo') from folded;
$$;
revoke all on function public.nickname_restricted(text) from public, anon, authenticated;

create or replace function public.community_nickname_valid(p_nickname text) returns boolean
language sql immutable set search_path = '' as $$
  select p_nickname is not null
    and char_length(trim(p_nickname)) between 2 and 24
    and not public.nickname_restricted(p_nickname)
    and public.chat_text_allowed(trim(p_nickname));
$$;

-- Do not expose a previously saved nickname after it becomes restricted.
-- Leave the row intact so that users can choose a replacement in settings.
create or replace function public.community_nickname_get() returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); result text; candidate text;
begin
  if u is null then raise exception 'Sign in to use chat.'; end if;
  select nickname into result from public.community_nicknames where user_id=u;
  if found then
    if public.community_nickname_valid(result) then return result; end if;
    return null;
  end if;
  select raw_user_meta_data->>'nickname' into candidate from auth.users where id=u;
  if public.community_nickname_valid(candidate) then
    insert into public.community_nicknames(user_id,nickname) values(u,trim(candidate)) on conflict (user_id) do nothing;
    select nickname into result from public.community_nicknames where user_id=u;
    if not public.community_nickname_valid(result) then return null; end if;
  end if;
  return result;
end $$;

-- Also guard the separately chosen live-game player nickname, without touching
-- existing in-progress games or rewriting player identities.
create or replace function public.live_nickname_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.community_nickname_valid(new.nickname) then
    raise exception 'Choose a different nickname; some names and role titles are restricted.';
  end if;
  return new;
end $$;
revoke all on function public.live_nickname_guard() from public, anon, authenticated;
drop trigger if exists live_nickname_guard on public.live_players;
create trigger live_nickname_guard before insert or update of nickname on public.live_players
for each row execute function public.live_nickname_guard();

-- The Owner badge is derived on the server from a confirmed account address.
-- The address itself is never returned to chat clients.
create or replace function public.chat_is_owner(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and lower(email)='parmars@ucs.org.uk');
$$;
revoke all on function public.chat_is_owner(uuid) from public, anon, authenticated;

create or replace function public.community_chat_list() returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to use chat.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',case when public.nickname_restricted(m.nickname) then 'Member' else m.nickname end,'text',m.body,'mine',m.user_id=auth.uid(),'isOwner',public.chat_is_owner(m.user_id),'createdAt',m.created_at) order by m.created_at,m.id),'[]'::jsonb) into result
    from (select c.* from public.community_messages c where c.created_at>now()-interval '24 hours' and not c.hidden and not exists(select 1 from public.community_reports r where r.message_id=c.id and r.user_id=auth.uid()) order by c.created_at desc,c.id desc limit 100) m;
  return result;
end $$;

create or replace function public.live_chat_list(p_room uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.live_rooms%rowtype; me public.live_players%rowtype; messages jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to play.'; end if;
  select * into r from public.live_rooms where id=p_room and expires_at>now();
  if not found then raise exception 'Game not found or expired.'; end if;
  select * into me from public.live_players where room_id=r.id and user_id=auth.uid();
  if not found then raise exception 'You are not in this game.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',m.nickname,'text',m.body,'mine',m.player_id=me.id,'isOwner',public.chat_is_owner(m.user_id),'createdAt',m.created_at) order by m.created_at,m.id),'[]'::jsonb) into messages
  from (select c.id,c.player_id,c.body,c.created_at,p.user_id,case when public.chat_text_allowed(p.nickname) and not public.nickname_restricted(p.nickname) then p.nickname else 'Player' end as nickname from public.live_chat_messages c join public.live_players p on p.id=c.player_id where c.room_id=r.id and public.chat_text_allowed(c.body) order by c.created_at desc,c.id desc limit 60) m;
  return jsonb_build_object('enabled',r.chat_enabled,'messages',messages);
end $$;
