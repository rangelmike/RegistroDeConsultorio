# Relevo

## Current Objective

Harness inicial preparado. Aplicación pendiente de desarrollo.

## Files

AGENTS.md dirige el inicio. harness/governance.md controla permisos. harness/project.md define requisitos. feature_list.json mantiene dependencias y criterios. harness/verify.mjs valida integridad y estado. harness/checks.json registrará comandos de producto con aprobación.

## Blockers

Durante la inspección no había aplicación, package.json ni repositorio Git. Los scripts requieren Node.js 20 o superior con librerías integradas.

## Recommended Next Step

Ejecutar `node harness/verify.mjs`. Ante una solicitud posterior de desarrollo, resolver foundation y obtener aprobación de las actualizaciones necesarias del harness antes de escribir producto.

## End of Session

Persistir resultados y próximo paso solo mediante lote autorizado. Si falta permiso, entregar el relevo en el chat. La evidencia de esta entrega está en harness/evidence.md.
