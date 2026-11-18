-- Only clinical RPCs may reserve capacity. Quota state is shared by all API instances.
create table clinic_private.clinical_usage (
  scope text not null,
  principal uuid not null,
  writing boolean not null,
  minute_start timestamptz not null,
  minute_used integer not null,
  burst_start timestamptz not null,
  burst_used integer not null,
  primary key (scope, principal, writing)
);
alter table clinic_private.clinical_usage enable row level security;
revoke all on clinic_private.clinical_usage from public, anon, authenticated, service_role;
create index clinical_usage_expiry on clinic_private.clinical_usage(minute_start);

create function clinic_private.quota_denied(seconds integer) returns void
language plpgsql set search_path = '' as $$
begin
  raise sqlstate 'PGRST' using message = '{"code":"clinical_quota","message":"Quota exceeded","details":null,"hint":null}',
    detail = json_build_object('status',429,'headers',json_build_object('Retry-After',greatest(seconds,1)::text))::text;
end $$;

create function clinic_private.reserve_slot(kind text, principal uuid, capacity integer) returns void
language plpgsql set search_path = '' as $$
declare slot integer;
begin
  for slot in 1..capacity loop
    if pg_try_advisory_xact_lock(hashtextextended(kind || principal::text || '/' || slot, 0)) then return; end if;
  end loop;
  perform clinic_private.quota_denied(1);
end $$;

create function clinic_private.reserve_clinical(target uuid, writing boolean, units integer) returns void
language plpgsql set search_path = '' as $$
declare
  actor uuid := clinic_private.actor();
  device uuid := ((select auth.jwt())->>'session_id')::uuid;
  instant timestamptz := clock_timestamp();
  minute_window timestamptz := date_trunc('minute', instant);
  burst_window timestamptz := date_bin('10 seconds', instant, '2000-01-01'::timestamptz);
  bucket record;
  usage clinic_private.clinical_usage;
begin
  if actor is null or device is null or not clinic_private.is_member(target) then
    raise insufficient_privilege using message='Access denied';
  end if;
  if units is null or units not between 1 and 50 or writing is null then
    raise invalid_parameter_value using message='Invalid batch size';
  end if;
  perform clinic_private.reserve_slot('user',actor,2);
  perform clinic_private.reserve_slot('clinic',target,10);
  for bucket in select * from (values
    ('user',actor,case when writing then 120 else 240 end),
    ('device',device,case when writing then 60 else 120 end),
    ('clinic',target,case when writing then 600 else 1200 end)
  ) as limits(kind,id,cap) loop
    insert into clinic_private.clinical_usage as current_usage
      values(bucket.kind,bucket.id,writing,minute_window,units,burst_window,units)
    on conflict on constraint clinical_usage_pkey do update set
      minute_start=excluded.minute_start,
      minute_used=case when current_usage.minute_start=excluded.minute_start then current_usage.minute_used else 0 end + units,
      burst_start=excluded.burst_start,
      burst_used=case when current_usage.burst_start=excluded.burst_start then current_usage.burst_used else 0 end + units
    returning * into usage;
    if usage.minute_used>bucket.cap then
      perform clinic_private.quota_denied(ceil(extract(epoch from minute_window + interval '1 minute' - instant))::integer);
    end if;
    if bucket.kind='device' and usage.burst_used>(case when writing then 50 else 60 end) then
      perform clinic_private.quota_denied(ceil(extract(epoch from burst_window + interval '10 seconds' - instant))::integer);
    end if;
  end loop;
  delete from clinic_private.clinical_usage where ctid in (
    select ctid from clinic_private.clinical_usage where minute_start < instant - interval '1 day'
      order by minute_start limit 6 for update skip locked
  );
end $$;
revoke all on function clinic_private.quota_denied(integer), clinic_private.reserve_slot(text,uuid,integer),
  clinic_private.reserve_clinical(uuid,boolean,integer) from public, anon, authenticated, service_role;
