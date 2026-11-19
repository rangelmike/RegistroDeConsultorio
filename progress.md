# Progreso

## Incidencia de producción resuelta en base — 18 de noviembre de 2026

- El usuario desplegó mediante Amplify. La API fallaba con PGRST202 porque faltaban tres migraciones remotas. Se aplicaron las tres tras aprobación explícita 2026-11-18-production-records-migrations.
- Cuotas, expedientes y contabilización de cuotas constan en el historial de producción. Función, tablas, permiso autenticado y bloqueo anónimo verificados por catálogo. La API pasó de función ausente a rechazo anónimo correcto, HTTP 401/42501.
- Advisors remotos: un aviso global de protección de contraseñas filtradas de Auth, sin avisos de las nuevas tablas o funciones. La autenticación de producto es Google.
- Pendiente comprobar consulta, creación e importación desde una sesión real de usuario en la aplicación desplegada. Los controles locales previos siguen documentados. La intervención no cierra los criterios generales de AWS ni la prueba completa de Google.

## Cierre estable de la sesión — 18 de noviembre de 2026

- Todos los ajustes finales de expedientes y la simplificación están implementados y verificados. Fechas dd/mm/yyyy con Hoy, vista de lectura en tres secciones, importación individual que abre Ver expediente, preguntas médicas, valores predeterminados y restas calculadas.
- node harness/verify.mjs --product pasó después de detener el servidor de desarrollo y regenerar web/.next, que tenía un archivo bloqueado. Pasaron lint, tipos, build, 5 pruebas unitarias, 95 comprobaciones SQL, concurrencia y Edge. Las 8 pruebas del harness también pasaron.
- supabase db advisors --local --fail-on warn no reportó hallazgos. Las cinco migraciones constan en la base local. git diff --check pasó.
- Google real permanece pendiente por elección explícita del usuario: Prefiero dejar Google pendiente. Se observó la pantalla real del proveedor en la pestaña integrada. Foundation continúa blocked. Las pruebas automáticas emplean sesiones sintéticas locales.
- Cierre y commit local autorizados mediante el mensaje Tienes autorización para resolver los pendientes para dejar el proyecto en un estado estable. Registro 2026-11-18-stable-session-close en harness/approvals.json.

## Registro previo de la sesión

## Estado del 18 de noviembre de 2026

- Expedientes y cuotas locales implementados y verificados. Consulta por nombre, edición, odontogramas, evolución y cuenta, selección entre páginas, eliminación y JSON individual o múltiple. Nombre y teléfono son los únicos campos clínicos obligatorios.
- Los archivos JSON incluyen versión e identificadores portables. La vista previa consulta duplicados y valida el esquema. Reimportar un expediente idéntico lo omite. Un conflicto cancela el lote. La edición comprueba la revisión para impedir sobrescribir cambios concurrentes.
- Sesión real de Google iniciada hasta la pantalla del proveedor. La aplicación admite identidades Google con correo verificado de cualquier dominio. Consentimiento, retorno y renovación reales pendientes. Foundation conserva el estado bloqueado.
- El intercambio JSON forma parte de records. El respaldo administrativo, los adjuntos y la restauración ampliada siguen en portability. Agenda y despliegue quedan pendientes.

## Evidencia

Windows, Node 24, Supabase y PostgreSQL 17 locales, Edge. El control de producto pasó lint, tipos, build, 5 pruebas unitarias, 95 comprobaciones SQL, concurrencia con conexiones independientes y pruebas de navegador con datos sintéticos. Las cinco migraciones constan en el historial local. Los advisors locales informaron cero hallazgos.

Lote autorizado en la conversación del 18 de noviembre y registrado en harness/approvals.json. Detalles reproducibles en harness/evidence.md.
