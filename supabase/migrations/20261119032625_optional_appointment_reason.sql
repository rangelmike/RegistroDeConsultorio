alter table clinic_private.appointments drop constraint appointments_reason_check;
alter table clinic_private.appointments alter column reason set default '';
alter table clinic_private.appointments add constraint appointments_reason_check check (length(reason)<=500);
create or replace function clinic_private.appointment_operation(target uuid, action text, payload jsonb)

returns jsonb language plpgsql security definer set search_path='' as $$

declare

  writing boolean := coalesce(action in ('create','update'),false);

  actor uuid := clinic_private.actor();

  slot timestamp;

  monday date;

  cursor_time timestamp;

  appt clinic_private.appointments;

  patient clinic_private.dental_records;

  patient_id_input uuid;

  phone text;

  name_input text;

  reason_input text;

  output jsonb;

  conflict text;

  quota_detail text;

begin

  -- This checks the active Google session and membership before any clinical work.

  perform clinic_private.reserve_clinical(target,writing,case when writing then 2 else 1 end);

  begin

    if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>8192 then

      raise invalid_parameter_value;

    end if;

    if action='week' then

      monday := (payload->>'week')::date;

      if monday is null or extract(isodow from monday)<>1 then raise invalid_parameter_value; end if;

      cursor_time := coalesce((payload->>'after')::timestamp,monday::timestamp - interval '1 second');

      select coalesce(jsonb_agg(to_jsonb(q) order by q.slot,q.id),'[]') into output from (

        select a.id,to_char(a.starts_at,'YYYY-MM-DD"T"HH24:MI') as slot,

          r.document->>'nombre' as nombre,a.reason as motivo,a.duration,a.orthodontics,a.work

        from clinic_private.appointments a join clinic_private.dental_records r

          on (r.clinic_id,r.id)=(a.clinic_id,a.patient_id)

        where a.clinic_id=target and a.starts_at>=monday and a.starts_at<monday+7 and (a.starts_at>cursor_time or (a.starts_at=cursor_time and a.id>coalesce((payload->>'afterId')::uuid,'00000000-0000-0000-0000-000000000000'::uuid)))

        order by a.starts_at,a.id limit 25

      ) q;

      if jsonb_array_length(output)>1 then

        perform clinic_private.reserve_clinical(target,false,jsonb_array_length(output)-1);

      end if;

    elsif action='detail' then

      select a.* into strict appt from clinic_private.appointments a where a.clinic_id=target and a.id=(payload->>'id')::uuid;

      select * into strict patient from clinic_private.dental_records r where (r.clinic_id,r.id)=(target,appt.patient_id);

      output := jsonb_build_object('id',appt.id,'revision',appt.revision,'slot',to_char(appt.starts_at,'YYYY-MM-DD"T"HH24:MI'),

        'motivo',appt.reason,'duration',appt.duration,'orthodontics',appt.orthodontics,'work',appt.work,'bookedBy',appt.booked_by,'edited',to_char(appt.edited_at at time zone 'America/Mexico_City','DD/MM/YYYY · HH24"h"'),

        'patient',jsonb_build_object('id',patient.id,'nombre',patient.document->>'nombre','telefono',patient.document->>'telefono','revision',patient.revision));

    elsif writing then

      if payload - array['id','revision','slot','motivo','patientId','patientRevision','nombre','telefono','duration','orthodontics','work'] <> '{}' or

        coalesce(payload->>'slot','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-5][0-9]$' then raise invalid_parameter_value; end if;

      if (payload ? 'duration' and (jsonb_typeof(payload->'duration')<>'number' or (payload->>'duration') !~ '^[0-9]+$')) or

        (payload ? 'orthodontics' and jsonb_typeof(payload->'orthodontics')<>'boolean') or

        (payload ? 'work' and jsonb_typeof(payload->'work')<>'boolean') then raise invalid_parameter_value; end if;

      slot := (payload->>'slot')::timestamp;

      if to_char(slot,'YYYY-MM-DD"T"HH24:MI')<>payload->>'slot' then raise invalid_parameter_value; end if;

      phone := btrim(payload->>'telefono');

      name_input := btrim(payload->>'nombre');

      reason_input := btrim(coalesce(payload->>'motivo',''));

      if jsonb_typeof(payload->'telefono') is distinct from 'string' or length(phone) not between 1 and 120 or

         (payload ? 'motivo' and jsonb_typeof(payload->'motivo') is distinct from 'string') or length(reason_input)>500 then

        raise invalid_parameter_value;

      end if;

      patient_id_input := (payload->>'patientId')::uuid;

      if patient_id_input is null then

        if jsonb_typeof(payload->'nombre') is distinct from 'string' then raise invalid_parameter_value; end if;

        patient_id_input := gen_random_uuid();

        insert into clinic_private.dental_records(clinic_id,document)

          values(target,jsonb_build_object('id',patient_id_input,'nombre',name_input,'telefono',phone));

        insert into clinic_private.audit_events(actor_id,clinic_id,operation,entity_id) values(actor,target,'record_create',patient_id_input);

      else

        select * into strict patient from clinic_private.dental_records r where r.clinic_id=target and r.id=patient_id_input for update;

        if patient.revision is distinct from (payload->>'patientRevision')::integer then raise no_data_found; end if;

        if patient.document->>'telefono'<>phone then

          update clinic_private.dental_records r set document=jsonb_set(r.document,'{telefono}',to_jsonb(phone)),revision=r.revision+1

            where r.clinic_id=target and r.id=patient_id_input;

          insert into clinic_private.audit_events(actor_id,clinic_id,operation,entity_id) values(actor,target,'record_update',patient_id_input);

        end if;

      end if;

      if action='create' then

        insert into clinic_private.appointments(clinic_id,patient_id,starts_at,reason,booked_by,duration,orthodontics,work)

          select target,patient_id_input,slot,reason_input,split_part(u.email,'@',1),coalesce((payload->>'duration')::integer,30),coalesce((payload->>'orthodontics')::boolean,false),coalesce((payload->>'work')::boolean,false) from auth.users u where u.id=actor

          returning * into strict appt;

      else

        update clinic_private.appointments a set patient_id=patient_id_input,starts_at=slot,reason=reason_input,

          duration=coalesce((payload->>'duration')::integer,a.duration),orthodontics=coalesce((payload->>'orthodontics')::boolean,a.orthodontics),work=coalesce((payload->>'work')::boolean,a.work),revision=a.revision+1,edited_at=clock_timestamp()

          where a.clinic_id=target and a.id=(payload->>'id')::uuid and a.revision=(payload->>'revision')::integer

          returning * into strict appt;

      end if;

      output := jsonb_build_object('id',appt.id,'patientId',appt.patient_id);

    else

      raise invalid_parameter_value;

    end if;

    insert into clinic_private.audit_events(actor_id,clinic_id,operation,entity_id)

      values(actor,target,'appointment_'||action,coalesce(appt.id,target));

    return output;

  exception

    when unique_violation then conflict := 'Slot occupied';

    when no_data_found then conflict := 'Selection changed';

    when data_exception or check_violation then

      perform set_config('response.status','400',true);

      return jsonb_build_object('message','Invalid appointment');

    when sqlstate 'PGRST' then

      get stacked diagnostics quota_detail=pg_exception_detail;

      perform set_config('response.status','429',true);

      perform set_config('response.headers',jsonb_build_array(quota_detail::jsonb->'headers')::text,true);

      return jsonb_build_object('message','Quota exceeded');

  end;

  perform set_config('response.status','409',true);

  return jsonb_build_object('message',conflict);

end $$;

create or replace function public.appointment_operation(target uuid, action text, payload jsonb)

returns jsonb language sql security invoker set search_path='' as $$

  select clinic_private.appointment_operation(target,action,payload);

$$;

revoke all on function clinic_private.appointment_operation(uuid,text,jsonb), public.appointment_operation(uuid,text,jsonb)

  from public,anon,authenticated,service_role;

grant execute on function clinic_private.appointment_operation(uuid,text,jsonb), public.appointment_operation(uuid,text,jsonb)

  to authenticated;
