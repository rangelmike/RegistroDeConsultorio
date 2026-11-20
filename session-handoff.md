# Relevo

## Abonos por movimiento — 20 de noviembre de 2026

payment-installments done local. Modelo PaymentMovement con abonos opcionales (fecha y cantidad), cálculos compartidos en paymentTotals y validación ampliada de valid_dental_record. La migración 20261120215020_payment_installments.sql debe publicarse con el código cuando se solicite producción; está aplicada solo en local. No crea nuevas tablas ni cambia cuotas/permisos. Límite de 100 abonos por movimiento y 40000 bytes por expediente. Guardar cambios persiste los abonos; lectura los muestra dentro del tratamiento y el JSON los conserva. --product pasó todas las pruebas, incluidas 169 pgTAP, concurrencia y navegador. Aprobación 2026-11-20-payment-installments. Conservar los cambios locales previos de odontograma y orden de pagos.


## Odontograma vectorial — 20 de noviembre de 2026

Implementación local terminada y verificada: vector-odontogram done. Antes de continuar ejecutar node harness/verify.mjs y contrastar el diff. Autorización y evidencia: 2026-11-20-vector-odontogram; lote de siete archivos aprobado expresamente.

El editor y la vista dental usan OdontogramCanvas con la plantilla estática web/public/odontograma-v1.jpg. Los trazos viven en clinic_private.odontogram_drawings, separados del JSON clínico. Se guardan junto con el expediente mediante dental_operation y su revisión; no se altera el intercambio JSON. Se conservaron los campos por pieza. Límite 500 trazos, 10000 puntos y 256 KiB.

20261120192720_vector_odontogram.sql está aplicada solo en local. Se comprobó también su reproducción completa con rollback, sin reset. node harness/verify.mjs --product pasó lint, tipos, build, 6 pruebas unitarias, 159 pgTAP, concurrencia y navegador con herramientas, persistencia al recargar y regresiones completas. Harness 8/8, integridad 82 archivos y advisors locales sin hallazgos. Los eventos de lápiz/tacto son nativos de navegador simulados, sin dispositivo físico.

No hubo commit, push ni migración remota. Al solicitar producción, aplicar también esta migración y seguir el procedimiento existente. Mantener pendiente la prueba real de Google por elección anterior del usuario. No modificar ni consumir autorizaciones de otros trabajos.

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
