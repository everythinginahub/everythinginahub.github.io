-- Give the verified site owner a read-only path to review private feedback.
-- The feedback tables themselves remain inaccessible to browser roles.
create or replace function public.site_feedback_admin_list(p_limit integer default 100)
returns table (
  id uuid,
  created_at timestamptz,
  category text,
  message text,
  page text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 100);
begin
  if v_user is null or not public.chat_is_owner(v_user) then
    raise exception using errcode = '42501', message = 'not_authorized';
  end if;

  return query
    select feedback.id, feedback.created_at, feedback.category, feedback.message, feedback.page
      from public.site_feedback as feedback
      order by feedback.created_at desc, feedback.id desc
      limit v_limit;
end;
$$;

revoke all on function public.site_feedback_admin_list(integer) from public, anon, authenticated, service_role;
grant execute on function public.site_feedback_admin_list(integer) to authenticated;
