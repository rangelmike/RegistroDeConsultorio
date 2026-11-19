import { chromium, expect } from '@playwright/test';
import { verifyRecords } from './records-browser.mjs';
import { verifyAgenda, verifyCompetingBookings } from './agenda-browser.mjs';
import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { localStack, syntheticActor, cleanupActors, root } from './local-stack.mjs';
const config=localStack(), actors=[];
let browser, server;
const base='http://127.0.0.1:3100';
async function waitServer() {
  for(let i=0;i<120;i++) { try { const r=await fetch(base); if(r.ok) return; } catch {} await new Promise(r=>setTimeout(r,500)); }
  throw new Error('Local web server did not become ready.');
}
async function api(actor,pathName,body) {
  return fetch(config.API_URL+'/rest/v1/'+pathName,{method:body?'POST':'GET',headers:{apikey:config.PUBLISHABLE_KEY,Authorization:'Bearer '+actor.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
}
try {
  const owner=await syntheticActor(config,'owner'); actors.push(owner);
  const member=await syntheticActor(config,'member'); actors.push(member);
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3100'],{cwd:path.join(root,'web'),env:{...process.env,LOCAL_BROWSER_TEST:'1',NEXT_PUBLIC_SUPABASE_URL:config.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:config.PUBLISHABLE_KEY,NEXT_TELEMETRY_DISABLED:'1'},stdio:'ignore',windowsHide:true});
  await waitServer();
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  // No external services or real OAuth identities are used by this local integration test.
  await context.route('**/*',route=>{ const host=new URL(route.request().url()).hostname; return ['127.0.0.1','localhost'].includes(host)?route.continue():route.abort(); });
  const page=await context.newPage();
  await page.goto(base+'/panel/consultorios');
  await expect(page.getByRole('button',{name:'Continuar con Google'})).toBeVisible();
  await page.goto(base+'/auth/callback?error=access_denied');
  await expect(page.getByText('El inicio de sesión se canceló o no pudo completarse.',{exact:true})).toBeVisible();
  await context.addCookies(owner.cookies);
  await page.goto(base+'/panel/consultorios');
  await expect(page.getByRole('heading',{name:'Mis consultorios.'})).toBeVisible();
  await page.getByRole('button',{name:'Nuevo consultorio'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nombre del consultorio').fill('Consultorio Alameda');
  await dialog.getByLabel('Correos de los integrantes').fill(member.email+'\npending@example.test');
  await dialog.getByRole('button',{name:'Crear consultorio',exact:true}).click();
  await expect(dialog).not.toBeVisible({timeout:20000});
  await expect(page.getByRole('heading',{name:'Consultorio Alameda',exact:true}).last()).toBeVisible();
  await expect(page.getByText(member.email,{exact:true})).toBeVisible();
  const listed=await (await api(owner,'clinics?select=id,name')).json();
  const clinicId=listed.find(c=>c.name==='Consultorio Alameda').id;
  const memberContext=await browser.newContext({viewport:{width:1000,height:800}});
  await memberContext.addCookies(member.cookies);
  const memberPage=await memberContext.newPage();
  await memberPage.goto(base+'/panel/consultorios');
  await expect(memberPage.getByRole('heading',{name:'Consultorio Alameda',exact:true}).last()).toBeVisible();
  await expect(memberPage.getByRole('button',{name:'Guardar nombre'})).toHaveCount(0);
  const denied=await api(member,'rpc/manage_clinic',{action:'delete',target_clinic:clinicId});
  if(denied.ok) throw new Error('Member deleted clinic via direct API.');
  await page.getByRole('textbox',{name:'Nombre del consultorio',exact:true}).fill('Consultorio Alameda Norte');
  await page.getByRole('button',{name:'Guardar nombre'}).click();
  await expect(page.getByRole('heading',{name:'Consultorio Alameda Norte',exact:true}).last()).toBeVisible();
  await page.getByLabel('Añadir integrantes',{exact:true}).fill('new@example.test');
  await page.getByRole('button',{name:'Añadir integrantes',exact:true}).click();
  await expect(page.getByText('new@example.test',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Nuevo consultorio'}).click();
  await dialog.getByLabel('Nombre del consultorio').fill('Consultorio Bosque');
  await dialog.getByRole('button',{name:'Crear consultorio',exact:true}).click();
  await expect(dialog).not.toBeVisible({timeout:20000});
  await page.getByLabel('CONSULTORIO ACTIVO').selectOption({label:'Consultorio Alameda Norte'});
  const secondClinic=(await (await api(owner,'clinics?select=id,name')).json()).find(c=>c.name==='Consultorio Bosque');
  await verifyCompetingBookings(api,owner,secondClinic.id);
  await expect(page.getByRole('heading',{name:'Consultorio Alameda Norte',exact:true}).last()).toBeVisible();
  await page.getByRole('link',{name:'Agenda',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Agenda.'})).toBeVisible();
  await expect(page.getByLabel('CONSULTORIO ACTIVO')).toHaveValue(clinicId);
  await verifyAgenda(page,owner.email.split('@')[0]);
  await page.getByRole('link',{name:'Expedientes',exact:true}).click();
  await expect(page).toHaveURL(base+'/panel/expedientes');
  await expect(page.getByRole('heading',{name:'Expedientes.'})).toBeVisible();
  await verifyRecords(page,memberPage,clinicId);
  await page.getByRole('link',{name:'Consultorios',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Mis consultorios.'})).toBeVisible();
  await expect(page.getByText(member.email,{exact:true})).toBeVisible();
  await mkdir(path.join(root,'.local'),{recursive:true});
  await page.screenshot({path:path.join(root,'.local','consultorios-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)) throw new Error('Mobile layout overflows horizontally.');
  await page.screenshot({path:path.join(root,'.local','consultorios-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1100});
  await page.getByRole('button',{name:`Quitar a ${member.email}`,exact:true}).click();
  await page.getByRole('button',{name:'Sí, quitar',exact:true}).click();
  await expect(page.getByText(member.email,{exact:true})).toHaveCount(0);
  const revoked=await (await api(member,'clinics?select=id')).json();
  if(revoked.length) throw new Error('Removed user still sees clinic with original JWT.');
  await memberPage.reload();
  await expect(memberPage.getByRole('heading',{name:'Tu primer consultorio empieza aquí'})).toBeVisible();
  await page.getByText('Eliminar este consultorio',{exact:true}).click();
  await page.getByLabel('Escribe ELIMINAR para confirmar').fill('ELIMINAR');
  await page.getByRole('button',{name:'Eliminar definitivamente'}).click();
  await expect(page.getByRole('heading',{name:'Consultorio Alameda Norte',exact:true})).toHaveCount(0);
  await expect(page.getByLabel('CONSULTORIO ACTIVO')).not.toHaveValue(clinicId);
  await page.getByRole('button',{name:'Cerrar sesión'}).click();
  await expect(page.getByRole('button',{name:'Continuar con Google'})).toBeVisible();
  const afterLogout=await (await api(owner,'clinics?select=id')).json();
  if(Array.isArray(afterLogout)&&afterLogout.length) throw new Error('Revoked session still reads clinic.');
  console.log('PASS browser: anonymous routes, callback cancellation, create, rename, invite, owner/member permissions, selector, navigation, revocation, delete, logout, desktop and mobile. Synthetic local OAuth session; real Google consent remains pending.');
} catch(error) { console.error('Browser verification failed:',error.message); process.exitCode=1; }
finally {
  await browser?.close();
  if(server?.pid) {
    const {spawnSync}=await import('node:child_process');
    spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore'});
  }
  cleanupActors(actors);
  if(server?.pid) {
    const webRoot=path.resolve(root,'web');
    const generated=path.resolve(webRoot,'.next-test');
    if(path.dirname(generated)!==webRoot || path.basename(generated)!=='.next-test') throw new Error('Unexpected build directory');
    await rm(generated,{recursive:true,force:true,maxRetries:3,retryDelay:500});
  }
}
