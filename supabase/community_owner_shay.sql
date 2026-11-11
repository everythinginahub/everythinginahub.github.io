-- Apply after community_owner_names.sql. Only the confirmed owner account may
-- use the exact nickname Shay (case-insensitive); all other reserved-name
-- protections and chat filtering continue to apply.
create or replace function public.community_nickname_valid_for_user(p_user uuid, p_nickname text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_nickname is not null and char_length(trim(p_nickname)) between 2 and 24
    and public.chat_text_allowed(trim(p_nickname))
    and (not public.nickname_restricted(p_nickname)
      or (lower(trim(p_nickname)) = 'shay' and public.chat_is_owner(p_user)));
$$;
revoke all on function public.community_nickname_valid_for_user(uuid,text) from public, anon, authenticated;

create or replace function public.community_nickname_get() returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); result text; candidate text;
begin
  if u is null then raise exception 'Sign in to use chat.'; end if;
  select nickname into result from public.community_nicknames where user_id=u;
  if found then
    if public.community_nickname_valid_for_user(u,result) then return result; end if;
    return null;
  end if;
  select raw_user_meta_data->>'nickname' into candidate from auth.users where id=u;
  if public.community_nickname_valid_for_user(u,candidate) then
    insert into public.community_nicknames(user_id,nickname) values(u,trim(candidate)) on conflict (user_id) do nothing;
    select nickname into result from public.community_nicknames where user_id=u;
    if not public.community_nickname_valid_for_user(u,result) then return null; end if;
  end if;
  return result;
end $$;

create or replace function public.community_nickname_set(p_nickname text) returns text
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); clean text := trim(p_nickname);
begin
  if u is null then raise exception 'Sign in to change your nickname.'; end if;
  if not public.community_nickname_valid_for_user(u,clean) then
    raise exception 'Choose a nickname of 2–24 characters without links, contact details, reserved names or harmful language.';
  end if;
  insert into public.community_nicknames(user_id,nickname) values(u,clean)
    on conflict (user_id) do update set nickname=excluded.nickname;
  return clean;
end $$;
revoke all on function public.community_nickname_get(), public.community_nickname_set(text) from public, anon;
grant execute on function public.community_nickname_get(), public.community_nickname_set(text) to authenticated;

create or replace function public.live_nickname_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.community_nickname_valid_for_user(new.user_id,new.nickname) then
    raise exception 'Choose a different nickname; some names and role titles are restricted.';
  end if;
  return new;
end $$;
revoke all on function public.live_nickname_guard() from public, anon, authenticated;

create or replace function public.community_chat_list() returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to use chat.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'name',case when public.community_nickname_valid_for_user(m.user_id,m.nickname) then m.nickname else 'Member' end,'text',m.body,'mine',m.user_id=auth.uid(),'isOwner',public.chat_is_owner(m.user_id),'createdAt',m.created_at) order by m.created_at,m.id),'[]'::jsonb) into result
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
  from (select c.id,c.player_id,c.body,c.created_at,p.user_id,case when public.community_nickname_valid_for_user(p.user_id,p.nickname) then p.nickname else 'Player' end as nickname from public.live_chat_messages c join public.live_players p on p.id=c.player_id where c.room_id=r.id and public.chat_text_allowed(c.body) order by c.created_at desc,c.id desc limit 60) m;
  return jsonb_build_object('enabled',r.chat_enabled,'messages',messages);
end $$;

-- Explicitly set the confirmed owner's account nickname, without touching any
-- other account or rewriting existing message snapshots.
do $$
begin
  if (select count(*) from auth.users where public.chat_is_owner(id)) <> 1 then
    raise exception 'Expected exactly one confirmed owner account; no nickname was changed.';
  end if;
  insert into public.community_nicknames(user_id,nickname)
    select id,'Shay' from auth.users where public.chat_is_owner(id)
    on conflict (user_id) do update set nickname=excluded.nickname;
end $$;
