import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectProtected, manifestDigest, validateFeatures, verify } from './verify.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'consultorio-harness-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const files = await collectProtected(root);
  for (const name of Object.keys(files)) {
    await mkdir(path.dirname(path.join(directory, name)), { recursive: true });
    await writeFile(path.join(directory, name), await readFile(path.join(root, name)));
  }
  await sealFixture(directory);
  return directory;
}

async function sealFixture(directory) {
  // Solo referencia de una copia desechable creada por esta prueba.
  const manifest = { schemaVersion: 1, files: await collectProtected(directory) };
  manifest.digest = manifestDigest(manifest);
  await writeFile(path.join(directory, 'harness/integrity.json'), JSON.stringify(manifest));
}

test('referencia válida y cierre de producto bloqueado sin controles', async (t) => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, 'harness/checks.json'), JSON.stringify({ schemaVersion: 1, productCommands: [] }));
  await sealFixture(directory);
  assert.equal((await verify(directory)).productChecked, false);
  await assert.rejects(verify(directory, { product: true }), /registrar controles/);
});

test('ejecuta controles registrados y acredita producto solo si pasan', async (t) => {
  const directory = await fixture(t);
  const marker = path.join(directory, 'control-ejecutado.txt');
  const checks = { schemaVersion: 1, productCommands: [
    { command: process.execPath, args: ['-e', "require('node:fs').writeFileSync(process.argv[1], 'ok')", marker], timeoutMs: 5000 },
  ] };
  await writeFile(path.join(directory, 'harness/checks.json'), JSON.stringify(checks));
  await sealFixture(directory);
  assert.equal((await verify(directory, { product: true })).productChecked, true);
  assert.equal(await readFile(marker, 'utf8'), 'ok');
});

for (const operation of ['edit', 'add', 'delete', 'manifest']) {
  test(`detecta alteración ${operation}`, async (t) => {
    const directory = await fixture(t);
    if (operation === 'edit') await writeFile(path.join(directory, 'AGENTS.md'), 'alterado');
    if (operation === 'add') await writeFile(path.join(directory, 'harness/extra.md'), 'nuevo');
    if (operation === 'delete') await rm(path.join(directory, 'progress.md'));
    if (operation === 'manifest') {
      const location = path.join(directory, 'harness/integrity.json');
      const value = JSON.parse(await readFile(location, 'utf8'));
      value.files['AGENTS.md'] = 'alterado';
      await writeFile(location, JSON.stringify(value));
    }
    await assert.rejects(verify(directory), /integridad|Cambios del harness/);
  });
}

test('propaga fallo de un control real de producto', async (t) => {
  const directory = await fixture(t);
  const checks = { schemaVersion: 1, productCommands: [
    { command: process.execPath, args: ['-e', 'process.exit(7)'], timeoutMs: 5000 },
  ] };
  await writeFile(path.join(directory, 'harness/checks.json'), JSON.stringify(checks));
  await sealFixture(directory);
  await assert.rejects(verify(directory, { product: true }), /Falló control/);
});

const feature = (id, dependencies = []) => ({
  id, name: id, description: id, dependencies, status: 'not-started', acceptance: ['Criterio'], evidence: [],
});

test('rechaza ciclos, dependencias ausentes, múltiples tareas y cierre sin evidencia', () => {
  const document = (features) => ({ schemaVersion: 1, features });
  assert.throws(() => validateFeatures(document([feature('a', ['b'])])), /inexistente/);
  assert.throws(() => validateFeatures(document([feature('a', ['b']), feature('b', ['a'])])), /circular/);
  assert.throws(() => validateFeatures(document([
    { ...feature('a'), status: 'in-progress' }, { ...feature('b'), status: 'in-progress' },
  ])), /una función activa/);
  assert.throws(() => validateFeatures(document([{ ...feature('a'), status: 'done' }])), /Falta evidencia/);
  assert.throws(() => validateFeatures(document([
    feature('a'), { ...feature('b', ['a']), status: 'in-progress' },
  ])), /Dependencias pendientes/);
});
