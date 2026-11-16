# Gobierno y evolución

## Alcance protegido

Todo el contenido de `harness/`, `AGENTS.md`, `init.sh`, `init.ps1`, `feature_list.json`, `progress.md`, `session-handoff.md` y `skills-lock.json`. También instrucciones AGENTS.md y CLAUDE.md anidadas y archivos de `.agents/` y `.codex/` del proyecto. Cualquier nueva ubicación de instrucciones, memoria, verificaciones o estado está sujeta a esta política por su función.

Agregar, editar, renombrar, mover y borrar requieren autorización previa. Las actualizaciones rutinarias de estado también. Una solicitud de producto por sí sola no autoriza modificar el harness. Las autorizaciones del sistema de herramientas tampoco sustituyen la aprobación del contenido.

## Cuándo crecer

Antes de un módulo, proveedor, flujo de datos, rol, migración o comando nuevo, comprobar si el harness representa sus dependencias y permite verificarlo. Ampliar solo ante un hueco concreto de seguridad, alcance, continuidad o verificación. Si basta con lo existente, conservarlo.

## Orden obligatorio

1. Presentar en el chat archivos exactos, cambio propuesto, necesidad verificable, controles añadidos y trabajo dependiente. No escribir la propuesta en archivos protegidos antes de la aprobación.
2. Obtener petición explícita del usuario sobre el harness o aprobación de la propuesta. El silencio no autoriza. Incluir el lote de actualizaciones de estado/evidencia y de la referencia de integridad si será necesario.
3. Registrar la cita literal y referencia al mensaje real en `harness/approvals.json`, junto con motivo y alcance. Nunca inventar permisos.
4. Aplicar solo las ediciones cubiertas. Actualizar `harness/integrity.json` con SHA-256 usando `collectProtected` y `manifestDigest` exportados por `harness/verify.mjs`. La referencia también requiere aprobación. El arranque no la repara.
5. Ejecutar verificación y pruebas del harness y revisar el diff contra la propuesta.
6. Solo después implementar el cambio de producto dependiente. Registrar al cierre estado y evidencia dentro del permiso concedido. Pedir aprobación adicional si cambia el alcance.

## Mecanismo y límite de protección

El verificador detecta altas, bajas, modificaciones y enlaces simbólicos en los archivos protegidos. El resumen del manifiesto se calcula omitiendo únicamente su campo digest. Conservar los finales de línea porque se comparan bytes.

Es un control local de integridad. Quien tenga escritura sobre el verificador y la referencia puede sustituir ambos. La aprobación auténtica se comprueba en la conversación. Cuando exista remoto, proponer con aprobación revisión obligatoria del propietario, protección de rama y CI con referencia confiable. Hasta entonces, comprobar inicio/cierre y revisar cambios en el editor.

El permiso inicial cubre solo esta creación. Su registro nunca autoriza futuras modificaciones. Los campos de aprobaciones son trazabilidad y no autentican por sí mismos al usuario.

## Registrar verificaciones del producto

Cada entrada de productCommands en harness/checks.json contiene command, args y timeoutMs. command es un ejecutable disponible, args es un arreglo de argumentos y timeoutMs un entero positivo. El ejecutor usa shell deshabilitado, conserva stdout/stderr y propaga errores, timeout y códigos de salida distintos de cero. En Windows, usar un ejecutable real como node o una invocación explícita y revisada de powershell.exe para herramientas distribuidas como scripts .cmd. Inspeccionar cualquier comando antes de registrarlo para respetar la prohibición de compilar .cpp y evitar efectos remotos inesperados.

El control --product ejecuta todos los comandos registrados. Revisar además la evidencia de cada criterio de aceptación. Un comando exitoso no demuestra automáticamente todos los criterios.
