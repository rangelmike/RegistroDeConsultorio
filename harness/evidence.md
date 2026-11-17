# Evidencia de creación

- Fecha de sesión — 2026-11-16, America/Mexico_City.
- Entorno — Windows PowerShell, Node.js v24.21.0.
- Alcance — creación del harness. Todas las funciones del producto permanecen not-started.
- Autorización — solicitud explícita del usuario registrada en harness/approvals.json.

## Verificación

- Auditoría estructural mediante `node .agents/skills/harness-creator/scripts/validate-harness.mjs --target .` — 100/100, instrucciones, estado, verificación, alcance y ciclo de vida con 5/5 cada uno.
- Pruebas funcionales mediante `node --test harness/verify.test.mjs` — 7 pruebas aprobadas, 0 fallidas.
- Integridad mediante `node harness/verify.mjs` y entrada PowerShell `./init.ps1` — salida 0, 39 archivos protegidos íntegros y estado válido.
- Cierre de producto mediante `node harness/verify.mjs --product` — salida 1 esperada, exige registrar controles reales con aprobación.
- Entrada Bash init.sh disponible para entornos con Bash. La entrada ejecutada en esta entrega fue PowerShell.

La primera ejecución de pruebas detectó que faltaba este archivo obligatorio. Se añadió antes de repetir los controles. Las pruebas usan copias temporales del harness para alterar archivos y controles sin modificar el proyecto.

## Decisiones pendientes del producto

Framework, servicios AWS, región, restricción a @gmail.com y umbrales numéricos de cuotas requieren resolución antes de implementar. El diseño documenta Google como único proveedor y la limitación de identificar físicamente dispositivos desde un navegador.

## Límite de la evidencia

La auditoría evalúa estructura. Las pruebas evalúan el verificador y el seguimiento. La seguridad de la aplicación y sus proveedores deberá demostrarse cuando se implementen. La integridad local requiere revisión de la autorización en la conversación y no impide reescrituras coordinadas por quien dispone de acceso al filesystem.

## Implementación local — 2026-11-16 (America/Mexico_City)

Entorno: Windows, Node 24.21.0, Next 16.4.6, Supabase CLI 2.117.0, PostgreSQL 17 en Docker 29.1.3, Microsoft Edge sin ventana. Solo datos sintéticos.

- `node harness/verify.mjs --product` — salida 0: lint, typecheck, build, 3 pruebas unitarias, 57 comprobaciones pgTAP y flujo de navegador.
- `supabase db reset --local --no-seed --yes` y `supabase test db --local` — reconstrucción limpia de ambas migraciones; primera suite 52/52, ampliada luego a 57/57 mediante el control de producto. No se ejecutó un reset remoto.
- `supabase db advisors --local --type all --level warn --fail-on warn` — salida 0, sin hallazgos. `supabase migration list --local` — ambas migraciones aplicadas en local. La etiqueta remote que imprime el CLI representa aquí el extremo local seleccionado con --local.
- `node --test harness/verify.test.mjs` — 8/8 tras corregir el fixture y añadir prueba de control satisfactorio.
- `npm --prefix web run test:browser` — rutas anónimas, callback cancelado, crear/renombrar, añadir integrantes, invitación pendiente, UI miembro, rechazo de borrado por RPC, selector persistente, navegación, revocación con el mismo JWT, borrado y logout. Layout inspeccionado en capturas 1440px y 390px, sin desbordamiento horizontal.
- SQL real: RLS y privilegios en dos grupos; propietarios/miembros/ajenos/anónimos; rollback de creación inválida; unicidad; correo verificado; metadata falsificada; denegación de cambio de propietario y altas directas; revocación y sesión eliminada; borrado en cascada; RPC invoker y esquema privado. CRUD compartido ejercitado en tabla sintética temporal que no se instala como endpoint clínico.
- `git diff --check` — sin errores de whitespace. Inspección de diff y archivos nuevos, ACL explícitas, rutas y políticas completada.

### Incidencias resueltas

- El fixture del harness asumía controles vacíos: corrección autorizada por separado.
- db query no acepta el lote SQL multisentencia: se usó psql dentro del contenedor local.
- db pull generó la migración inicial; ambos motores ignoraron después el cambio del cuerpo de actor(). Se creó session_guard mediante migration new y se comprobó reconstruyendo la base desde cero.
- Cuentas Auth insertadas manualmente tenían confirmation_token nulo: fixtures de navegador usan ahora admin.createUser exclusivamente en local y sin enviar correos.
- Next dev generó web/AGENTS.md automáticamente; se retiró ese efecto no solicitado y se deshabilitó agentRules. La referencia final conserva únicamente los archivos de instrucciones autorizados.

### Alcance de aprobación y archivos del harness

Lote literal: “Apruebo el lote de cambios del harness y las decisiones propuestas para la implementación local”. Modificados: harness/project.md, feature_list.json, harness/checks.json, progress.md, session-handoff.md, harness/evidence.md, harness/approvals.json y harness/integrity.json; pruebas añadidas en web/tests/ y supabase/tests/. Permiso adicional “Sí, autorizo esa corrección y su registro”: harness/verify.test.mjs, aprobación e integridad. No se modificaron AGENTS.md raíz, harness/governance.md ni harness/verify.mjs.

### Pendiente y límite de evidencia

No se probó el consentimiento real de Google, su callback exitoso ni la renovación real de sesión. El proveedor Google local permanece deshabilitado hasta aportar sus variables; el test firmado local no sustituye esa prueba. foundation sigue in-progress. No se modificó el proyecto Supabase remoto, no hubo despliegue AWS ni gastos de infraestructura. Agenda/expedientes y cuotas clínicas aún no implementados.

## Limpieza y cierre de sesión — 2026-11-16 (America/Mexico_City)

- Autorización: petición del usuario de comprobar limpieza, hacer ajustes mínimos y terminar sesión; continúa el lote explícito para estado y pruebas. Registro 2026-11-16-session-cleanup.
- Ajuste funcional mínimo: una aserción en supabase/tests/clinics.test.sql contaba todos los consultorios de la base. Ahora comprueba por ID su segundo consultorio de fixture. Esto elimina una falsa dependencia de una base vacía y evita necesitar resets.
- Estado conciliado: Google ya habilitado tanto en supabase/config.toml como en /auth/v1/settings; .env raíz presente y excluido de Git. Se actualizó la descripción obsoleta del proveedor deshabilitado. No se mostraron ni copiaron credenciales.
- node harness/verify.mjs --product: salida 0; lint, tipos, build, 3 pruebas unitarias, 57 comprobaciones pgTAP y navegador completos. Entorno Windows/Node 24.21.0/Postgres 17 local/Edge headless.
- node --test harness/verify.test.mjs: 8/8. node harness/verify.mjs: 79 archivos íntegros.
- supabase db advisors --local --type all --level warn --fail-on warn: salida 0, sin hallazgos. supabase migration list --local: ambas migraciones aplicadas.
- Git: sin conflictos ni errores de whitespace, dependencias coincidentes con lockfile. Cero .env privados entre archivos versionados/candidatos. Revisión limitada de patrones de claves/JWT en código, SQL y harness sin coincidencias; no equivale a una auditoría exhaustiva de secretos.
- Datos: un consultorio local antes y después. Usuarios sintéticos de las pruebas retirados; ningún reset ni migración remota durante el cierre.
- Cambios de cierre: supabase/tests/clinics.test.sql, harness/project.md, harness/approvals.json, harness/evidence.md, harness/integrity.json, progress.md, feature_list.json y session-handoff.md. Sin nuevas reglas o comandos de verificación.
- Pendiente conservado: OAuth Google real completo no verificado por el agente; foundation continúa in-progress. Trabajo local sin commit, con archivos nuevos legítimos que deben conservarse. Sesión terminada.
