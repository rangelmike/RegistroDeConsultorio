# Contrato del proyecto

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

- CLI verificado: 2.117.0; Postgres 17 en Docker. `supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor` desde la raíz inicia el entorno de pruebas. Los comandos de base deben llevar `--local`.
- `npm --prefix web run dev:local` lee la URL y clave publicable locales en memoria y arranca Next.js, preservando web/.env.local existente. `npm --prefix web run dev` sigue usando la configuración habitual del usuario.
- Historial canónico: supabase/migrations/. `supabase db reset --local --no-seed` reconstruye la base local y borra sus datos; usar solo en el entorno de pruebas de esta tarea.
- Google local está habilitado en supabase/config.toml y confirmado en /auth/v1/settings al cierre del 2026-11-16. Las variables SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID y SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET se mantienen en el .env de la raíz para Supabase CLI; web/.env.local corresponde a Next.js. Ambos archivos están excluidos de Git. El consentimiento y la renovación reales de Google aún no han sido verificados por el agente. Callback de Google: http://127.0.0.1:54321/auth/v1/callback; retorno de la aplicación: http://127.0.0.1:3000/auth/callback o http://localhost:3000/auth/callback. Reiniciar la pila local después de configurarlo. Ningún otro proveedor se habilita para uso de producto.
- La autorización de datos exige sesión OAuth vigente en auth.sessions, identidad Google y correo verificado mantenidos por Auth. No basta con editar metadata ni conservar un JWT tras cerrar sesión. El test de navegador usa una sesión OAuth sintética firmada únicamente con la clave local, en memoria; no acredita el consentimiento real de Google.
- Límites administrativos: nombre de 1–100 caracteres, 50 correos por operación, 100 integrantes por consultorio y 20 consultorios creados por usuario. Son validaciones de tamaño del módulo; no sustituyen las cuotas clínicas pendientes.
- Auditoría privada: actor, consultorio, operación, entidad y fecha; sin nombres, correos ni contenido clínico. Los identificadores de auditoría permanecen tras borrar el consultorio. Retención de producción pendiente en aws.
- Pruebas requieren Node 24, Docker, Supabase CLI y Microsoft Edge en Windows. Los fixtures son sintéticos, las pruebas SQL usan rollback y las de navegador eliminan sus cuentas y consultorios. Las capturas en .local/ están ignoradas por Git.
