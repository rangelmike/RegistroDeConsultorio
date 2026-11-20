# Decisiones de diseño de la app

## Uso para agentes

Leer este archivo antes de proponer o implementar cambios visuales. Contiene decisiones duraderas que dan coherencia al diseño entre sesiones. Contrastar siempre el estado documentado con los archivos reales: una decisión aprobada puede seguir pendiente de implementación.

Registrar únicamente cambios significativos que afecten la identidad o varias pantallas: tema general, paleta principal, sistema tipográfico, estilo visual o principios de composición. No registrar retoques locales como el color de un botón, el tamaño de un área, márgenes o correcciones puntuales.

Antes de editar, comprobar que la autorización cubre este archivo y los registros de aprobación e integridad; aplicar `harness/governance.md`. Mantener entradas breves y cronológicas con identificador, fecha, estado, decisión, motivo, alcance y referencia a la petición real. Usar estados propuesta, aprobada pendiente, aplicada o sustituida. No presentar propuestas como implementadas ni inferir aprobación del silencio.

Cuando cambie una decisión importante, añadir una nueva entrada y señalar la anterior como sustituida, enlazando ambos identificadores. Conservar el historial y verificar la implementación antes de marcar una decisión aplicada. Los ajustes menores se revisan en el diff y no necesitan una entrada aquí. Este registro no autoriza cambios funcionales ni de backend.

## DIS-001 — Identidad dental en morados y lilas

- Fecha: 2026-11-20.
- Estado: aplicada y verificada en escritorio y móvil.
- Decisión: diseñar una identidad visual para un consultorio dental con morados y lilas como colores principales. Mantener una interfaz llamativa, intuitiva, legible y fácil de usar, siguiendo la skill `frontend-design`.
- Motivo: petición explícita del usuario para rediseñar toda la app con una dirección visual coherente con el consultorio.
- Alcance: presentación de acceso, navegación, agenda, expedientes y consultorios. Preservar funcionalidad, backend y paths existentes. La elección concreta de tonos, tipografía y composición se documentará cuando constituya una decisión significativa dentro del alcance aprobado.
- Referencia: mensaje del usuario en este chat que comienza con «No cambies absolutamente nada sobre el backend ni funcionalidad del proyecto» y solicita tonos de morado/lila y el uso de `frontend-design`.

## DIS-002 — Móvil como vista prioritaria

- Fecha: 2026-11-20.
- Estado: aplicada y verificada mediante recorridos de navegador y capturas en escritorio y móvil.
- Decisión: diseñar primero para pantallas móviles. Mantener navegación y acciones legibles, controles táctiles amplios, formularios en una columna y calendario utilizable sin reducir el texto hasta hacerlo ilegible. La vista de escritorio adapta esta base a mayor espacio.
- Motivo: el usuario declaró la vista móvil como prioridad fuerte y señaló un fallo concreto de contraste en el botón Menú.
- Alcance: acceso, menú del panel, consultorios, agenda y expedientes. La identidad verbal visible pasa a «Expedientes y agenda virtual».
- Referencia: mensaje del usuario en este chat que comienza con «Optimiza el diseño para la vista en móvil».
