# Requirements Document

## Introduction

El sistema de betting actual está deshabilitado y presenta múltiples problemas de arquitectura. Se requiere implementar un sistema completo de apuestas para el juego de Blackjack multiplayer que incluya gestión de balance, validación de apuestas, cálculo de pagos y persistencia de datos entre rondas. El sistema debe ser robusto, seguro y proporcionar una experiencia de usuario fluida tanto en frontend como backend.

## Requirements

### Requirement 1: Balance Management System

**User Story:** Como jugador, quiero tener un balance persistente que se mantenga durante toda mi sesión de juego, para poder realizar apuestas y recibir ganancias de manera consistente.

#### Acceptance Criteria

1. WHEN un jugador se une a una sala THEN el sistema SHALL asignar un balance inicial de 1000 chips
2. WHEN un jugador realiza una apuesta THEN el sistema SHALL deducir el monto apostado de su balance disponible
3. WHEN un jugador gana una ronda THEN el sistema SHALL añadir las ganancias a su balance actual
4. WHEN un jugador pierde una ronda THEN el sistema SHALL mantener el balance sin la apuesta perdida
5. WHEN una nueva ronda comienza THEN el sistema SHALL preservar el balance actual del jugador
6. IF un jugador se desconecta y reconecta THEN el sistema SHALL mantener su balance durante la sesión activa
7. WHEN el balance de un jugador llega a 0 THEN el sistema SHALL permitir continuar como espectador pero no apostar

### Requirement 2: Betting Phase Implementation

**User Story:** Como jugador, quiero poder realizar apuestas antes de que se repartan las cartas, para poder participar activamente en el juego con riesgo financiero.

#### Acceptance Criteria

1. WHEN una nueva ronda comienza THEN el sistema SHALL iniciar una fase de apuestas de 30 segundos
2. WHEN estoy en la fase de apuestas THEN el sistema SHALL mostrar mi balance actual y permitir seleccionar montos de apuesta
3. WHEN selecciono un monto de apuesta THEN el sistema SHALL validar que tengo suficiente balance
4. WHEN confirmo mi apuesta THEN el sistema SHALL deducir el monto de mi balance y registrar la apuesta
5. WHEN todos los jugadores han apostado o el tiempo se agota THEN el sistema SHALL proceder a repartir cartas
6. IF no realizo una apuesta THEN el sistema SHALL establecer una apuesta mínima automática de 25 chips si tengo balance suficiente
7. WHEN la fase de apuestas termina THEN el sistema SHALL mostrar todas las apuestas realizadas

### Requirement 3: Bet Validation and Security

**User Story:** Como desarrollador del sistema, quiero asegurar que todas las apuestas sean válidas y seguras, para prevenir trampas y mantener la integridad del juego.

#### Acceptance Criteria

1. WHEN un jugador intenta apostar THEN el sistema SHALL validar que el monto sea mayor a 0
2. WHEN un jugador intenta apostar THEN el sistema SHALL validar que el monto no exceda su balance disponible
3. WHEN un jugador intenta apostar THEN el sistema SHALL validar que el monto esté dentro de los límites permitidos (mín: 25, máx: balance)
4. IF una apuesta es inválida THEN el sistema SHALL rechazar la apuesta y mostrar un mensaje de error específico
5. WHEN se procesa una apuesta THEN el sistema SHALL usar transacciones atómicas para evitar inconsistencias
6. WHEN se detecta una apuesta duplicada THEN el sistema SHALL actualizar la apuesta existente en lugar de crear una nueva
7. WHEN un jugador intenta modificar su apuesta después del tiempo límite THEN el sistema SHALL rechazar la modificación

### Requirement 4: Payout Calculation System

**User Story:** Como jugador, quiero recibir pagos justos y precisos basados en los resultados del juego, para tener confianza en el sistema de recompensas.

#### Acceptance Criteria

1. WHEN gano con una mano normal THEN el sistema SHALL pagar 2:1 (apuesta × 2)
2. WHEN obtengo blackjack THEN el sistema SHALL pagar 2.5:1 (apuesta × 2.5, redondeado hacia abajo)
3. WHEN empato con el dealer THEN el sistema SHALL devolver mi apuesta original (push)
4. WHEN pierdo o me paso de 21 THEN el sistema SHALL retener mi apuesta (pago 0)
5. WHEN se calculan los pagos THEN el sistema SHALL procesar todos los pagos simultáneamente
6. WHEN recibo un pago THEN el sistema SHALL actualizar mi balance inmediatamente
7. WHEN hay un error en el cálculo THEN el sistema SHALL registrar el error y usar valores por defecto seguros

### Requirement 5: Frontend Betting Interface

**User Story:** Como jugador, quiero una interfaz intuitiva y responsive para realizar mis apuestas, para poder jugar de manera cómoda y eficiente.

#### Acceptance Criteria

1. WHEN estoy en la fase de apuestas THEN el sistema SHALL mostrar chips clickeables con valores predefinidos (25, 50, 100, 250, 500)
2. WHEN hago click en un chip THEN el sistema SHALL añadir ese valor a mi apuesta actual
3. WHEN mi apuesta actual se muestra THEN el sistema SHALL actualizar la visualización en tiempo real
4. WHEN quiero apostar todo mi balance THEN el sistema SHALL proporcionar un botón "All In"
5. WHEN quiero limpiar mi apuesta THEN el sistema SHALL proporcionar un botón "Clear Bet"
6. WHEN confirmo mi apuesta THEN el sistema SHALL mostrar confirmación visual y deshabilitar controles
7. WHEN otros jugadores apuestan THEN el sistema SHALL mostrar sus apuestas en tiempo real
8. IF no tengo suficiente balance para un chip THEN el sistema SHALL deshabilitar ese chip visualmente

### Requirement 6: Real-time Synchronization

**User Story:** Como jugador en una partida multiplayer, quiero ver las apuestas de otros jugadores en tiempo real, para tener una experiencia de juego social y transparente.

#### Acceptance Criteria

1. WHEN un jugador realiza una apuesta THEN el sistema SHALL broadcast la información a todos los jugadores de la sala
2. WHEN recibo información de apuestas THEN el sistema SHALL actualizar la interfaz inmediatamente
3. WHEN se actualiza el estado del juego THEN el sistema SHALL incluir información de balance y apuestas de todos los jugadores
4. WHEN hay un error de sincronización THEN el sistema SHALL solicitar una actualización completa del estado
5. WHEN un jugador se desconecta THEN el sistema SHALL mantener su apuesta para la ronda actual
6. WHEN un jugador se reconecta THEN el sistema SHALL sincronizar su estado actual incluyendo balance y apuesta
7. WHEN la conexión es inestable THEN el sistema SHALL implementar retry automático para operaciones críticas

### Requirement 7: Error Handling and Recovery

**User Story:** Como jugador, quiero que el sistema maneje errores de manera elegante y me permita recuperarme de problemas técnicos, para tener una experiencia de juego confiable.

#### Acceptance Criteria

1. WHEN ocurre un error de red durante una apuesta THEN el sistema SHALL reintentar la operación automáticamente
2. WHEN falla una transacción de balance THEN el sistema SHALL revertir todos los cambios relacionados
3. WHEN se detecta una inconsistencia de datos THEN el sistema SHALL registrar el error y usar el estado del servidor como fuente de verdad
4. WHEN hay un timeout en la fase de apuestas THEN el sistema SHALL proceder con las apuestas realizadas hasta ese momento
5. IF mi balance se corrompe THEN el sistema SHALL restaurar desde el último estado válido conocido
6. WHEN ocurre un error crítico THEN el sistema SHALL notificar a todos los jugadores y permitir reiniciar la ronda
7. WHEN se recupera de un error THEN el sistema SHALL sincronizar el estado completo con todos los clientes

### Requirement 8: Performance and Scalability

**User Story:** Como desarrollador del sistema, quiero que el sistema de apuestas sea eficiente y escalable, para soportar múltiples salas simultáneas sin degradación de rendimiento.

#### Acceptance Criteria

1. WHEN se procesan múltiples apuestas simultáneas THEN el sistema SHALL mantener un tiempo de respuesta menor a 100ms
2. WHEN hay múltiples salas activas THEN el sistema SHALL aislar las operaciones de betting por sala
3. WHEN se actualiza el estado del juego THEN el sistema SHALL usar broadcasting optimizado para minimizar el tráfico de red
4. WHEN se almacenan datos de balance THEN el sistema SHALL usar estructuras de datos eficientes en memoria
5. WHEN se validan apuestas THEN el sistema SHALL usar algoritmos de validación O(1) cuando sea posible
6. WHEN hay picos de carga THEN el sistema SHALL mantener la funcionalidad básica de betting
7. WHEN se detecta degradación de rendimiento THEN el sistema SHALL implementar throttling inteligente