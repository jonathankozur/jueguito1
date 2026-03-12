# Sistema Multiplayer — Guía Técnica

## Arquitectura General

```
┌─────────────────────────────────────────┐
│  HOST (Browser del jugador 1)           │
│                                         │
│  InputController ──► EventBus           │
│                        │                │
│  GameEngine ─► GameSimulation           │
│                  │    │                  │
│              CombatSystem               │
│                  │                      │
│       NetworkHost (suscrito al Bus)     │
│           │      │       │              │
│       ATTACK  HP_CHANGED WORLD_STATE    │
│           └──────┴───────┘              │
│               WebSocket                 │
└───────────────┬─────────────────────────┘
                │
        SignalingServer (:3001)
         (relay puro, sin lógica)
                │
┌───────────────┴─────────────────────────┐
│  CLIENT (Browser del jugador 2/3/4)     │
│                                         │
│  InputController (modo 'remote')        │
│       │                                 │
│  NetworkClient ◄── WebSocket            │
│       │                                 │
│  Recibe WORLD_STATE ──► EventBus        │
│  Recibe ATTACK      ──► EventBus        │
│  Recibe HP_CHANGED  ──► EventBus        │
│  Recibe PLAYER_DIED ──► EventBus        │
│                          │              │
│                     MainScene (render)  │
│                                         │
│  ¡NO CORRE GameSimulation!              │
└─────────────────────────────────────────┘
```

---

## Regla Fundamental

> **Toda la lógica de juego corre SOLO en el host.**
> El cliente es un "monitor tonto" que envía inputs y renderiza lo que el host le dice.

Esto significa:
- Solo el host corre `GameSimulation`, `CombatSystem`, `EnemySpawnerSystem`.
- El cliente NUNCA instancia `PlayerEntity` lógicas. Solo crea sprites visuales.
- Si un cálculo necesita "pasar" en el juego (daño, movimiento, spawn), pasa en el host.

---

## Flujo de un Input del Cliente

```
1. Cliente presiona W
2. InputController (modo 'remote') → NetworkClient.sendMoveInput(0, -1)
3. WebSocket → SignalingServer → relay al host
4. NetworkHost recibe { type: 'INPUT_MOVE', dirX: 0, dirY: -1, from: 'player_2' }
5. NetworkHost inyecta al EventBus: INPUT_MOVE con targetId = 'player_2'
6. PlayerEntity('player_2') filtra por targetId → se mueve
7. En el próximo tick → broadcastWorldState() → envía posición actualizada
8. Cliente recibe WORLD_STATE → aplica posición al sprite
```

**Latencia visible**: El cliente ve su propio movimiento con 1-2 frames de retraso (el viaje de ida y vuelta por WebSocket). En LAN esto es imperceptible (~1-5ms). En internet podría ser 50-200ms.

---

## Qué se Retransmite (Host → Clientes)

| Evento | Cuándo | Qué datos |
|---|---|---|
| `WORLD_STATE` | Cada tick | Posición (x,y), ángulo, HP de TODAS las entidades |
| `ATTACK` | Cada ataque | senderId, posición, ángulo, daño |
| `HP_CHANGED` | Cuando un player recibe daño | senderId, HP actual, HP máximo |
| `PLAYER_DIED` | Cuando un player muere | senderId |

---

## Qué se Retransmite (Cliente → Host)

| Evento | Cuándo | Qué datos |
|---|---|---|
| `INPUT_MOVE` | Cuando cambian las teclas WASD | dirX, dirY |
| `INPUT_AIM` | Cuando se mueve el mouse | aimX, aimY |

---

## Cómo el Cliente Crea Sprites (Auto-descubrimiento)

El cliente NO recibe `ENTITY_CREATED` del host. En cambio, `NetworkClient._applyWorldState()` mantiene un `Set<knownEntities>`. La primera vez que ve un entity ID nuevo en el `WORLD_STATE`:

1. Emite `ENTITY_CREATED` al EventBus local
2. MainScene crea el sprite con el color correspondiente
3. A partir de ahí, solo actualiza posición/ángulo

---

## Guía para Implementar Nuevas Features

### Agregar una nueva habilidad (ej: dash, escudo, proyectil)

1. **Definir el evento en `EventBus.js`**: Agregar un nuevo ID al `MessageType` (ej: `ABILITY_USED: 17`).

2. **Implementar la lógica en la entity** (solo corre en el host):
   ```javascript
   // Player.js
   useAbility() {
       EventBus.enqueueCommand(EVENTS.ABILITY_USED, MessagePriority.HIGH, {
           senderId: this.id,
           int1: ABILITY_ID,
           float1: this.x,
           float2: this.y
       });
   }
   ```

3. **Agregar el input remoto**: Si la habilidad se activa por un input del cliente, agregar un nuevo tipo de mensaje en:
   - `InputController._sendAbilityInput()` → envía al host por WS
   - `NetworkHost._processClientInput()` → case 'ABILITY_USED'
   - `NetworkClient.sendAbilityInput()` → envía por WS

4. **Retransmitir el efecto visual**: En `NetworkHost`, suscribirse al evento y reenviarlo:
   ```javascript
   EventBus.subscribe(EVENTS.ABILITY_USED, this._onAbilityUsed, this);
   ```
   En `NetworkClient._handleMessage`, agregar el case correspondiente.

5. **Renderizar en MainScene**: Agregar un listener para el nuevo evento que dibuje el efecto visual.

### Agregar enemigos de vuelta

1. Reactivar `EnemySpawnerSystem` poniendo `this.enabled = true`.
2. Los enemigos ya se incluyen automáticamente en `WORLD_STATE` (tienen x, y, angle, hp).
3. El cliente ya soporta auto-crear sprites Enemy gracias al `knownEntities` check.
4. Solo asegurate de que los ataques de enemigos se retransmitan (ya están cubiertos por `ATTACK_PERFORMED`).

### Agregar un item / consumible

1. Crear la entidad (ej: `HealthPickup.js`) que se registra en `GameSimulation.entities`.
2. El host spawneará estos items (se incluirán en `WORLD_STATE`).
3. Definir un nuevo prefijo de ID (ej: `item_`) para que el cliente los distinga de players/enemies.
4. Agregar lógica de recolección en un nuevo sistema (ej: `PickupSystem.js`) que corra solo en el host.
5. Retransmitir el efecto de recolección como un evento nuevo.

### Agregar chat / emotes

Los mensajes de texto se pueden enviar como RELAY genéricos:
```javascript
// Cliente envía
networkClient._sendToHost({ type: 'CHAT', text: 'gg!' });

// Host reenvía a todos
case 'CHAT': this._broadcastToClients({ type: 'CHAT', from: msg.from, text: msg.text });
```

---

## Checklist para Cualquier Feature Nueva

- [ ] ¿La lógica corre SOLO en el host? (no en el cliente)
- [ ] ¿El input remoto llega al host? (`NetworkHost._processClientInput`)
- [ ] ¿El efecto visual se retransmite? (`NetworkHost` suscribe + `NetworkClient` case)
- [ ] ¿El evento tiene ID en `EventBus.MessageType`?
- [ ] ¿MainScene renderiza correctamente el nuevo efecto/sprite?
- [ ] ¿Se limpia en `destroy()`? (EventBus.unsubscribe)

---

## Limitaciones Actuales

| Limitación | Impacto | Solución futura |
|---|---|---|
| Sin predicción client-side | El cliente ve su input con delay | Implementar client-side prediction + reconciliation |
| Sin interpolación | Movimiento de otros jugadores puede verse "a saltos" | Interpolar posiciones entre WORLD_STATE frames |
| Host = SPOF | Si el host cierra, mueren todos | Migración de host o servidor dedicado |
| Sin compresión de red | WORLD_STATE se envía como JSON plano | Usar binary protocol (ArrayBuffer) |
| Max 4 jugadores | Hardcodeado en SignalingServer | Ampliar si es necesario |

---

## Estructura de Archivos de Red

```
server/
  SignalingServer.js    ← Servidor WebSocket (Node.js) - corre aparte
  package.json

src/game/
  network/
    NetworkHost.js      ← Solo en el host: recibe inputs, broadcast state
    NetworkClient.js    ← Solo en clientes: envía inputs, aplica state
  core/
    GameEngine.js       ← Modos: 'solo' | 'host' | 'client'
  controllers/
    InputController.js  ← Modos: 'local' (EventBus) | 'remote' (WebSocket)
```
