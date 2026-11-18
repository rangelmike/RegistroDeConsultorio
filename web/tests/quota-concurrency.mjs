import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { sql } from './local-stack.mjs';

export async function checkConcurrentSlots() {
  for (const [scope, capacity] of [['user', 2], ['clinic', 10]]) {
    const principal = randomUUID();
    const holder = spawn('docker', ['exec','-i','supabase_db_ConsultorioRegistro','psql','-U','postgres','-d','postgres','-Atq','-v','ON_ERROR_STOP=1'], {windowsHide:true});
    const lines = createInterface({input:holder.stdout});
    const closed = once(holder, 'close');
    const timer = setTimeout(() => holder.kill(), 15000);
    try {
      holder.stdin.write(`begin; select pg_advisory_xact_lock(hashtextextended('${scope}${principal}/' || n,0)) from generate_series(1,${capacity}) n; select 'ready';\n`);
      let ready = false;
      for await (const line of lines) {
        if (line.trim() === 'ready') { ready = true; break; }
      }
      if (!ready) throw new Error('La conexión concurrente no obtuvo los slots de prueba.');
      sql(`do $$ begin
        perform clinic_private.reserve_slot('${scope}','${principal}',${capacity});
        raise exception 'Expected concurrency limit';
      exception when sqlstate 'PGRST' then null; end $$;`);
    } finally {
      holder.stdin.end('rollback;\n');
      await closed;
      clearTimeout(timer);
    }
    sql(`select clinic_private.reserve_slot('${scope}','${principal}',${capacity});`);
  }
  console.log('PASS cupos concurrentes de usuario y consultorio con conexiones independientes.');
}
