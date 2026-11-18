create extension if not exists pg_jsonschema with schema extensions;
create function clinic_private.valid_dental_record(doc jsonb) returns boolean
language sql immutable strict set search_path = '' as $$
  select octet_length(doc::text)<=40000 and extensions.jsonb_matches_schema(
    $schema${"type":"object","properties":{"id":{"type":"string","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"},
      "nombre":{"type":"string","maxLength":160,"pattern":"\\S"},
      "telefono":{"type":"string","maxLength":120,"pattern":"\\S"},
    "campos":{"type":"object","properties":{"edad":{"type":"string","pattern":"^[0-9]{1,4}$"},
      "fecha":{"type":"string","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
      "direccion":{"type":"string","maxLength":4000},
      "sexo":{"enum":["Femenino","Masculino","Otro"]},
      "nacimiento":{"type":"string","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
      "email":{"type":"string","maxLength":4000},
      "tension":{"type":"string","maxLength":4000},
      "pulso":{"type":"string","maxLength":4000},
      "frecuenciaRespiratoria":{"type":"string","maxLength":4000},
      "motivo":{"type":"string","maxLength":4000},
      "enfermedad":{"type":"string","maxLength":4000},
      "tratamientoMedico":{"type":"string","maxLength":4000},
      "hospitalizacion":{"type":"string","maxLength":4000},
      "alergias":{"type":"string","maxLength":4000},
      "hemorragia":{"type":"string","maxLength":4000},
      "desmayos":{"type":"string","maxLength":4000},
      "embarazo":{"type":"string","maxLength":4000},
      "sustancias":{"type":"string","maxLength":4000},
      "problemasDentales":{"type":"string","maxLength":4000},
      "cardiacos":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "tuberculosis":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "anemia":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "ictericia":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "asma":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "presion":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "diabetes":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "hepatitis":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "epilepsia":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "fiebreReumatica":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "traumatismo":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "sida":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "cirugias":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "gastrointestinales":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "transfusiones":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "artritis":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "renal":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "cancer":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "nervioso":{"enum":["Personal","Familiar","Personal y familiar","Sin antecedente"]},
      "labios":{"enum":["Normal","Atípico"]},
      "lengua":{"enum":["Normal","Atípico"]},
      "paladarDuro":{"enum":["Normal","Atípico"]},
      "paladarBlando":{"enum":["Normal","Atípico"]},
      "carrillos":{"enum":["Normal","Atípico"]},
      "pisoBoca":{"enum":["Normal","Atípico"]},
      "vestibulo":{"enum":["Normal","Atípico"]},
      "glandulas":{"enum":["Normal","Atípico"]},
      "caries":{"type":"string","pattern":"^[0-9]{1,4}$"},
      "cariesDolor":{"type":"string","pattern":"^[0-9]{1,4}$"},
      "ausentes":{"type":"string","pattern":"^[0-9]{1,4}$"},
      "restauraciones":{"type":"string","maxLength":4000},
      "higiene":{"type":"string","maxLength":4000},
      "periodonto":{"type":"string","maxLength":4000},
      "oclusion":{"type":"string","maxLength":4000},
      "inflamacion":{"enum":["Sí","No"]},
      "sarroSupra":{"enum":["Sí","No"]},
      "sarroInfra":{"enum":["Sí","No"]},
      "migracion":{"enum":["Sí","No"]},
      "bolsas":{"enum":["Sí","No"]},
      "calidadHigiene":{"enum":["Buena","Regular","Mala"]},
      "radiografia":{"type":"string","maxLength":4000},
      "diagnostico":{"type":"string","maxLength":4000},
      "plan":{"type":"string","maxLength":4000},
      "notas":{"type":"string","maxLength":4000},
      "observaciones":{"type":"string","maxLength":4000},
      "firmaPaciente":{"type":"string","maxLength":4000},
      "firmaOdontologo":{"type":"string","maxLength":4000}},
      "additionalProperties":false},
      "odontograma":{"type":"object","patternProperties":{"^([1-4][1-8]|[5-8][1-5])$":{"type":"object","properties":{"hallazgo":{"type":"string","maxLength":4000},
      "vestibular":{"type":"string","maxLength":4000},
      "lingual":{"type":"string","maxLength":4000},
      "mesial":{"type":"string","maxLength":4000},
      "distal":{"type":"string","maxLength":4000},
      "oclusal":{"type":"string","maxLength":4000},
      "tratamiento":{"type":"string","maxLength":4000},
      "presupuesto":{"type":"string","pattern":"^[0-9]{1,12}(\\.[0-9]{1,2})?$"}},
      "additionalProperties":false}},
      "additionalProperties":false},
      "evolucion":{"type":"array","maxItems":300,"items":{"type":"object","properties":{"fecha":{"type":"string","pattern":"^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
      "tratamiento":{"type":"string","maxLength":4000},
      "total":{"type":"string","pattern":"^[0-9]{1,12}(\\.[0-9]{1,2})?$"},
      "anticipo":{"type":"string","pattern":"^[0-9]{1,12}(\\.[0-9]{1,2})?$"},
      "resta":{"type":"string","pattern":"^[0-9]{1,12}(\\.[0-9]{1,2})?$"},
      "firma":{"type":"string","maxLength":4000}},
      "additionalProperties":false}}},
      "additionalProperties":false,"required":["id","nombre","telefono"]}$schema$::json, doc);
$$;

create table clinic_private.dental_records (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  document jsonb not null check (clinic_private.valid_dental_record(document)),
  id uuid generated always as ((document->>'id')::uuid) stored,
  revision integer not null default 1,
  primary key (clinic_id,id)
);
alter table clinic_private.dental_records enable row level security;
revoke all on clinic_private.dental_records from public, anon, authenticated, service_role;
create extension if not exists pg_trgm with schema extensions;
create index dental_records_name on clinic_private.dental_records using gin (lower(document->>'nombre') extensions.gin_trgm_ops);

-- The table is outside the Data API. Every operation, including direct RPC calls,
-- checks current membership and reserves shared capacity before reading clinical data.
create function clinic_private.dental_operation(target uuid, action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := clinic_private.actor();
  ids uuid[];
  batch jsonb;
  doc jsonb;
  found_doc jsonb;
  output jsonb;
  units integer;
  pos integer:=0;
  added integer:=0;
  duplicates integer:=0;
  needle text;
  after_id uuid;
  changed integer;
begin
  if actor is null or not clinic_private.is_member(target) then
    raise insufficient_privilege using message='Access denied';
  end if;
  if action is null or action not in ('list','read','preview','import','update','delete')
    or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>2097152 then
    raise invalid_parameter_value using message='Invalid request';
  end if;
  if action='list' then
    needle:=coalesce(payload->>'name','');
    if length(needle)>160 then raise invalid_parameter_value using message='Invalid search'; end if;
    after_id:=(payload->>'after')::uuid;
    perform clinic_private.reserve_clinical(target,false,1);
    select coalesce(jsonb_agg(row_data order by q.id),'[]') into output from (
      select r.id,jsonb_build_object('id',r.id,'nombre',r.document->>'nombre',
        'telefono',r.document->>'telefono','revision',r.revision) row_data
      from clinic_private.dental_records r where r.clinic_id=target and (after_id is null or r.id>after_id)
        and lower(r.document->>'nombre') like '%' || replace(replace(replace(lower(needle),'\','\\'),'%','\%'),'_','\_') || '%'
      order by r.id limit 10
    ) q;
    if jsonb_array_length(output)>1 then perform clinic_private.reserve_clinical(target,false,jsonb_array_length(output)-1); end if;
  elsif action in ('read','delete') then
    if jsonb_typeof(payload->'ids') is distinct from 'array' then raise invalid_parameter_value using message='Invalid selection'; end if;
    units:=jsonb_array_length(payload->'ids');
    perform clinic_private.reserve_clinical(target,action='delete',units);
    select array_agg(distinct i::uuid) into ids from jsonb_array_elements_text(payload->'ids') i;
    if cardinality(ids)<>units then raise invalid_parameter_value using message='Invalid selection'; end if;
    if action='read' then
      select jsonb_agg(jsonb_build_object('document',document,'revision',revision) order by id) into output
        from clinic_private.dental_records where clinic_id=target and id=any(ids);
      changed:=coalesce(jsonb_array_length(output),0);
    else
      delete from clinic_private.dental_records where clinic_id=target and id=any(ids);
      get diagnostics changed=row_count;
      output:=jsonb_build_object('deleted',changed);
    end if;
    if changed<>units then raise sqlstate 'PT409' using message='Selection changed'; end if;
  else
    batch:=payload->'expedientes';
    if jsonb_typeof(batch) is distinct from 'array' or payload->'version' is distinct from '1'::jsonb then
      raise invalid_parameter_value using message='Invalid file version';
    end if;
    units:=jsonb_array_length(batch);
    perform clinic_private.reserve_clinical(target,action<>'preview',units);
    if action='update' and units<>1 then raise invalid_parameter_value using message='Invalid edit'; end if;
    for doc in select value from jsonb_array_elements(batch) loop
      pos:=pos+1;
      if not clinic_private.valid_dental_record(doc) then
        raise invalid_parameter_value using message='Invalid record',detail=pos::text;
      end if;
      if (doc->>'id')::uuid=any(ids) then raise invalid_parameter_value using message='Repeated ID',detail=pos::text; end if;
      ids:=array_append(ids,(doc->>'id')::uuid);
    end loop;
    pos:=0;
    for doc in select value from jsonb_array_elements(batch) order by value->>'id' loop
      if action='update' then
        update clinic_private.dental_records set document=doc,revision=revision+1
          where clinic_id=target and id=(doc->>'id')::uuid and revision=(payload->>'revision')::integer;
        if not found then raise sqlstate 'PT409' using message='Record changed'; end if;
      else
        if action='import' then
          insert into clinic_private.dental_records(clinic_id,document) values(target,doc) on conflict do nothing;
          if found then added:=added+1; continue; end if;
        end if;
        select document into found_doc from clinic_private.dental_records where clinic_id=target and id=(doc->>'id')::uuid for share;
        if found_doc is null and action='preview' then added:=added+1;
        elsif found_doc=doc then duplicates:=duplicates+1;
        else raise sqlstate 'PT409' using message='Duplicate differs',detail=array_position(ids,(doc->>'id')::uuid)::text;
        end if;
      end if;
    end loop;
    output:=jsonb_build_object('added',added,'duplicates',duplicates);
  end if;
  insert into clinic_private.audit_events(actor_id,clinic_id,operation,entity_id)
    select actor,target,'record_'||action,entity from unnest(coalesce(ids,array[target])) entity;
  return output;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise invalid_parameter_value using message='Invalid value';
end $$;

create function public.dental_operation(target uuid, action text, payload jsonb)
returns jsonb language sql set search_path='' as $$
  select clinic_private.dental_operation(target,action,payload);
$$;
revoke all on function clinic_private.valid_dental_record(jsonb), clinic_private.dental_operation(uuid,text,jsonb),
  public.dental_operation(uuid,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function clinic_private.dental_operation(uuid,text,jsonb), public.dental_operation(uuid,text,jsonb) to authenticated;
