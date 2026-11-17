import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClinicInput, validId } from '../lib/clinic-input.ts';
const id = '00000000-0000-4000-8000-000000000001';
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
