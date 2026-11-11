-- Run only after the updated username-auth Edge Function is deployed and
-- confirmed to call account_auth_reserve(text,text).
drop function if exists public.account_auth_reserve(text);
