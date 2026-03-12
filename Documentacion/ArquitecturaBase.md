# PROMPT PARA AGENTE DE IA – DISEÑO DE ARQUITECTURA DE MOTOR DE JUEGO BASADO EN MENSAJERÍA

## CONTEXTO GENERAL

Estoy desarrollando un videojuego y necesito diseñar la **arquitectura base del motor de simulación** antes de escribir código significativo.

El objetivo es construir una arquitectura **modular, desacoplada, determinística y escalable**, que permita:

* desarrollo limpio
* debugging sencillo
* posible soporte multiplayer en el futuro
* simulación determinística
* separación estricta entre lógica y presentación

El diseño debe priorizar **claridad arquitectónica y mantenibilidad a largo plazo**.

NO quiero código todavía.
Quiero **documentación técnica detallada y diseño del sistema**.

---

# PRINCIPIOS ARQUITECTÓNICOS OBLIGATORIOS

El sistema debe cumplir con:

1. **Separación estricta de responsabilidades**
2. **Desacoplamiento entre subsistemas**
3. **Simulación determinística**
4. **Debugging sencillo**
5. **Arquitectura extensible**
6. **Posibilidad futura de multiplayer**
7. **Evitar dependencias circulares**

---

# MODELO CONCEPTUAL DEL MOTOR

El motor se basará en una combinación de:

* World State (estado del juego)
* Systems (sistemas de simulación)
* Message Bus (mensajería estructurada)
* Command Queue
* Event System
* Render Systems

La arquitectura general debe seguir este flujo:

FRAME LOOP

Input
→ Commands
→ Simulation Systems
→ Events
→ Render Systems

---

# OBJETIVO PRINCIPAL

Diseñar **un sistema robusto de mensajería para un motor de juego** que permita:

* comunicación desacoplada
* orden determinístico de ejecución
* prioridades de mensajes
* trazabilidad para debugging
* prevención de loops de eventos
* separación clara entre lógica de juego y render

---

# REQUERIMIENTO CRÍTICO: TIPOS DE MENSAJES

El sistema debe distinguir claramente entre **tres tipos de mensajes**:

## 1. COMMANDS

Representan **intenciones o acciones solicitadas**.

Ejemplos:

* MovePlayer
* Attack
* BuildStructure
* OpenDoor
* UseItem

Características:

* se procesan una sola vez
* tienen destinatario específico
* modifican estado del juego
* se ejecutan durante la fase de simulación

---

## 2. EVENTS

Representan **algo que ya ocurrió en el mundo**.

Ejemplos:

* PlayerMoved
* EnemyKilled
* ItemCollected
* DoorOpened
* StructureCompleted

Características:

* broadcast
* múltiples listeners
* no deben modificar directamente el estado
* sirven para disparar reacciones de otros sistemas

---

## 3. RENDER COMMANDS

Mensajes destinados exclusivamente a la capa visual.

Ejemplos:

* MoveSprite
* PlayAnimation
* SpawnParticleEffect
* PlaySound

Características:

* no afectan la simulación
* sólo afectan la presentación visual
* consumidos por render systems

---

# MESSAGE BUS – DISEÑO REQUERIDO

El Message Bus debe incluir:

### múltiples colas internas

CommandQueue
SimulationEventQueue
GameplayEventQueue
RenderQueue
DebugQueue

Cada cola debe tener:

* prioridad
* orden determinístico
* límite configurable

---

# PRIORIDAD DE MENSAJES

Definir sistema de prioridad:

CRITICAL
HIGH
NORMAL
LOW

La cola debe procesar mensajes respetando:

1. prioridad
2. orden de inserción
3. determinismo por frame

---

# PROCESAMIENTO POR FASES

El sistema debe definir **fases claras de ejecución del frame**.

Ejemplo:

1. Input Phase
2. Command Processing Phase
3. Simulation Systems Phase
4. Gameplay Event Phase
5. Render Phase

Explicar claramente:

* qué tipo de mensajes se procesan en cada fase
* qué sistemas pueden publicar mensajes en cada fase
* cómo se evita la ejecución fuera de orden

---

# MENSAJES DETERMINÍSTICOS

Cada mensaje debe contener metadatos obligatorios:

message_id
frame_number
timestamp
sender
type
priority
payload

Explicar:

* por qué esto es importante
* cómo permite debugging
* cómo permite replay del juego
* cómo ayuda al multiplayer determinístico

---

# SISTEMA DE SUSCRIPCIÓN

Diseñar sistema de suscripción basado en **tipos de mensaje**, no strings.

Ejemplo conceptual:

subscribe<PlayerMovedEvent>()

Explicar:

* cómo evitar errores comunes
* cómo manejar múltiples listeners
* cómo desuscribirse
* cómo registrar listeners dinámicamente

---

# CONTROL DE EVENT STORMS

El sistema debe prevenir tormentas de eventos.

Diseñar mecanismos como:

* límite de eventos por frame
* detección de loops de eventos
* profundidad máxima de encadenamiento
* rechazo o agregación de eventos redundantes

Explicar cada mecanismo.

---

# EVENT COALESCING

Diseñar sistema para **fusionar eventos redundantes**.

Ejemplo:

100 PositionChanged → 1 evento final

Explicar:

* cuándo aplicarlo
* cuándo NO aplicarlo
* impacto en performance

---

# DEBUGGING Y TRACE

El Message Bus debe permitir:

## registro de eventos por frame

Ejemplo de log:

Frame 102

InputSystem → MovePlayerCommand
MovementSystem → PlayerMovedEvent
CombatSystem → DamageEvent
AnimationSystem → PlayAnimationCommand

---

## visualización del flujo de eventos

Mostrar cómo se podría reconstruir una cadena causal:

Input
→ MoveCommand
→ MovementSystem
→ PlayerMovedEvent
→ AnimationSystem

Explicar cómo esto ayuda a debugging.

---

# PROTECCIÓN CONTRA LOOPS

El sistema debe detectar casos como:

EventA → SystemB
EventB → SystemA

Diseñar mecanismos para prevenir loops infinitos.

---

# WORLD STATE

El estado del mundo debe ser **la fuente de verdad**.

Los sistemas modifican el WorldState.

La vista **NO depende de eventos para sincronizar estado**.

Render Systems deben **leer el estado actual del mundo**.

Explicar claramente esta separación.

---

# ESTRUCTURA DEL MOTOR

Definir arquitectura general:

GameEngine
│
├── InputSystem
├── CommandQueue
├── MessageBus
├── WorldState
│
├── SimulationSystems
│   ├── MovementSystem
│   ├── CombatSystem
│   ├── AISystem
│
└── RenderSystems
├── SpriteRenderSystem
├── UISystem

Explicar responsabilidades de cada componente.

---

# FLUJO COMPLETO DE UN FRAME

Describir paso a paso qué ocurre en un frame del juego.

Desde:

input del jugador

hasta:

render final.

---

# CONSIDERACIONES DE PERFORMANCE

Analizar:

* costo de mensajería
* número esperado de mensajes por frame
* estructuras de datos recomendadas para colas
* estrategias para minimizar GC / allocations

---

# ESCALABILIDAD FUTURA

Explicar cómo esta arquitectura permitiría:

* multiplayer determinístico
* replay del juego
* grabación de partidas
* simulación en servidor

---

# FORMATO DE RESPUESTA ESPERADO

Quiero que produzcas un **documento técnico estructurado** con secciones claras:

1. Overview de la arquitectura
2. Diseño del Message Bus
3. Tipos de mensajes
4. Sistema de colas
5. Procesamiento por fases
6. Sistema de suscripción
7. Prevención de loops
8. Debugging y tracing
9. Integración con WorldState
10. Flujo completo del frame
11. Consideraciones de performance
12. Posibles extensiones futuras

El objetivo es obtener **una especificación arquitectónica clara para implementar el sistema posteriormente**.

NO generes código todavía.
Solo documentación técnica detallada.
