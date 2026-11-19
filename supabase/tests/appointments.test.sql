begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temp table people as select n, gen_random_uuid() id,'agenda'||n||'@example.test' email from generate_series(1,3)n;
insert into auth.users(id,email,email_confirmed_at) select id,email,now() from people;
insert into auth.identities(id,provider_id,user_id,provider,identity_data)
  select gen_random_uuid(),id::text,id,'google',jsonb_build_object('email',email,'email_verified',true) from people;
insert into auth.sessions(id,user_id) select id,id from people;
create temp table fixture as select gen_random_uuid() a,gen_random_uuid() b;
insert into public.clinics(id,name,owner_id) select case when n=1 then a else b end,'Agenda sintética',id from people,fixture where n in (1,3);
insert into public.clinic_access(clinic_id,user_id,email) select case when n=3 then b else a end,id,email from fixture,people;
grant select on fixture,people to authenticated;
create function pg_temp.actor(nr int) returns void language sql as $$
  select set_config('request.jwt.claims',jsonb_build_object('sub',id,'session_id',id,'amr','[{"method":"oauth"}]'::jsonb)::text,true) from people where n=nr;
$$;
create function pg_temp.op(action text,req jsonb) returns jsonb language sql as $$
  select public.appointment_operation(a,action,req) from fixture;
$$;
set local role authenticated;
select pg_temp.actor(1);
create temp table booked as select pg_temp.op('create','{"slot":"2026-12-27T23:30","nombre":"Sintético","telefono":"000","motivo":"Revisión"}') result;
select ok((select result ? 'id' and result ? 'patientId' from booked),'appointment and minimal file created together');
select is(jsonb_array_length(pg_temp.op('week','{"week":"2026-12-21"}')),1,'last Sunday slot is in this week');
select is(jsonb_array_length(pg_temp.op('week','{"week":"2026-12-28"}')),0,'next Monday belongs to next week');
select ok(not (pg_temp.op('week','{"week":"2026-12-21"}')->0 ?| array['telefono','bookedBy','edited','patient']),'week contains summary fields only');
select is(pg_temp.op('create','{"slot":"2026-12-27T23:30","nombre":"Duplicado","telefono":"000","motivo":"Otro"}')->>'message',null,'same starting time allowed');
select is((select jsonb_array_length(public.dental_operation(a,'list','{}')) from fixture),2,'simultaneous booking creates its file');
select is(pg_temp.op('create','{"slot":"2026-12-27T23:10:01","nombre":"Otro","telefono":"000","motivo":"Otro"}')->>'message','Invalid appointment','rejects overlapping off-grid time');
select pg_temp.actor(2);
create temp table edit_request as select jsonb_build_object('id',result->'id','revision',1,'patientId',result->'patientId',
  'patientRevision',1,'slot','2026-12-28T00:00','motivo','Control','telefono','001') req from booked;
select is((select pg_temp.op('update',req||'{"edited":"fake","bookedBy":"fake"}')->>'message' from edit_request),'Invalid appointment','automatic fields protected');
select ok((select pg_temp.op('update',req) ? 'id' from edit_request),'member reschedules and updates contact');
select is((select pg_temp.op('update',req)->>'message' from edit_request),'Selection changed','revision protects stale edit');
create temp table details as select pg_temp.op('detail',result) d from booked;
select is((select d->>'bookedBy' from details),'agenda1','original booker retained after another member edits');
select is((select d->>'edited' from details),to_char(clock_timestamp() at time zone 'America/Mexico_City','DD/MM/YYYY · HH24"h"'),'Mexico City edit date and whole hour');
select is((select d#>>'{patient,telefono}' from details),'001','linked file phone updated');
select is(jsonb_array_length(pg_temp.op('week','{"week":"2026-12-28"}')),1,'midnight slot appears in new week');
select pg_temp.actor(3);
select throws_ok($$select pg_temp.op('week','{"week":"2026-12-28"}')$$,'42501','Access denied','outside member denied');
select is((select public.appointment_operation(b,'create',req)->>'message' from fixture,edit_request),'Selection changed','cannot link a patient from another clinic');
select throws_ok('select * from clinic_private.appointments','42501',null,'direct table read denied');
reset role;
select ok((select relrowsecurity from pg_class where oid='clinic_private.appointments'::regclass),'RLS enabled');
select ok(not has_function_privilege('anon','public.appointment_operation(uuid,text,jsonb)','execute'),'anon cannot call Agenda');
select ok(exists(select from clinic_private.audit_events,fixture where clinic_id=a and operation='appointment_update'),'edit audited');
insert into clinic_private.appointments(clinic_id,patient_id,starts_at,reason,booked_by)
  select a,(result->>'patientId')::uuid,timestamp '2027-01-04'+n*interval '30 minutes','Ejemplo','agenda1'
  from fixture,booked,generate_series(0,26) n;
set local role authenticated;
select pg_temp.actor(1);
create temp table first_page as select pg_temp.op('week','{"week":"2027-01-04"}') page;
select is((select jsonb_array_length(page) from first_page),25,'busy week bounded by page size');
select is((select jsonb_array_length(pg_temp.op('week',jsonb_build_object('week','2027-01-04','after',page->24->>'slot','afterId',page->24->>'id'))) from first_page),2,'remaining slots appear on following page');
reset role;
update clinic_private.clinical_usage set burst_start=date_bin('10 seconds',clock_timestamp(),timestamptz '2000-01-01'),
  burst_used=60, minute_start=date_trunc('minute',clock_timestamp()),minute_used=120
  where scope='device' and not writing and principal=(select id from people where n=1);
set local role authenticated;
select throws_ok($$select pg_temp.op('week','{"week":"2027-01-04"}')$$,'PGRST',null,'direct week RPC enforces device quota');
reset role;
delete from public.clinic_access where user_id=(select id from people where n=2);
set local role authenticated;
select pg_temp.actor(2);
select throws_ok($$select pg_temp.op('detail',result) from booked$$,'42501','Access denied','revoked member denied');
select * from finish();
rollback;
