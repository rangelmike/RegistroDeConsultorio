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
