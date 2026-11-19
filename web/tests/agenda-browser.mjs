import {expect} from '@playwright/test';
import assert from 'node:assert/strict';

export async function verifyAgenda(page,booker) {
  const button=name=>page.getByRole('button',{name,exact:true});
  const patient='Paciente Agenda Sintético';
  const phone='5550100999';
  await button('Semana siguiente').click();
  await expect(page.getByText('Semana sin citas')).toBeVisible();
  const first=page.getByRole('button',{name:/^Agendar el .* a las 09:30$/}).first();
  const day=(await first.getAttribute('aria-label')).split(' ')[2];
  await first.click();
  await expect(page.getByLabel('Fecha de la cita')).toHaveValue(day);
  await expect(page.getByLabel('Hora de inicio',{exact:true})).toHaveValue('09:30');
  await page.getByLabel('Nombre del paciente').fill(patient);
  await button('+ Nuevo paciente').click();
  await page.getByLabel('Teléfono del paciente').fill(phone);
  await page.getByLabel('Motivo de la cita').fill('Consulta sintética');
  await button('Guardar cita').click();
  await expect(page.getByRole('status').filter({hasText:'Expediente creado'})).toBeVisible();
  await button('Completar expediente').click();
  await expect(page.getByRole('heading',{name:'Editar expediente'})).toBeVisible();
  await expect(page.getByLabel('Nombre del paciente')).toHaveValue(patient);
  await expect(page.getByLabel('Teléfono',{exact:true})).toHaveValue(phone);
  await page.getByRole('link',{name:'Agenda',exact:true}).click();
  await button('Agendar cita').click();
  await page.getByLabel('Nombre del paciente').fill('genda Sin');
  await page.getByRole('button',{name:new RegExp(patient+' '+phone)}).click();
  await expect(page.getByLabel('Teléfono del paciente')).toHaveValue(phone);
  await page.getByLabel('Fecha de la cita').fill(day);
  await page.getByLabel('Hora de inicio',{exact:true}).fill('09:30');
  await page.getByLabel('Motivo de la cita').fill('Seguimiento sintético');
  await button('Guardar cita').click();
  await page.getByRole('button',{name:patient+' Seguimiento sintético',exact:true}).click();
  await button('Editar cita').click();
  await page.getByLabel('Teléfono del paciente').fill('00022');
  await page.getByLabel('Hora de inicio',{exact:true}).fill('21:30');
  await page.getByLabel('Duración en minutos',{exact:true}).selectOption('45');
  await page.getByLabel('Ortodoncia',{exact:true}).check();
  await page.getByLabel('Necesita trabajos').check();
  await button('Guardar cambios').click();
  const booking=page.getByRole('button',{name:patient+' Seguimiento sintético Ortodoncia',exact:true});
  await expect(booking).toBeVisible();
  await expect(page.getByText('00022',{exact:true})).toHaveCount(0);
  await button('Semana anterior').click();
  await expect(booking).toHaveCount(0);
  await button('Semana siguiente').click();
  await expect(booking).toHaveClass(/needs-work/);
  assert.equal(await booking.evaluate(el=>el.getBoundingClientRect().height),90);
  await booking.click();
  await expect(page.getByText(booker,{exact:true})).toBeVisible();
  await expect(page.getByText(/^\d{2}\/\d{2}\/\d{4} · \d{2}h$/)).toBeVisible();
  await expect(page.getByText('00022',{exact:true})).toBeVisible();
  await button('Editar cita').click();
  await page.getByLabel('Motivo de la cita').fill('Seguimiento actualizado');
  await page.getByLabel('Hora de inicio',{exact:true}).fill('22:00');
  await button('Guardar cambios').click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('region',{name:'Calendario semanal'})).toBeVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await button(patient+' Seguimiento actualizado Ortodoncia').click();
  await button('Ver expediente').click();
  await expect(page.getByRole('heading',{name:patient})).toBeVisible();
  await expect(page.locator('.record-viewer')).toContainText('00022');
  await page.setViewportSize({width:1440,height:1100});
  await button('Volver a la consulta').click();
  const row=page.locator('.record-rows li').filter({hasText:patient});
  await row.getByRole('button',{name:'Eliminar',exact:true}).click();
  await button('Confirmar eliminación').click();
  await expect(row).toHaveCount(0);
  await page.getByRole('link',{name:'Agenda',exact:true}).click();
  await button('Semana siguiente').click();
  await expect(page.getByText('Semana sin citas')).toBeVisible();
  console.log('PASS Agenda E2E: semana, turno libre, paciente nuevo y existente, teléfono, conflicto, edición y expediente en escritorio y móvil.');
}

export async function verifyCompetingBookings(api,owner,clinic) {
  const body={target:clinic,action:'create',payload:{slot:'2027-01-10T11:30',telefono:'000',motivo:'Prueba simultánea'}};
  const results=await Promise.all(['Uno','Dos'].map(nombre=>api(owner,'rpc/appointment_operation',
    {...body,payload:{...body.payload,nombre}})));
  assert.deepEqual(results.map(r=>r.status).sort(),[200,200]);
  const records=await (await api(owner,'rpc/dental_operation',{target:clinic,action:'list',payload:{}})).json();
  assert.equal(records.length,2);
  console.log('PASS reserva concurrente en dos solicitudes y reversión del expediente del turno rechazado.');
}
