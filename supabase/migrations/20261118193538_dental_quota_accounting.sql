-- Keep a failed clinical transaction atomic while charging for its work.
-- Returning an HTTP error via PostgREST's transaction settings commits only
-- the quota debit. The inner exception block has rolled back the entire batch.
alter function clinic_private.dental_operation(uuid,text,jsonb) rename to dental_work;
revoke all on function clinic_private.dental_work(uuid,text,jsonb) from public,anon,authenticated,service_role;

create function clinic_private.dental_operation(target uuid, action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  explanation text;
  position_detail text;
  state text;
  units integer:=1;
  items jsonb;
  http_status integer;
begin
  begin
    return clinic_private.dental_work(target,action,payload);
  exception when invalid_parameter_value or sqlstate 'PT409' or sqlstate 'PGRST' then
    get stacked diagnostics explanation=message_text,position_detail=pg_exception_detail,state=returned_sqlstate;
    if state='PGRST' then
      if action<>'list' then raise; end if;
      -- A page may fit the first reservation but exceed the remaining budget.
      -- Count the lookup even when the remainder of the page cannot be returned.
      perform clinic_private.reserve_clinical(target,false,1);
      perform set_config('response.status','429',true);
      perform set_config('response.headers',jsonb_build_array(jsonb_build_object(
        'Retry-After',(position_detail::jsonb->'headers'->>'Retry-After')))::text,true);
      return explanation::jsonb;
    end if;
  end;
  items:=case when action in ('read','delete') then payload->'ids' else payload->'expedientes' end;
  if jsonb_typeof(items)='array' then units:=greatest(1,least(50,jsonb_array_length(items))); end if;
  perform clinic_private.reserve_clinical(target,coalesce(action in ('import','update','delete'),false),units);
  http_status:=case when state='PT409' then 409 else 400 end;
  perform set_config('response.status',http_status::text,true);
  return jsonb_build_object('code',state,'message',explanation,'details',
    case when position_detail ~ '^[1-9][0-9]?$' then position_detail end,'hint',null);
end $$;
revoke all on function clinic_private.dental_operation(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function clinic_private.dental_operation(uuid,text,jsonb) to authenticated;
create or replace function public.dental_operation(target uuid, action text, payload jsonb)
returns jsonb language sql set search_path='' as $$
  select clinic_private.dental_operation(target,action,payload);
$$;
