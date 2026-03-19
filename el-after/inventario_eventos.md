# Inventario de Relaciones con el EventBus

Este documento detalla todos los objetos del sistema que interactúan con el `EventBus` (MessageBusSystem), ya sea suscribiéndose a mensajes o encolándolos.

## Sistema Central: EventBus (`src/game/events/EventBus.js`)
El `EventBus` es una instancia única de `MessageBusSystem` que gestiona el enrutamiento de mensajes mediante colas diferidas (COMMAND, EVENT, RENDER) y prioridades.

---

## 1. Entidades (Entities)

### PlayerEntity (`src/game/entities/Player.js`)
*   **Se suscribe a:**
    *   `INPUT_MOVE`: Para actualizar la velocidad base.
    *   `INPUT_AIM`: Para actualizar el ángulo de mirada.
    *   `INPUT_ATTACK`: Para ejecutar el ataque del arma seleccionada.
    *   `INPUT_INVENTORY_CHANGE`: Para cambiar el slot del inventario (teclas 1-5 o rueda).
*   **Encola (Enqueue):**
    *   `ATTACK_PERFORMED` (Command): Cuando realiza un ataque exitoso.
    *   `PLAYER_STATE_UPDATED` (Event): Al moverse o cambiar de ángulo/slot.
    *   `PLAYER_HP_CHANGED` (Event): Al recibir daño.
    *   `PLAYER_DIED` (Event): Cuando su vida llega a cero.

### EnemyEntity (`src/game/entities/Enemy.js`)
*   **Encola (Enqueue):**
    *   `ATTACK_PERFORMED` (Command): Cuando el enemigo ataca al jugador en rango.
    *   `PLAYER_STATE_UPDATED` (Event): Para sincronizar su posición/rotación con el renderer.
    *   `ENTITY_HP_CHANGED` (Event): Al recibir daño para actualizar la barra de vida visual.

---

## 2. Sistemas y Lógica Central (Core & Systems)

### GameEngine (`src/game/core/GameEngine.js`)
*   **Se suscribe a:**
    *   `UI_READY`: Para iniciar la construcción del nivel.
    *   `PLAYER_DIED`: Para gestionar el fin de partida o victoria.
    *   `REMOTE_PLAYER_JOINED`: Para añadir jugadores remotos a la simulación.
    *   `REMOTE_PLAYER_LEFT`: Para eliminar jugadores que se desconectan.
*   **Encola (Enqueue):**
    *   `ENTITY_DESTROYED` (Event): Al eliminar un jugador desconectado o muerto.
    *   `GAME_OVER` (Event): Cuando se termina la partida en modo solo o todos mueren.
    *   `PLAYER_WON` (Event): Cuando queda un único sobreviviente en multijugador.
*   **Gestión del Ciclo:** Llama a `dispatchCommands()`, `dispatchEvents()`, `dispatchRender()` y `setFrame()` en cada tick.

### GameSimulation (`src/game/core/GameSimulation.js`)
*   **Se suscribe a:**
    *   `ENTITY_CREATED`: Para registrar nuevas entidades en su mapa universal `entities`.

### CombatSystem (`src/game/systems/CombatSystem.js`)
*   **Se suscribe a:**
    *   `ATTACK_PERFORMED`: Motor principal que calcula impactos de melee, proyectiles y arrojadizas.
*   **Encola (Enqueue):**
    *   `ENTITY_DESTROYED` (Event): Cuando una entidad muere por un ataque.

### EnemySpawnerSystem (`src/game/systems/EnemySpawnerSystem.js`)
*   **Encola (Enqueue):**
    *   `ENTITY_CREATED` (Event): Al spawnear un nuevo enemigo en el mundo.

### LevelBuilder (`src/game/core/LevelBuilder.js`)
*   **Encola (Enqueue):**
    *   `ENTITY_CREATED` (Event): Al spawnear jugadores iniciales o añadir nuevos, y al crear obstáculos estáticos.

---

## 3. Controladores y Red (Controllers & Network)

### InputController (`src/game/controllers/InputController.js`)
*   **Encola (Enqueue) [Modo Local]:**
    *   `INPUT_MOVE`, `INPUT_AIM`, `INPUT_ATTACK`, `INPUT_INVENTORY_CHANGE` (Commands).

### NetworkHost (`src/game/network/NetworkHost.js`)
*   **Se suscribe a (Relay a Clientes):**
    *   `ATTACK_PERFORMED`, `PLAYER_HP_CHANGED`, `PLAYER_DIED`, `PLAYER_WON`, `GAME_OVER`.
*   **Encola (Enqueue) [Inputs de Clientes]:**
    *   `REMOTE_PLAYER_JOINED`, `REMOTE_PLAYER_LEFT` (Events).
    *   `INPUT_MOVE`, `INPUT_AIM`, `INPUT_ATTACK`, `INPUT_INVENTORY_CHANGE` (Commands) recibidos vía WebSocket.

### NetworkClient (`src/game/network/NetworkClient.js`)
*   **Encola (Enqueue) [Estado del Host]:**
    *   Traduce mensajes de red (`WORLD_STATE`, `ATTACK`, etc.) a eventos locales: `ENTITY_CREATED`, `PLAYER_STATE_UPDATED`, `ENTITY_HP_CHANGED`, `ATTACK_PERFORMED`, `PLAYER_HP_CHANGED`, `PLAYER_DIED`, `ENTITY_DESTROYED`, `PLAYER_WON`, `GAME_OVER`, `REMOTE_PLAYER_JOINED`, `REMOTE_PLAYER_LEFT`, `PLAYERS_SYNCED`.

---

## 4. Interfaz y Visualización (UI & Rendering)

### MainScene (`src/game/scenes/MainScene.js` - Phaser)
*   **Se suscribe a:**
    *   `ENTITY_CREATED`: Para instanciar sprites/contenedores.
    *   `ENTITY_DESTROYED`: Para eliminar objetos visuales.
    *   `PLAYER_STATE_UPDATED`: Para mover y rotar sprites.
    *   `ENTITY_HP_CHANGED`: Para actualizar barras de vida sobre los enemigos.
    *   `ATTACK_PERFORMED`: Para dibujar efectos visuales (círculos de ataque, proyectiles, explosiones).
*   **Encola (Enqueue):**
    *   `UI_READY` (Command): Para notificar al Engine que el renderer está listo.

### GameComponent (`src/game/GameComponent.jsx` - React)
*   **Se suscribe a:**
    *   `PLAYER_HP_CHANGED`: Para la barra de vida del HUB inferior.
    *   `PLAYER_DIED`: Para mostrar la pantalla de muerte ("¡Te dejaron pinchado!").
    *   `PLAYER_WON`: Para la pantalla de victoria ("¡Ganaste!").
    *   `GAME_OVER`: Para el fin de partida general.
*   **Gestión:** Llama a `EventBus.resetAll()` al desmontar el componente.

### EventDebugger (`src/game/debug/EventDebugger.jsx`)
*   Usa métodos de introspección: `getDebugHistory()`, `getDebugQueue()`, `getPoolSize()`, `setDebugMode()`.

---

## Resumen de MessageTypes (EVENTS)
*   **0-9:** `INPUT_MOVE`, `INPUT_AIM`, `PLAYER_STATE_UPDATED`, `ENTITY_CREATED`, `DAMAGE_DEALT`, `ENTITY_DESTROYED`, `UI_READY`, `ATTACK_PERFORMED`, `PLAYER_DIED`.
*   **10-19:** `GAME_OVER`, `PLAYER_HP_CHANGED`, `ENTITY_HP_CHANGED`, `REMOTE_PLAYER_JOINED`, `REMOTE_PLAYER_LEFT`, `PLAYERS_SYNCED`, `GAME_START`, `PLAYER_WON`, `INPUT_ATTACK`, `INPUT_INVENTORY_CHANGE`.
