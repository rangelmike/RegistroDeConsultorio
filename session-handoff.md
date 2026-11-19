# Relevo

## Intervención remota de Expedientes — 18 de noviembre de 2026

El usuario desplegó por GitHub en https://main.d2yobiyz2ic5av.amplifyapp.com y autorizó aplicar las tres migraciones existentes pendientes. Ya están aplicadas en el proyecto Supabase que coincide con la configuración del deploy: cuotas, expedientes y contabilización de cuotas. La API ya reconoce dental_operation.

Se verificaron solo catálogo, permisos, historial y respuesta anónima. Para continuar, comprobar con la sesión del usuario que la consulta y las altas/importaciones funcionan desde producción. No dar por realizado ese recorrido. Los advisors solo informaron auth_leaked_password_protection, aviso global de Auth; se mantiene Google como único proveedor de producto.

La autorización puntual está en harness/approvals.json, registro 2026-11-18-production-records-migrations. Los detalles están en harness/evidence.md. No volver a aplicar manualmente los SQL que ya constan en el historial.

## Cierre estable autorizado — 18 de noviembre de 2026

El producto local pasó todos los controles registrados tras regenerar la caché de compilación. Este cierre incluye los ajustes posteriores y la simplificación de expedientes. El commit local de cierre permite recuperar el estado verificado.

Comportamiento actual: fechas visibles y editables dd/mm/yyyy con Hoy, JSON yyyy-mm-dd, consulta y edición, vista de lectura con datos generales/dentales/pagos, selección entre páginas, restas calculadas e importación de exactamente un expediente que abre Ver expediente.

Google permanece pendiente por elección expresa del usuario. Se llegó a la pantalla real de Google, sin completar credenciales, consentimiento, callback ni renovación. Foundation conserva blocked. Para verificarlo más adelante se necesita la participación del usuario en una pestaña dedicada.

Ejecutar node harness/verify.mjs al comenzar. Los controles de cierre son node harness/verify.mjs --product y node --test harness/verify.test.mjs. Antes de compilar en Windows, detener el servidor Next de este checkout si mantiene archivos bloqueados. La caché web/.next se puede regenerar. Conservar datos y secretos locales.

## Registro anterior

## Estado del 18 de noviembre de 2026

Expedientes disponible en /panel/expedientes al seleccionar un consultorio. Cuotas y CRUD con intercambio JSON verificados en local. El acceso real de Google alcanzó accounts.google.com sin filtro de dominio. Falta observar consentimiento, retorno al panel y renovación reales para cerrar foundation.

## Archivos

- web/app/panel/expedientes/ contiene las secciones de consulta y creación, el formulario clínico y la ruta POST.
- web/lib/dental-record.ts define los campos de los tres formatos. web/lib/record-file.ts prepara los archivos individuales y múltiples.
- supabase/migrations/ conserva las cinco migraciones aplicadas a la base local existente. Las tres últimas añaden cuotas, expedientes y contabilización de operaciones rechazadas.
- supabase/tests/ y web/tests/ cubren base real, concurrencia y navegador. Los registros y cuentas de las pruebas son sintéticos.

## Continuación

Ejecutar node harness/verify.mjs. Para usar el entorno, iniciar Supabase local si hace falta y ejecutar npm --prefix web run dev:local. Acceder por http://127.0.0.1:3000. Para repetir el cierre local ejecutar node harness/verify.mjs --product y node --test harness/verify.test.mjs.

Completar la comprobación interactiva de Google con una cuenta elegida por el usuario. No registrar identificadores personales, códigos ni tokens en la evidencia. Los secretos locales permanecen en sus archivos excluidos de Git. Conservar la base existente. Las autorizaciones de este lote cubren únicamente el entorno local.
