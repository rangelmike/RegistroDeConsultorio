create or replace function clinic_private.valid_odontogram(drawing jsonb) returns boolean
language plpgsql immutable strict set search_path='' as $$
begin
  if octet_length(drawing::text)>262144 or not extensions.jsonb_matches_schema(
    '{"type":"object","required":["template","strokes"],"additionalProperties":false,"properties":{
      "template":{"const":"odontograma-v1"},
      "strokes":{"type":"array","maxItems":500,"items":{"type":"object","required":["id","color","width","points"],"additionalProperties":false,"properties":{
        "id":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},
        "color":{"enum":["#dc2626","#2563eb","#111827","#75449b"]},
        "width":{"type":"number","minimum":0.5,"maximum":12},
        "points":{"type":"array","minItems":1,"maxItems":10000,"items":{"type":"array","minItems":2,"maxItems":2,"items":{"type":"number","minimum":0,"maximum":643}}}
      }}}
    }}'::json,drawing) then return false; end if;
  return (select coalesce(sum(jsonb_array_length(s->'points')),0)<=10000
      from jsonb_array_elements(drawing->'strokes') s)
    and not exists(select 1 from jsonb_array_elements(drawing->'strokes') s,
      lateral jsonb_array_elements(s->'points') p where (p->>1)::numeric>511)
    and (select count(*)=count(distinct s->>'id') from jsonb_array_elements(drawing->'strokes') s);
end
$$;

create table clinic_private.odontogram_drawings (
  clinic_id uuid not null,
  record_id uuid not null,
  drawing jsonb not null check (clinic_private.valid_odontogram(drawing)),
  primary key (clinic_id,record_id),
  foreign key (clinic_id,record_id) references clinic_private.dental_records(clinic_id,id) on delete cascade
);
alter table clinic_private.odontogram_drawings enable row level security;
revoke all on clinic_private.odontogram_drawings from public,anon,authenticated,service_role;

alter function clinic_private.dental_operation(uuid,text,jsonb) rename to dental_without_drawing;
revoke all on function clinic_private.dental_without_drawing(uuid,text,jsonb) from public,anon,authenticated,service_role;

create function clinic_private.dental_operation(target uuid,action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; record_id uuid; items jsonb; units integer:=1;
begin
  if clinic_private.actor() is null or not clinic_private.is_member(target) then
    raise insufficient_privilege using message='Access denied';
  end if;
  if payload ? 'drawing' then
    if action not in ('import','update') or (case when jsonb_typeof(payload->'expedientes')='array'
      then jsonb_array_length(payload->'expedientes')<>1 else true end)
      or not coalesce(clinic_private.valid_odontogram(payload->'drawing'),false) then
      items:=case when action in ('read','delete') then payload->'ids' else payload->'expedientes' end;
      if jsonb_typeof(items)='array' then units:=greatest(1,least(50,jsonb_array_length(items))); end if;
      perform clinic_private.reserve_clinical(target,coalesce(action in ('import','update','delete'),false),units);
      perform set_config('response.status','400',true);
      return jsonb_build_object('code','22023','message','Invalid drawing');
    end if;
  end if;
  result:=clinic_private.dental_without_drawing(target,action,payload);
  -- The existing quota wrapper returns structured errors. Never write annotations
  -- when its document operation was rejected.
  if result ? 'code' then return result; end if;
  if payload ? 'drawing' then
    record_id:=(payload->'expedientes'->0->>'id')::uuid;
    if action='import' and (result->>'added')::integer<>1 then
      perform set_config('response.status','409',true);
      return jsonb_build_object('code','PT409','message','Record changed');
    end if;
    insert into clinic_private.odontogram_drawings(clinic_id,record_id,drawing)
      values(target,record_id,payload->'drawing')
      on conflict on constraint odontogram_drawings_pkey do update set drawing=excluded.drawing;
  end if;
  if action='read' and payload->'includeDrawing'='true'::jsonb then
    select coalesce(jsonb_agg(entry || jsonb_build_object('drawing',coalesce(d.drawing,
      '{"template":"odontograma-v1","strokes":[]}'::jsonb)) order by entry->'document'->>'id'),'[]'::jsonb)
      into result from jsonb_array_elements(result) entry
      left join clinic_private.odontogram_drawings d on d.clinic_id=target
        and d.record_id=(entry->'document'->>'id')::uuid;
  end if;
  return result;
end $$;
revoke all on function clinic_private.valid_odontogram(jsonb),clinic_private.dental_operation(uuid,text,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function clinic_private.dental_operation(uuid,text,jsonb) to authenticated;
create or replace function public.dental_operation(target uuid,action text,payload jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select clinic_private.dental_operation(target,action,payload);
$$;
