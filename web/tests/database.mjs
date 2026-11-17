import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../',import.meta.url));
const result=spawnSync('powershell.exe',['-NoProfile','-Command','supabase test db --local; exit $LASTEXITCODE'],{cwd:root,stdio:'inherit',timeout:240000});
if(result.error) console.error('No se pudo ejecutar la prueba local de base de datos.');
process.exit(result.status ?? 1);
