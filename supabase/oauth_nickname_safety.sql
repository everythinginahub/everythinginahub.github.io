-- Do not treat a social provider's nickname claim as an explicitly chosen chat name.
-- Existing saved nicknames are retained. Email-only users can still import their
-- signup nickname; users with social identities choose a chat name in Settings.
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
  if not exists (select 1 from auth.identities where user_id=u and provider='email')
     or exists (select 1 from auth.identities where user_id=u and provider<>'email') then
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
revoke all on function public.community_nickname_get() from public, anon;
grant execute on function public.community_nickname_get() to authenticated;
