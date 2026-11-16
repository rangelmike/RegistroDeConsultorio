# Contrato del proyecto

## Fase y decisiones

Aplicación pendiente de autorización. Supabase y AWS son requisitos. Framework, servicios AWS, región y mecanismo concreto de cuotas se decidirán antes de implementarlos. Objetivo económico de planes gratuitos con límites verificados al configurar proveedores.

Se interpreta Gmail como inicio con Google. Confirmar antes de implementar si se exige además dominio @gmail.com, pues Google admite cuentas con otros dominios.

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
