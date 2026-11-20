import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClinicInput, validId } from '../lib/clinic-input.ts';
import { readRecordFile, byteLimit } from '../lib/record-file.ts';
import { emptyDrawing, fitsDrawing, touchesStroke, maxDrawingBytes } from '../lib/odontogram.ts';

test('odontograma: límites acumulados y borrado por segmentos, extremos y puntos',()=>{
  const stroke={id:crypto.randomUUID(),color:'#dc2626',width:2,points:[[10,10],[100,10]]};
  assert.ok(fitsDrawing(emptyDrawing()));
  assert.ok(fitsDrawing({template:'odontograma-v1',strokes:Array(500).fill(stroke)}));
  assert.equal(fitsDrawing({template:'odontograma-v1',strokes:Array(501).fill(stroke)}),false);
  assert.equal(fitsDrawing({template:'odontograma-v1',strokes:[{...stroke,points:Array(10001).fill([0,0])}]}),false);
  assert.equal(fitsDrawing({template:'odontograma-v1',strokes:[{...stroke,id:'x'.repeat(maxDrawingBytes)}]}),false);
  assert.ok(touchesStroke([50,10],stroke));
  assert.ok(touchesStroke([102,10],stroke));
  assert.equal(touchesStroke([50,25],stroke),false);
  assert.ok(touchesStroke([10,10],{...stroke,points:[[10,10]]}));
  assert.equal(touchesStroke([30,10],{...stroke,points:[[10,10]]}),false);
});
const id = '00000000-0000-4000-8000-000000000001';
const jsonFile = data => new File([JSON.stringify(data)], 'sintetico.json');
test('acepta JSON individual, listas y exportaciones versionadas', async () => {
  const record={nombre:'Prueba',telefono:'000'};
  const single=await readRecordFile(jsonFile(record));
  assert.equal(single.version,1);
  assert.deepEqual(await readRecordFile(jsonFile(single)),single);
  const file=jsonFile([record,record]);
  const multiple=await readRecordFile(file);
  assert.notEqual(multiple.expedientes[0].id,multiple.expedientes[1].id);
  assert.deepEqual(await readRecordFile(file),multiple);
});
test('rechaza archivos dañados, versiones desconocidas y lotes fuera de límites', async () => {
  for(const data of [[],null,{version:2,expedientes:[]},{nombre:'A'},{telefono:'1'},Array(51).fill({})]) {
    await assert.rejects(readRecordFile(jsonFile(data)));
  }
  await assert.rejects(readRecordFile(new File(['{'],'mal.json')));
  await assert.rejects(readRecordFile(new File([new Uint8Array(byteLimit+1)],'grande.json')));
});
const form = values => { const f = new FormData(); for(const [k,v] of Object.entries(values)) f.set(k,v); return f; };
test('normalizes emails, deduplicates and trims name', () => {
  const v = parseClinicInput(form({action:'create',name:' Alameda ',emails:' A@example.test; a@example.test\nb@example.test'}));
  assert.deepEqual(v.member_emails,['a@example.test','b@example.test']); assert.equal(v.clinic_name,'Alameda'); assert.equal(v.target_clinic,null);
});
test('rejects forged identifiers, invalid actions and missing names', () => {
  assert.equal(validId('anything'),false);
  for(const values of [{action:'rename',clinicId:'fake',name:'ok'},{action:'admin'},{action:'create',name:' '},{action:'create',name:'x'.repeat(101)}]) assert.throws(()=>parseClinicInput(form(values)));
});
test('validates bulk inputs and explicit deletion confirmation', () => {
  for(const emails of ['invalid','a@b.test\nnot-an-email',Array.from({length:51},(_,i)=>`a${i}@example.test`).join(',')]) assert.throws(()=>parseClinicInput(form({action:'add',clinicId:id,emails})));
  assert.throws(()=>parseClinicInput(form({action:'delete',clinicId:id})));
  assert.equal(parseClinicInput(form({action:'delete',clinicId:id,confirmation:'ELIMINAR'})).action,'delete');
  assert.throws(()=>parseClinicInput(form({action:'remove',clinicId:id,accessId:'foreign'})));
});
