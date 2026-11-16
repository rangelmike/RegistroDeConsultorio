# ConsultorioRegistro — instrucciones para agentes

## Startup Workflow

1. Leer este archivo, `harness/governance.md`, `harness/project.md`, `feature_list.json`, `progress.md` y `session-handoff.md` antes de escribir.
2. Ejecutar `node harness/verify.mjs`. También disponible mediante `./init.ps1` o `bash init.sh`. Investigar cualquier fallo antes de editar. Nunca regenerar la referencia para ocultarlo.
3. Contrastar el estado persistido con los archivos reales y la autorización actual. Revisar cambios locales.
4. La autorización inicial cubre exclusivamente crear este harness. El desarrollo requiere una solicitud posterior.

## Stay in scope

- One feature at a time. Como máximo una función con status `in-progress`, respetando dependencias.
- Toda modificación del harness requiere petición explícita sobre el harness o aprobación previa concreta. Incluye estado, evidencias, scripts, instrucciones y referencia de integridad.
- Si una tarea necesita ampliar el harness, solicitar primero el cambio, esperar aprobación, actualizar y verificar el harness y después implementar la tarea dependiente.
- Si las reglas existentes cubren la tarea, conservarlas. No añadir estructura por preferencia del agente o tamaño del repositorio.
- Usar datos sintéticos. Mantener datos clínicos, credenciales y tokens fuera de chats, fixtures, logs y evidencias.
- Verificar el harness no autoriza infraestructura, deploy, migraciones remotas ni gastos.
- No modificar código que no esté relacionado con la función en la que se está trabajando.
- Google es el único proveedor de autenticación, Supabase almacena datos y AWS aloja el despliegue. Aplicar el contrato de seguridad de `harness/project.md`.

## Definition of Done

- Alcance autorizado implementado por sus puntos de entrada normales y criterios de aceptación satisfechos.
- Evidencia con comando, resultado, fecha y entorno. Una comprobación sin ejecutar queda pendiente. Los mocks requieren complementarse con pruebas reales de RLS y cuotas.
- Ejecutar `node harness/verify.mjs` y `node --test harness/verify.test.mjs`.
- Para producto, registrar primero con aprobación los comandos reales de tests, lint, typecheck y build aplicables en `harness/checks.json`. Ejecutar `node harness/verify.mjs --product` antes de cerrar una función.
- Revisar además los criterios de la función y el diff completo. La comprobación estructural acredita únicamente el harness.
- Conservar un repositorio restartable. Nunca marcar done con verificaciones pendientes.

## End of Session

- Actualizar `progress.md`, `feature_list.json` y `session-handoff.md` únicamente con permiso explícito que incluya esos archivos. Se puede solicitar un lote de actualizaciones de estado de una tarea con alcance definido.
- Si falta ese permiso, entregar estado, evidencia y siguiente paso en el chat, pendientes de persistir. No crear otro archivo para eludirlo.
- Informar archivos del harness modificados y la aprobación utilizada.
- La autorización inicial de creación se consume al entregar este harness.
