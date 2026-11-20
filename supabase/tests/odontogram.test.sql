begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
create temp table drawing_people(n int,id uuid,email text);
insert into drawing_people select n,gen_random_uuid(),'drawing'||n||'@example.test' from generate_series(1,3)n;
insert into auth.users(id,email,email_confirmed_at) select id,email,now() from drawing_people;
insert into auth.identities(id,provider_id,user_id,provider,identity_data)
 select gen_random_uuid(),id::text,id,'google',jsonb_build_object('email',email,'email_verified',true) from drawing_people;
insert into auth.sessions(id,user_id) select id,id from drawing_people;
create temp table drawing_fixture as select gen_random_uuid() a,gen_random_uuid() b,
 jsonb_build_object('id',gen_random_uuid(),'nombre','Sintético','telefono','000') doc,
 jsonb_build_object('template','odontograma-v1','strokes',jsonb_build_array(
   jsonb_build_object('id',gen_random_uuid(),'color','#dc2626','width',2,'points','[[20,30],[100,80]]'::jsonb))) drawing;
insert into public.clinics(id,name,owner_id) select a,'Drawing A',id from drawing_fixture,drawing_people where n=1
 union all select b,'Drawing B',id from drawing_fixture,drawing_people where n=3;
insert into public.clinic_access(clinic_id,user_id,email) select case when n=3 then b else a end,id,email from drawing_fixture,drawing_people;
grant select on drawing_fixture,drawing_people to authenticated;
create function pg_temp.drawing_actor(who int) returns void language sql as $$
 select set_config('request.jwt.claims',jsonb_build_object('sub',id,'session_id',id,'amr','[{"method":"oauth"}]'::jsonb)::text,true) from drawing_people where n=who;
$$;
create function pg_temp.save_drawing(op text,rev int default null,extra jsonb default '{}') returns jsonb language sql as $$
 select public.dental_operation(a,op,jsonb_build_object('version',1,'revision',rev,'expedientes',jsonb_build_array(doc),'drawing',drawing)||extra) from drawing_fixture;
$$;
select ok(clinic_private.valid_odontogram(drawing),'valid drawing') from drawing_fixture;
select ok(not clinic_private.valid_odontogram('{"template":"odontograma-v1","strokes":null}'),'reject malformed list');
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes,0,points}','[[0,512]]')),'coordinates bounded to template') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes,0,points}','[[-1,0]]')),'negative coordinates rejected') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{template}','"different"')),'template version validated') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes,0,color}','"url(x)"')),'unsafe colors rejected') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes,0,width}','20')),'width bounded') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes}',(select jsonb_agg((drawing->'strokes'->0)||jsonb_build_object('id',md5(i::text)::uuid)) from generate_series(1,501) i))),'stroke limit') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes,0,points}',(select jsonb_agg('[1,1]'::jsonb) from generate_series(1,10001)))),'point limit') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes,0,points}','[["oops",1]]')),'point types validated') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes,0,id}',to_jsonb(repeat('a',262144)))),'payload size bounded') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(drawing||'{"svg":"<script/>"}'),'unknown properties rejected') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes}',(drawing->'strokes')||(drawing->'strokes'))),'duplicate stroke identifiers rejected') from drawing_fixture;
select ok(not clinic_private.valid_odontogram(jsonb_set(drawing,'{strokes}',(select jsonb_agg(jsonb_build_object('id',md5(i::text)::uuid,'color','#dc2626','width',2,'points',
 (select jsonb_agg('[1,1]'::jsonb) from generate_series(1,6000)))) from generate_series(1,2)i))),'point limit accumulates all strokes') from drawing_fixture;
set local role authenticated;
select pg_temp.drawing_actor(1);
select is(pg_temp.save_drawing('import')->>'added','1','document and drawing created together');
select is((select public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id'),'includeDrawing',true))->0->'drawing' from drawing_fixture),
 (select drawing from drawing_fixture),'read restores vectors');
select ok((select not (public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id')))->0 ? 'drawing') from drawing_fixture),'regular JSON reads exclude annotations');
select is((select public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id')))->0->'document' from drawing_fixture),
 (select doc from drawing_fixture),'document stays unchanged');
select is(pg_temp.save_drawing('update',1,'{"drawing":{"template":"odontograma-v1","strokes":[]}}')->>'added','0','drawing can be cleared');
select is(pg_temp.save_drawing('update',1)->>'code','PT409','stale document revision rejects drawing overwrite');
select is((select jsonb_array_length(public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id'),'includeDrawing',true))->0->'drawing'->'strokes') from drawing_fixture),0,'stale drawing did not overwrite');
select pg_temp.drawing_actor(2);
select is(pg_temp.save_drawing('update',2)->>'added','0','member can edit drawing');
select is((select public.dental_operation(a,'update',jsonb_build_object('version',1,'revision',3,'expedientes',jsonb_build_array(doc)))->>'added' from drawing_fixture),'0','older client saves document alone');
select is((select public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id'),'includeDrawing',true))->0->'drawing' from drawing_fixture),
 (select drawing from drawing_fixture),'older client preserves vectors');
select is(pg_temp.save_drawing('update',4,'{"drawing":{"template":"wrong","strokes":[]}}')->>'code','22023','invalid drawing returns controlled error');
select is((select public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id')))->0->>'revision' from drawing_fixture),'4','invalid drawing leaves document revision untouched');
select throws_ok('select * from clinic_private.odontogram_drawings','42501',null,'direct table access denied');
select throws_ok($$select public.dental_operation(b,'read','{"ids":[]}') from drawing_fixture$$,'42501','Access denied','cross clinic denied');
select pg_temp.drawing_actor(3);
select throws_ok($$select public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id'),'includeDrawing',true)) from drawing_fixture$$,'42501','Access denied','outsider cannot read annotations');
reset role;
select is((select minute_used from clinic_private.clinical_usage where scope='user' and writing and principal=(select id from drawing_people where n=2)),3,'drawing saves and rejected payload consume existing clinical quotas');
delete from public.clinic_access where user_id=(select id from drawing_people where n=2);
set local role authenticated;
select pg_temp.drawing_actor(2);
select throws_ok($$select pg_temp.save_drawing('update',4)$$,'42501','Access denied','revocation affects drawing saves');
reset role;
select ok((select relrowsecurity from pg_class where oid='clinic_private.odontogram_drawings'::regclass),'RLS enabled');
select ok(not has_function_privilege('anon','public.dental_operation(uuid,text,jsonb)','execute'),'anonymous RPC blocked');
select ok(not has_function_privilege('authenticated','clinic_private.dental_without_drawing(uuid,text,jsonb)','execute'),'cannot bypass annotations wrapper');

create function pg_temp.reject_drawing() returns trigger language plpgsql as $$begin raise data_exception using message='Synthetic annotation failure'; end$$;
create trigger reject_drawing before update on clinic_private.odontogram_drawings for each row execute function pg_temp.reject_drawing();
set local role authenticated;
select pg_temp.drawing_actor(1);
select throws_ok($$select pg_temp.save_drawing('update',4)$$,'22000','Synthetic annotation failure','annotation failure rolls back the complete save');
select is((select public.dental_operation(a,'read',jsonb_build_object('ids',jsonb_build_array(doc->>'id')))->0->>'revision' from drawing_fixture),'4','annotation failure rolled back document revision');
select is(pg_temp.save_drawing('update',4,'{"expedientes":null}')->>'code','22023','malformed envelope is a controlled error');
select is(pg_temp.save_drawing('update',4,'{"drawing":null}')->>'code','22023','null drawing is a controlled error');
select is((select public.dental_operation(a,'read','{"ids":[],"includeDrawing":true}')->>'code' from drawing_fixture),'22023','empty selection preserves controlled error');
reset role;
delete from clinic_private.dental_records where clinic_id=(select a from drawing_fixture);
select is((select count(*) from clinic_private.odontogram_drawings where clinic_id=(select a from drawing_fixture)),0::bigint,'record deletion cascades vectors');
select * from finish();
rollback;
