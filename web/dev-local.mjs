import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const web = fileURLToPath(new URL('./',import.meta.url));
const root = fileURLToPath(new URL('../',import.meta.url));
// Read the CLI's local public key in memory; preserve the user's existing .env.local.
let local;
try {
  local=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command','supabase status -o json'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  if(new URL(local.API_URL).hostname!=='127.0.0.1') throw new Error('Expected local stack');
} catch { console.error('Inicia primero Supabase local con el comando registrado en harness/project.md.'); process.exit(1); }
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1'],{cwd:web,stdio:'inherit',windowsHide:true,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,NEXT_TELEMETRY_DISABLED:'1'}});
child.on('exit',code=>{process.exitCode=code??1;});
