begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temp table quota_subject as select gen_random_uuid() actor, gen_random_uuid() device, gen_random_uuid() clinic;
insert into auth.users(id,email,email_confirmed_at) select actor,'quota@example.test',now() from quota_subject;
insert into auth.identities(id,provider_id,user_id,provider,identity_data)
  select gen_random_uuid(),actor::text,actor,'google','{"email":"quota@example.test","email_verified":true}' from quota_subject;
insert into auth.sessions(id,user_id) select device,actor from quota_subject;
insert into public.clinics(id,name,owner_id) select clinic,'Synthetic',actor from quota_subject;
insert into public.clinic_access(clinic_id,user_id,email) select clinic,actor,'quota@example.test' from quota_subject;
do $$ begin perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'session_id',device,'amr','[{"method":"oauth"}]'::jsonb)::text,true) from quota_subject; end $$;
create function pg_temp.reserve(n int) returns void language sql as $$
  select clinic_private.reserve_clinical(clinic,true,n) from quota_subject;
$$;
select lives_ok('select pg_temp.reserve(50)','one batch consumes fifty writes');
select is((select minute_used from clinic_private.clinical_usage where principal=(select actor from quota_subject)),50,'aggregate counts individual records');
select throws_ok('select pg_temp.reserve(1)','PGRST',null,'burst rejected');
update clinic_private.clinical_usage set burst_start=now()-interval '1 hour' where principal=(select device from quota_subject);
select lives_ok('select pg_temp.reserve(10)','new burst');
select throws_ok('select pg_temp.reserve(1)','PGRST',null,'device minute limit');
insert into auth.sessions(id,user_id) select actor,actor from quota_subject;
do $$ begin perform set_config('request.jwt.claims',(current_setting('request.jwt.claims')::jsonb || jsonb_build_object('session_id',actor))::text,true) from quota_subject; end $$;
select lives_ok('select pg_temp.reserve(50)','rotated session still binds principal');
update clinic_private.clinical_usage set minute_used=120 where scope='user' and principal=(select actor from quota_subject);
select throws_ok('select pg_temp.reserve(1)','PGRST',null,'shared user cap');
update clinic_private.clinical_usage set minute_start=now()-interval '1 hour',burst_start=now()-interval '1 hour' where principal in (select actor from quota_subject union select clinic from quota_subject);
select lives_ok('select pg_temp.reserve(1)','windows expire');
update clinic_private.clinical_usage set minute_used=600 where scope='clinic' and principal=(select clinic from quota_subject);
select throws_ok('select pg_temp.reserve(1)','PGRST',null,'shared clinic cap');
select throws_ok('select pg_temp.reserve(51)','22023',null,'oversized batch');
select throws_ok('select clinic_private.reserve_clinical(gen_random_uuid(),false,1)','42501',null,'membership required');
select ok(not has_function_privilege('authenticated','clinic_private.reserve_clinical(uuid,boolean,integer)','EXECUTE'),'cannot reserve or manipulate counters directly');
do $$ declare info text; begin
  begin perform pg_temp.reserve(1); exception when sqlstate 'PGRST' then
    get stacked diagnostics info = pg_exception_detail;
    perform set_config('test.quota_response',info,true);
  end;
end $$;
select is((current_setting('test.quota_response')::jsonb->>'status')::int,429,'HTTP status');
select ok((current_setting('test.quota_response')::jsonb->'headers'->>'Retry-After')::int between 1 and 60,'retry time supplied');
alter table clinic_private.clinical_usage rename to offline_usage;
select throws_ok('select pg_temp.reserve(1)','42P01',null,'counter unavailable fails closed');
select * from finish();
rollback;
