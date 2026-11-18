import { execFileSync, spawnSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
export const root = fileURLToPath(new URL('../../',import.meta.url));
export function localStack() {
  const output=execFileSync('powershell.exe',['-NoProfile','-Command','supabase status -o json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const config=JSON.parse(output);
  if(new URL(config.API_URL).hostname!=='127.0.0.1' || new URL(config.API_URL).port!=='54321') throw new Error('Tests require the isolated local Supabase stack.');
  return config; // Keys stay in memory, never in evidence or logs.
}
export function sql(text) {
  const result=spawnSync('docker',['exec','-i','supabase_db_ConsultorioRegistro','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input:text,encoding:'utf8',timeout:30000});
  if(result.status!==0) throw new Error('Local fixture SQL failed: '+result.stderr);
  return result.stdout.trim();
}
export async function syntheticActor(config,label) {
  const id=randomUUID(), session=randomUUID(), email=`${label}-${id.slice(0,8)}@example.test`;
  const admin=createClient(config.API_URL,config.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {error: createError}=await admin.auth.admin.createUser({id,email,email_confirm:true,app_metadata:{provider:'google',providers:['google']}});
  if(createError) throw new Error('Local synthetic account setup failed: '+createError.message);
  sql(`begin;
    delete from auth.identities where user_id='${id}';
    insert into auth.identities(id,provider_id,user_id,provider,identity_data,created_at,updated_at)
      values(gen_random_uuid(),'${id}','${id}','google','{"sub":"${id}","email":"${email}","email_verified":true}',now(),now());
    insert into auth.sessions(id,user_id,created_at,updated_at) values('${session}','${id}',now(),now()); commit;`);
  const issued=Math.floor(Date.now()/1000);
  const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const content=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:id,role:'authenticated',aud:'authenticated',iss:config.API_URL+'/auth/v1',email,iat:issued,exp:issued+3600,session_id:session,aal:'aal1',amr:[{method:'oauth',timestamp:issued}],app_metadata:{provider:'google',providers:['google']}});
  const token=content+'.'+createHmac('sha256',config.JWT_SECRET).update(content).digest('base64url');
  const cookieValues=[];
  const supabase=createServerClient(config.API_URL,config.PUBLISHABLE_KEY,{cookies:{getAll:()=>[],setAll:values=>cookieValues.push(...values)}});
  const {error}=await supabase.auth.setSession({access_token:token,refresh_token:randomUUID()});
  if(error) { cleanupActors([{id}]); throw new Error('Local synthetic session setup failed: '+error.message); }
  return {id,session,email,token,cookies:cookieValues.map(c=>({name:c.name,value:c.value,domain:'127.0.0.1',path:'/',httpOnly:false,secure:false,sameSite:'Lax'}))};
}
export function cleanupActors(actors) {
  if(!actors.length) return;
  const ids=actors.map(a=>`'${a.id}'`).join(',');
  sql(`begin;
    delete from clinic_private.clinical_usage where
      (scope='user' and principal in (${ids})) or
      (scope='device' and principal in (select id from auth.sessions where user_id in (${ids}))) or
      (scope='device' and principal = any(array[${actors.filter(a=>a.session).map(a=>`'${a.session}'`).join(',')}]::uuid[])) or
      (scope='clinic' and principal in (select clinic_id from clinic_private.audit_events where actor_id in (${ids})));
    delete from public.clinics where owner_id in (${ids});
    delete from clinic_private.audit_events where actor_id in (${ids});
    delete from auth.users where id in (${ids});
    commit;`);
}
