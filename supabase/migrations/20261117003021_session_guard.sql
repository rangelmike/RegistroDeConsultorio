create or replace function clinic_private.actor() returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())
    and (select auth.jwt())->'amr' @> '[{"method":"oauth"}]'::jsonb
    and exists (select 1 from auth.sessions s where s.user_id=u.id
      and s.id::text = (select auth.jwt())->>'session_id'
      and (s.not_after is null or s.not_after > now()))
    and exists (select 1 from auth.identities i where i.user_id = u.id
      and i.provider = 'google' and i.identity_data->>'email_verified' = 'true'
      and lower(i.identity_data->>'email') = lower(u.email));
$$;

-- Explicit ACLs make this migration independent of a project's auto-exposure defaults.
revoke all on schema clinic_private from public, anon, service_role;
grant usage on schema clinic_private to authenticated;
revoke all on public.clinics, public.clinic_access from public, anon, authenticated, service_role;
grant select on public.clinics, public.clinic_access to authenticated;
revoke all on clinic_private.audit_events from public, anon, authenticated, service_role;
revoke all on all functions in schema clinic_private from public, anon, authenticated, service_role;
grant execute on function clinic_private.actor(), clinic_private.is_member(uuid), clinic_private.claim_invitations(),
  clinic_private.manage_clinic(text,uuid,text,text[],uuid) to authenticated;
revoke all on function public.manage_clinic(text,uuid,text,text[],uuid), public.claim_clinic_invitations() from public, anon, authenticated, service_role;
grant execute on function public.manage_clinic(text,uuid,text,text[],uuid), public.claim_clinic_invitations() to authenticated;
