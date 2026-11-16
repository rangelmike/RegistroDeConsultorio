import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootFiles = new Set([
  'AGENTS.md', 'init.sh', 'init.ps1', 'feature_list.json', 'progress.md',
  'session-handoff.md', 'skills-lock.json',
]);
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage']);
const required = [
  ...rootFiles, 'harness/governance.md', 'harness/project.md', 'harness/checks.json',
  'harness/approvals.json', 'harness/verify.mjs', 'harness/verify.test.mjs', 'harness/evidence.md',
];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (root, name) => JSON.parse(await readFile(path.join(root, name), 'utf8'));

export function manifestDigest(manifest) {
  const { digest, ...contents } = manifest;
  return hash(JSON.stringify(contents));
}

export async function collectProtected(root) {
  const files = {};
  async function walk(relative = '') {
    const entries = await readdir(path.join(root, relative), { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Enlace simbólico no verificable: ${name}`);
      if (entry.isDirectory()) {
        await walk(name);
        continue;
      }
      const protectedFile = rootFiles.has(name)
        || ['harness/', '.agents/', '.codex/'].some((prefix) => name.startsWith(prefix))
        || ['AGENTS.md', 'CLAUDE.md'].includes(entry.name);
      if (protectedFile && name !== 'harness/integrity.json') {
        files[name] = hash(await readFile(path.join(root, name)));
      }
    }
  }
  await walk();
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function validateFeatures(document) {
  if (document.schemaVersion !== 1 || !Array.isArray(document.features) || !document.features.length) {
    throw new Error('Formato de feature_list.json inválido');
  }
  const features = document.features;
  const byId = new Map(features.map((feature) => [feature.id, feature]));
  if (byId.size !== features.length) throw new Error('IDs de funciones duplicados');
  const statuses = new Set(['not-started', 'in-progress', 'blocked', 'done']);
  for (const feature of features) {
    for (const key of ['id', 'name', 'description']) {
      if (typeof feature[key] !== 'string' || !feature[key].trim()) throw new Error(`Campo ${key} inválido`);
    }
    if (!statuses.has(feature.status)) throw new Error(`Estado inválido: ${feature.id}`);
    if (!Array.isArray(feature.dependencies) || !Array.isArray(feature.acceptance)
      || !feature.acceptance.length || feature.acceptance.some((item) => typeof item !== 'string' || !item.trim())
      || !Array.isArray(feature.evidence)) throw new Error(`Criterios/dependencias/evidencia inválidos: ${feature.id}`);
    if (feature.dependencies.some((id) => !byId.has(id))) throw new Error(`Dependencia inexistente: ${feature.id}`);
    if (['in-progress', 'done'].includes(feature.status)
      && feature.dependencies.some((id) => byId.get(id).status !== 'done')) {
      throw new Error(`Dependencias pendientes: ${feature.id}`);
    }
    if (feature.status === 'done') {
      if (!feature.evidence.length) throw new Error(`Falta evidencia: ${feature.id}`);
      for (const evidence of feature.evidence) {
        if (['command', 'result', 'date', 'environment'].some((key) =>
          typeof evidence[key] !== 'string' || !evidence[key].trim()) || evidence.result !== 'passed') {
          throw new Error(`Evidencia de cierre inválida: ${feature.id}`);
        }
      }
    }
  }
  if (features.filter((feature) => feature.status === 'in-progress').length > 1) {
    throw new Error('Solo se permite una función activa');
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Dependencia circular: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    byId.get(id).dependencies.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  features.forEach((feature) => visit(feature.id));
}

export async function verify(root, { product = false } = {}) {
  const manifest = await readJson(root, 'harness/integrity.json');
  if (manifest.schemaVersion !== 1 || !manifest.files || manifest.digest !== manifestDigest(manifest)) {
    throw new Error('Referencia de integridad inválida. Investigar y solicitar aprobación antes de cambiarla.');
  }
  const current = await collectProtected(root);
  const names = new Set([...Object.keys(current), ...Object.keys(manifest.files), ...required]);
  const changed = [...names].filter((name) => !current[name] || current[name] !== manifest.files[name]);
  if (changed.length) throw new Error(`Cambios del harness pendientes de revisión aprobada:\n${changed.join('\n')}`);
  const approvals = await readJson(root, 'harness/approvals.json');
  if (approvals.schemaVersion !== 1 || !Array.isArray(approvals.records) || !approvals.records.length
    || approvals.records.some((record) => ['id', 'reference', 'quote', 'scope', 'reason'].some(
      (key) => typeof record[key] !== 'string' || !record[key].trim()))) {
    throw new Error('Registro de aprobaciones inválido');
  }
  validateFeatures(await readJson(root, 'feature_list.json'));
  const checks = await readJson(root, 'harness/checks.json');
  if (checks.schemaVersion !== 1 || !Array.isArray(checks.productCommands)) throw new Error('Controles inválidos');
  for (const check of checks.productCommands) {
    if (typeof check.command !== 'string' || !check.command.trim() || !Array.isArray(check.args)
      || check.args.some((arg) => typeof arg !== 'string')
      || !Number.isInteger(check.timeoutMs) || check.timeoutMs < 1) throw new Error('Comando de producto inválido');
  }
  if (product) {
    if (!checks.productCommands.length) throw new Error('Producto pendiente: registrar controles reales con aprobación.');
    for (const check of checks.productCommands) {
      const result = spawnSync(check.command, check.args, {
        cwd: root, stdio: 'inherit', shell: false, timeout: check.timeoutMs,
      });
      if (result.error || result.status !== 0) throw new Error(`Falló control: ${check.command} (${result.error?.message ?? result.status})`);
    }
  }
  return { protectedFiles: Object.keys(current).length, productChecked: product };
}

const script = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== '--product')) throw new Error('Uso: node harness/verify.mjs [--product]');
    const result = await verify(path.resolve(path.dirname(script), '..'), {
      product: process.argv.includes('--product'),
    });
    console.log(`PASS harness: ${result.protectedFiles} archivos íntegros y estado válido.`);
    console.log(result.productChecked ? 'Controles de producto registrados ejecutados.' : 'Producto sin verificar. Cierre de funciones requiere --product y sus criterios de aceptación.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
