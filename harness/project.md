# Contrato del proyecto

## Despliegue completo a producción

Cuando el usuario solicite un push o despliegue a producción, completar la publicación de todas las piezas necesarias del cambio autorizado y verificar su resultado.

1. Revisar el diff completo, incluidos archivos nuevos, y determinar qué debe publicarse. Confirmar repositorio, rama de producción, commit, aplicación Amplify y proyecto Supabase de destino. Incluir los archivos necesarios para reproducir la versión y mantener secretos, datos clínicos y artefactos temporales fuera de Git.
2. Identificar las dependencias del cambio ya implementado. Además del código, comprobar las migraciones de Supabase pendientes y, cuando corresponda, variables de entorno, configuración de autenticación, funciones y otros componentes existentes que requieran publicación o actualización para esa versión. Cada componente debe corresponder al mismo entorno de producción.
3. Ejecutar los controles aplicables registrados y revisar la previsualización de migraciones contra el destino remoto. Ordenar las operaciones para mantener compatible la versión activa. Aplicar las migraciones aditivas necesarias antes del push que dispara Amplify cuando el nuevo código dependa de ellas. Coordinar los cambios incompatibles según el alcance aprobado.
4. Dentro de la autorización del despliegue solicitado, aplicar las migraciones y actualizaciones de configuración necesarias, publicar todos los archivos del cambio mediante Git y completar los demás pasos de publicación identificados. Comprobar el historial remoto de migraciones y las respuestas de cada servicio. Un error deja pendientes los pasos dependientes hasta resolverlo.
5. Esperar a que Amplify termine el despliegue del commit previsto y comprobar la aplicación publicada por sus puntos de entrada normales, incluidas las funciones afectadas y su conexión con Supabase. Una prueba local acredita el entorno local. Registrar por separado las comprobaciones de producción y cualquier bloqueo de acceso o verificación.
6. Cerrar con evidencia del commit publicado, resultado de Amplify, migraciones aplicadas o ausencia de pendientes, demás componentes actualizados y pruebas de producción. Mantener explícito cualquier paso pendiente y conservar una vía de recuperación compatible con la base.

El alcance de este flujo se limita a desplegar lo ya implementado y aprobado. Conservar código, funcionalidad, dependencias, estructura e infraestructura del proyecto al ejecutar la publicación. Cualquier desarrollo, nueva automatización, recurso o cambio de producto que resulte necesario requiere su propia solicitud o autorización de alcance. Esta instrucción documenta el flujo para futuros despliegues.

## Incidencia de Expedientes en producción — 18 de noviembre de 2026

- El usuario desplegó la aplicación mediante GitHub y AWS Amplify en https://main.d2yobiyz2ic5av.amplifyapp.com. Los archivos públicos del despliegue coinciden con el proyecto Supabase configurado y enlazado.
- Se autoriza una intervención puntual para aplicar exclusivamente las tres migraciones existentes de cuotas, expedientes y contabilización de cuotas, pendientes según previsualización remota. Se conserva el contenido existente y se verifican función, historial y advisors.
- La autorización y evidencia se registran con el identificador 2026-11-18-production-records-migrations. El estado general de preparación AWS y la comprobación completa de Google conservan sus criterios pendientes.

## Expedientes locales (18 de noviembre de 2026)

- Ajustes finales autorizados: preguntas en historia médica, antecedentes predeterminados en Sin antecedente y tejidos en Normal, sección independiente de firmas retirada del formulario con compatibilidad de datos previos. La firma de movimientos permanece.
- Las restas se calculan a partir de costo y anticipo por movimiento y en el resumen. Fechas visibles y editables en dd/mm/yyyy con botón Hoy; persistencia e intercambio JSON en yyyy-mm-dd.
- Ver expediente presenta datos generales, datos dentales y pagos. Importar exactamente un expediente abre esta vista con los datos recuperados del servidor; un lote múltiple regresa a la consulta.
- Simplificación verificada: definición única de valores predeterminados, carga compartida para ver/editar y filtro único de secciones. Conservar el comportamiento al modificar estos componentes.

- La prueba interactiva pendiente de Google se conserva en foundation. Avanzar primero con cuotas sobre la base local comprobada y después con expedientes y su intercambio JSON. Continúa una sola fase activa.
- Límites por minuto (lecturas/escrituras): dispositivo 120/60, usuario 240/120, consultorio 1200/600. Ráfaga por dispositivo de 60/50 cada diez segundos. Dos operaciones simultáneas por usuario y diez por consultorio. El dispositivo corresponde a la sesión asignada por Auth y validada en servidor. Volver a autenticarse puede rotarlo; los límites de usuario y consultorio son compartidos.
- Un lote admite 50 expedientes y 2 MiB. Cada expediente consume cuota. Valores locales aprobados para un consultorio pequeño. Verificar consumo y plan en la fase de despliegue.
- Alta manual o JSON versionado, consulta por nombre, edición, selección y eliminación con confirmación, exportación reimportable. Solo nombre y teléfono obligatorios. Los campos opcionales reproducen la historia clínica dental, exploración, odontogramas, presupuesto y estado de cuenta. Probar en navegador el ciclo completo individual y múltiple.

## Fase y decisiones

Base local autorizada el 16 de noviembre de 2026: Next.js y TypeScript, Supabase para autenticación y datos. AWS permanece como destino futuro; servicios y región se decidirán en la fase aws. Las cuotas clínicas y sus valores se decidirán en la fase quotas, antes de habilitar datos clínicos. Objetivo económico de planes gratuitos con límites verificados al configurar proveedores.

Se admite cualquier cuenta de Google con correo verificado, sin restricción a @gmail.com.

## Autenticación y navegación

- Página principal con única opción Google mediante Supabase Auth. Deshabilitar contraseña, magic link, OTP, teléfono, anónimos y demás proveedores.
- Scopes mínimos de identidad. Callbacks y redirecciones autorizadas exactas. Validar sesión/token en servidor con firma, emisor, audiencia y expiración según el flujo elegido.
- Redirigir a ruta interna autorizada después del login. Validar destinos returnTo. Cubrir entrada directa, sesión expirada, cancelación y logout.
- Exigir membresía vigente y rol en cada operación sobre expedientes. La autenticación por sí sola no otorga membresía.

## Supabase y datos sensibles

- RLS y privilegios mínimos, denegación por defecto, aislamiento por grupo/consultorio en SELECT, INSERT, UPDATE y DELETE. Validar tanto filas existentes como valores nuevos.
- Vincular pacientes, expedientes y citas al grupo. Impedir referencias cruzadas. Identidad estable por ID autenticado, invitaciones vinculadas al correo verificado y gestión de miembros exclusiva de roles autorizados.
- Revocar acceso en consultas posteriores incluso con sesión activa. Probar dos grupos, distintos roles, usuario sin membresía y sesión anónima.
- Revisar vistas, RPC, funciones SECURITY DEFINER, Storage, Realtime y tareas administrativas. Fijar search_path y permisos EXECUTE mínimos en funciones privilegiadas.
- Secretos y service_role solo en servidor. Preferir identidad del usuario y RLS en operaciones ordinarias. Toda operación privilegiada requiere autorización por actor/grupo y pruebas explícitas.
- Consultas parametrizadas, validación de tipos/tamaños en servidor, columnas mínimas, paginación, índices, timeouts y límites de resultados.
- HTTPS, archivos privados y descargas autorizadas. Evitar datos clínicos en URLs, logs, analítica, errores y cachés públicas. Auditar actor, operación, entidad y fecha sin copiar contenido clínico.

## Protección de consumo por dispositivo

- Punto de control obligatorio del lado servidor antes de consultas y escrituras clínicas. Identidad de dispositivo emitida y validada por servidor, asociada al usuario. Añadir cuotas agregadas por usuario y grupo, con IP como señal complementaria.
- Un navegador puede borrar cookies o usar incógnito. Definir dispositivo como instalación/sesión identificada, documentar esta limitación y probar reinicio/rotación. Un ID libre del cliente, localStorage o debounce solos no satisfacen el requisito.
- Llamadas directas a REST, RPC, GraphQL, Realtime y Storage deben pasar controles equivalentes o estar deshabilitadas. Si se usa pasarela, cerrar el acceso alternativo al origen clínico conservando autorización por usuario/grupo.
- Contadores compartidos y atómicos entre instancias, ventanas y expiración. Considerar concurrencia, reintentos e importación/exportación. Contabilizar trabajo real en lotes.
- Responder 429 y Retry-After al agotar cuota. Si el limitador falla, rechazar operaciones protegidas de forma controlada. Evitar consultar reiteradamente la base tras agotar el límite.
- Antes de implementar, aprobar y registrar valores de lecturas, escrituras, ráfagas, filas por lote, carga máxima, concurrencia y cuotas agregadas. Justificarlos con uso esperado y plan vigente. Están pendientes de definición.
- Usar búsquedas con debounce, cancelación, paginación y reintentos acotados. Caché privada aislada y monitoreo agregado. Los límites de Supabase Auth aplican a autenticación y requieren complementarse para consultas clínicas.

## Funciones originales

- Pacientes, expedientes, agenda y grupos por correo siguen dentro del plan.
- Importar JSON versionado con validación de servidor, límites, vista previa sin escritura, política de duplicados e IDs externos. Transacciones o lotes idempotentes recuperables y errores por registro.
- Exportar solo el grupo autorizado. Respaldos administrativos restringidos, restauración probada y copia separada de adjuntos.
- Citas con zona horaria definida y reglas explícitas de solapamiento probadas bajo concurrencia.

## AWS y preparación futura

- Documentar cuentas, regiones, OAuth, variables públicas/secretas, servicios y cuotas antes de aprovisionar.
- Deploy AWS con HTTPS, IAM mínimo, rollback y origen privado donde corresponda. Definir dónde operan cuotas y autorización de servidor.
- Verificar gratuidad, vencimiento y consumo facturable. Alertas de presupuesto avisan y no garantizan detener cargos. Pedir decisión ante costos necesarios.
- Desarrollo y pruebas con datos sintéticos. Antes de producción, acordar retención, respaldo, recuperación y requisitos aplicables con el responsable del consultorio.

## Referencias

Confirmar versiones al implementar.

- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Protección de APIs](https://supabase.com/docs/guides/api/securing-your-api)
- [Límites de Auth](https://supabase.com/docs/guides/auth/rate-limits)

## Base local y consultorios (lote autorizado 2026-11-16)

- Una función foundation agrupa base, autenticación y aislamiento local, antes separados en foundation/auth/isolation. Una sola función activa. La verificación real de Google queda pendiente si faltan credenciales o interacción del usuario; no se sustituye por mocks ni se marca done.
- Inicio exclusivo para Google; navegación autenticada con Agenda, Expedientes y Consultorios. Agenda y Expedientes son páginas de estado vacío, sin operaciones clínicas hasta sus fases y cuotas. Selector arriba a la izquierda; selección no concede permisos.
- Cada consultorio es un espacio lógico en una misma base Postgres; eliminación transaccional con cascada de sus datos asociados. No se aprovisiona una base o proyecto por consultorio.
- Creador propietario y miembro automático. Solo el propietario cambia nombre, gestiona integrantes o elimina el consultorio. No puede expulsarse ni transferir propiedad en esta fase. Miembros comparten permisos CRUD sobre futuros datos del consultorio, sujetos a cuotas clínicas antes de habilitarlos.
- Correos verificados de Google: altas para cuentas existentes y reservas pendientes para quienes aún no se registran, vinculadas al autenticarse. No se envían emails en esta fase. Revocación consultada en base, no en claims de membresía cacheados.
- RPC de escritura transaccionales; funciones privilegiadas en esquema privado, search_path fijo, identidad y permisos comprobados dentro de cada operación. Acceso anónimo y DML directo denegados. Sin endpoints clínicos, Storage ni publicaciones Realtime para estas tablas.
- Pruebas en Postgres local real con datos sintéticos: dos consultorios, propietario, miembro, ajeno, anónimo, invitaciones, cambios de pertenencia, borrado y llamadas directas. Revisar permisos, RLS y advisors.
- Controles: lint, typecheck, build, pruebas unitarias, base real y navegación local. Docker y CLI pueden requerir ejecución fuera del sandbox; nunca destinos remotos.

## Operación local de esta base

- CLI verificado: 2.117.0; Postgres 17 en Docker. Ejecutar los comandos de esta sección desde la raíz del repositorio. Los comandos de base deben llevar `--local`. Abrir Docker Desktop y esperar a que su motor esté listo antes de iniciar Supabase.

### Preparar e iniciar en PowerShell

Entrar al repositorio y comprobar el harness al comenzar la sesión.

```powershell
cd "C:\Users\migue\OneDrive\Documentos\Programming\WebPages\ConsultorioRegistro"
node harness/verify.mjs
```

`./init.ps1` y `bash init.sh` también ejecutan esa verificación del harness. El arranque de los servicios se realiza con los comandos siguientes.

En una copia recién obtenida, o cuando cambie el lockfile, instalar las dependencias exactas de la aplicación.

```powershell
npm --prefix web ci
```

Comprobar que el motor Docker responde e iniciar los contenedores locales que utiliza el proyecto. Supabase CLI administra estos contenedores.

```powershell
docker info --format '{{.ServerVersion}}'
supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

Si se recibieron nuevas migraciones, aplicar las pendientes a la base local antes de probar el nuevo código.

```powershell
supabase migration up --local
```

Iniciar Next.js y mantener esta terminal abierta mientras se use la aplicación.

```powershell
npm --prefix web run dev:local
```

Abrir http://127.0.0.1:3000, o el puerto que indique Next si 3000 está ocupado. El comando dev:local lee la URL y clave publicable de Supabase local en memoria y preserva web/.env.local. El comando `npm --prefix web run dev` utiliza la configuración habitual del usuario.

### Comprobar servicios y detenerlos

Ver los contenedores del proyecto y los procesos de Next.js con sus identificadores.

```powershell
docker ps --filter name=ConsultorioRegistro --format 'table {{.Names}}\t{{.Status}}'
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'next' } |
  Select-Object ProcessId, ParentProcessId, CommandLine |
  Format-List
```

Next puede crear varios procesos para un mismo servidor. Para detenerlo, presionar Ctrl+C en la terminal donde se inició. Después detener los servicios locales de Supabase desde la raíz del repositorio.

```powershell
supabase stop
```

Este comando conserva los datos locales para el siguiente inicio. La opción `--no-backup` elimina los volúmenes de datos. Para reanudar, repetir el inicio de Docker, Supabase y Next.js. La base local y la base de producción tienen datos e historiales independientes.

### Comprobaciones completas

Con Docker y Supabase local disponibles, los controles registrados del producto y las pruebas del harness se ejecutan así.

```powershell
node harness/verify.mjs --product
node --test harness/verify.test.mjs
```

Detener el servidor Next de este checkout antes de compilar si mantiene archivos de caché bloqueados en Windows.

### Configuración y datos locales

- Historial canónico: supabase/migrations/. `supabase db reset --local --no-seed` reconstruye la base local y borra sus datos; usar solo en el entorno de pruebas de esta tarea.
- Google local está habilitado en supabase/config.toml y confirmado en /auth/v1/settings al cierre del 2026-11-16. Las variables SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID y SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET se mantienen en el .env de la raíz para Supabase CLI; web/.env.local corresponde a Next.js. Ambos archivos están excluidos de Git. El consentimiento y la renovación reales de Google aún no han sido verificados por el agente. Callback de Google: http://127.0.0.1:54321/auth/v1/callback; retorno de la aplicación: http://127.0.0.1:3000/auth/callback o http://localhost:3000/auth/callback. Reiniciar la pila local después de configurarlo. Ningún otro proveedor se habilita para uso de producto.
- La autorización de datos exige sesión OAuth vigente en auth.sessions, identidad Google y correo verificado mantenidos por Auth. No basta con editar metadata ni conservar un JWT tras cerrar sesión. El test de navegador usa una sesión OAuth sintética firmada únicamente con la clave local, en memoria; no acredita el consentimiento real de Google.
- Límites administrativos: nombre de 1–100 caracteres, 50 correos por operación, 100 integrantes por consultorio y 20 consultorios creados por usuario. Son validaciones de tamaño del módulo; no sustituyen las cuotas clínicas pendientes.
- Auditoría privada: actor, consultorio, operación, entidad y fecha; sin nombres, correos ni contenido clínico. Los identificadores de auditoría permanecen tras borrar el consultorio. Retención de producción pendiente en aws.
- Pruebas requieren Node 24, Docker, Supabase CLI y Microsoft Edge en Windows. Los fixtures son sintéticos, las pruebas SQL usan rollback y las de navegador eliminan sus cuentas y consultorios. Las capturas en .local/ están ignoradas por Git.
