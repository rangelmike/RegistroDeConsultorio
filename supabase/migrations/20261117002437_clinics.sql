SET local check_function_bodies = off;

CREATE SCHEMA "clinic_private";

CREATE TABLE "clinic_private"."audit_events" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "actor_id"   uuid                     NOT NULL,
  "clinic_id"  uuid                     NOT NULL,
  "operation"  text                     NOT NULL,
  "entity_id"  uuid,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "audit_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "clinic_private"."audit_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."clinic_access" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "clinic_id"  uuid                     NOT NULL,
  "user_id"    uuid,
  "email"      text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "clinic_access_clinic_id_email_key" UNIQUE (clinic_id, email),
  CONSTRAINT "clinic_access_clinic_id_user_id_key" UNIQUE (clinic_id, user_id),
  CONSTRAINT "clinic_access_email_check"
    CHECK (((email = lower(btrim(email))) AND (char_length(email) <= 254) AND (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text))),
  CONSTRAINT "clinic_access_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."clinic_access"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."clinics" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "owner_id"   uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "clinics_name_check" CHECK (((char_length(btrim(name)) >= 1) AND (char_length(btrim(name)) <= 100))),
  CONSTRAINT "clinics_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."clinics"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION clinic_private.actor()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select u.id from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until < now())
    and exists (select 1 from auth.identities i where i.user_id = u.id
      and i.provider = 'google' and i.identity_data->>'email_verified' = 'true'
      and lower(i.identity_data->>'email') = lower(u.email));
$function$;

CREATE OR REPLACE FUNCTION clinic_private.claim_invitations()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare actor_id uuid := clinic_private.actor(); verified_email text; item record; changed integer := 0; n integer;
begin
  if actor_id is null then raise exception 'Google verified identity required' using errcode = '42501'; end if;
  select lower(u.email) into verified_email from auth.users u where u.id = actor_id;
  -- Match only the authenticated account's verified email, never a client-supplied email.
  for item in select c.id from public.clinics c where exists (
    select 1 from public.clinic_access a where a.clinic_id=c.id and a.user_id is null and a.email=verified_email
  ) order by c.id for update of c loop
    -- An account may already belong under an earlier email. Remove only the redundant pending invitation.
    if exists(select 1 from public.clinic_access a where a.clinic_id=item.id and a.user_id=actor_id) then
      delete from public.clinic_access where clinic_id=item.id and email=verified_email and user_id is null;
    else
      update public.clinic_access set user_id=actor_id
        where clinic_id=item.id and email=verified_email and user_id is null;
      get diagnostics n = row_count;
      changed := changed + n;
      if n > 0 then insert into clinic_private.audit_events(actor_id,clinic_id,operation,entity_id)
        values(actor_id,item.id,'accept_invitation',actor_id); end if;
    end if;
  end loop;
  return changed;
end;
$function$;

CREATE OR REPLACE FUNCTION clinic_private.is_member (
  target_clinic uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (select 1 from public.clinic_access a
    where a.clinic_id = target_clinic and a.user_id = (select clinic_private.actor()));
$function$;

CREATE OR REPLACE FUNCTION clinic_private.manage_clinic (
  action        text,
  target_clinic uuid   DEFAULT NULL::uuid,
  clinic_name   text   DEFAULT NULL::text,
  member_emails text[] DEFAULT '{}'::text[],
  target_access uuid   DEFAULT NULL::uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare actor_id uuid := clinic_private.actor(); owner uuid; actor_email text; address text; member_user uuid;
  result_id uuid := target_clinic; existing_user uuid; access_id uuid;
begin
  if actor_id is null then raise exception 'Google verified identity required' using errcode='42501'; end if;
  if action is null or action not in ('create','rename','add','remove','delete') then
    raise exception 'Invalid action' using errcode='22023'; end if;
  if action in ('create','rename') and (clinic_name is null or char_length(btrim(clinic_name)) not between 1 and 100) then
    raise exception 'Invalid name' using errcode='22023'; end if;
  if member_emails is null or cardinality(member_emails)>50 then raise exception 'Invalid email list' using errcode='22023'; end if;
  if action='create' then
    -- Serialize creation per owner; bound list sizes and storage abuse independently of the UI.
    perform 1 from auth.users where id=actor_id for update;
    if (select count(*) from public.clinics where owner_id=actor_id)>=20 then
      raise exception 'Clinic limit reached' using errcode='22023'; end if;
    select lower(email) into actor_email from auth.users where id=actor_id;
    insert into public.clinics(name,owner_id) values(btrim(clinic_name),actor_id) returning id into result_id;
    insert into public.clinic_access(clinic_id,user_id,email) values(result_id,actor_id,actor_email);
  else
    -- All membership mutations lock the parent first. Recheck authority inside this transaction.
    select owner_id into owner from public.clinics where id=target_clinic for update;
    if owner is distinct from actor_id then raise exception 'Not authorized' using errcode='42501'; end if;
  end if;
  if action='rename' then update public.clinics set name=btrim(clinic_name) where id=result_id; end if;
  if action in ('create','add') then
    for address in select distinct lower(btrim(e)) from unnest(member_emails) e loop
      if address is null or char_length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        raise exception 'Invalid email' using errcode='22023'; end if;
      member_user := null;
      select u.id into member_user from auth.users u where lower(u.email)=address
        and u.email_confirmed_at is not null and u.deleted_at is null
        and (u.banned_until is null or u.banned_until < now())
        and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'
          and i.identity_data->>'email_verified'='true' and lower(i.identity_data->>'email')=address);
      if exists(select 1 from public.clinic_access where clinic_id=result_id and
        (email=address or (member_user is not null and user_id=member_user))) then continue; end if;
      if (select count(*) from public.clinic_access where clinic_id=result_id)>=100 then
        raise exception 'Member limit reached' using errcode='22023'; end if;
      insert into public.clinic_access(clinic_id,user_id,email) values(result_id,member_user,address);
    end loop;
  end if;
  if action='remove' then
    select user_id,id into existing_user,access_id from public.clinic_access
      where id=target_access and clinic_id=result_id;
    if access_id is null or existing_user=actor_id then raise exception 'Cannot remove member' using errcode='22023'; end if;
    delete from public.clinic_access where id=target_access and clinic_id=result_id;
  end if;
  insert into clinic_private.audit_events(actor_id,clinic_id,operation,entity_id)
    values(actor_id,result_id,action,case when action='remove' then target_access else result_id end);
  if action='delete' then delete from public.clinics where id=result_id; end if;
  return result_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_clinic_invitations()
  RETURNS integer
  LANGUAGE sql
  SET search_path TO ''
  AS $function$ select clinic_private.claim_invitations(); $function$;

CREATE OR REPLACE FUNCTION public.manage_clinic (
  action        text,
  target_clinic uuid   DEFAULT NULL::uuid,
  clinic_name   text   DEFAULT NULL::text,
  member_emails text[] DEFAULT '{}'::text[],
  target_access uuid   DEFAULT NULL::uuid
)
  RETURNS uuid
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  select clinic_private.manage_clinic(action,target_clinic,clinic_name,member_emails,target_access);
$function$;

ALTER TABLE "public"."clinic_access"
  ADD CONSTRAINT "clinic_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."clinics"
  ADD CONSTRAINT "clinics_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."clinic_access"
  ADD CONSTRAINT "clinic_access_clinic_id_fkey" FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;

CREATE INDEX clinic_access_pending_email_idx ON public.clinic_access USING btree (email)
  WHERE (user_id IS NULL);

CREATE INDEX clinic_access_user_idx ON public.clinic_access USING btree (user_id, clinic_id);

CREATE INDEX clinics_owner_idx ON public.clinics USING btree (owner_id);

CREATE POLICY "clinic_access_read" ON "public"."clinic_access"
  FOR SELECT
  TO "authenticated"
  USING (clinic_private.is_member(clinic_id));

CREATE POLICY "clinics_read" ON "public"."clinics"
  FOR SELECT
  TO "authenticated"
  USING (clinic_private.is_member(id));

REVOKE ALL ON FUNCTION "clinic_private"."actor"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "clinic_private"."actor"() TO "authenticated", "postgres";

REVOKE ALL ON FUNCTION "clinic_private"."claim_invitations"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "clinic_private"."claim_invitations"() TO "authenticated", "postgres";

REVOKE ALL ON FUNCTION "clinic_private"."is_member"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "clinic_private"."is_member"(uuid) TO "authenticated", "postgres";

REVOKE ALL ON FUNCTION "clinic_private"."manage_clinic"(text, uuid, text, text[], uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "clinic_private"."manage_clinic"(text, uuid, text, text[], uuid) TO "authenticated", "postgres";

REVOKE ALL ON FUNCTION "public"."claim_clinic_invitations"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."claim_clinic_invitations"() TO "authenticated", "postgres";

REVOKE ALL ON FUNCTION "public"."manage_clinic"(text, uuid, text, text[], uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."manage_clinic"(text, uuid, text, text[], uuid) TO "authenticated", "postgres";

GRANT USAGE ON SCHEMA "clinic_private" TO "authenticated";

GRANT CREATE, USAGE ON SCHEMA "clinic_private" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "clinic_private"."audit_events" TO "postgres";

REVOKE ALL ON TABLE "public"."clinic_access" FROM "authenticated";

GRANT SELECT ON TABLE "public"."clinic_access" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clinic_access" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."clinic_access" TO "service_role";

REVOKE ALL ON TABLE "public"."clinics" FROM "authenticated";

GRANT SELECT ON TABLE "public"."clinics" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."clinics" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."clinics" TO "service_role";

