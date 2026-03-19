---
name: trello-story-splitter
description: >
  Toma una tarjeta de la lista "Doing" del tablero Trello del proyecto
  y la subdivide en historias (sub-tarjetas) atómicas, verificables y
  aptas para ser ejecutadas por una IA con contexto pequeño (ej. Gemini Flash).
  Cada historia debe ser tan acotada que un agente pueda resolverla
  editando 1-3 archivos sin necesidad de entender el proyecto completo.
---

# Skill: Trello Story Splitter

## Objetivo

Subdividir una tarea grande de Trello ("Doing") en historias de usuario
pequeñas, autocontenidas y accionables para una IA con contexto limitado.

## Cuándo usar esta skill

- El usuario señala una tarjeta del tablero Trello (por nombre o URL).
- El usuario pide "subdividir", "partir en historias" o "preparar tareas para Flash".

## Paso a paso

### 1. Leer la tarjeta de Trello

Usa el script `scripts/trello-sync.js` como base, o llama directamente a la
API REST de Trello para obtener los detalles de la tarjeta.

```
GET https://api.trello.com/1/cards/{cardId}?key={KEY}&token={TOKEN}
```

Si el usuario solo dio el nombre de la tarjeta (no el ID), primero lista las
tarjetas de la lista "🔧 Doing" y busca por nombre:

```
GET https://api.trello.com/1/lists/{listId}/cards?key={KEY}&token={TOKEN}
```

El `TRELLO_BOARD_ID`, `TRELLO_API_KEY` y `TRELLO_TOKEN` están en `.env`.

Para obtener el ID de la lista "Doing", llama:
```
GET https://api.trello.com/1/boards/{BOARD_ID}/lists?key={KEY}&token={TOKEN}
```
Y filtrá por `name === '🔧 Doing'`.

### 2. Analizar el código relacionado

Antes de crear las historias, **leer los archivos del proyecto afectados** por
la tarea. Esto es crítico para que las historias sean precisas.

Reglas de análisis:
- Identificar exactamente qué archivos necesitan ser modificados.
- Detectar dependencias entre módulos.
- Anotar funciones/clases/eventos relevantes.

### 3. Crear las historias (sub-tarjetas)

#### Criterios de una buena historia para IA con contexto pequeño:

| Criterio | Descripción |
|----------|-------------|
| **Atómica** | Modifica máximo 1-3 archivos |
| **Autocontenida** | Incluye contexto suficiente en la descripción para que una IA entienda sin leer todo el proyecto |
| **Verificable** | Tiene un criterio de aceptación chequeable (test, output de consola, comportamiento visible) |
| **Sin ambigüedad** | Nombra las funciones, clases y eventos exactos a modificar |
| **Ordenada** | Las historias están numeradas en orden de dependencia (la 1 no depende de la 2) |

#### Formato de cada historia (descripción en la tarjeta de Trello):

```
## Contexto
[1-2 párrafos que explican qué parte del sistema es y por qué importa]

## Archivos a modificar
- `src/game/path/to/File.js` — [qué cambiar aquí]

## Tarea concreta
[Descripción exacta de qué implementar, incluyendo nombres de funciones,
parámetros esperados y lógica a seguir]

## Criterio de aceptación
- [ ] [Condición verificable 1]
- [ ] [Condición verificable 2]

## No tocar
[Lista de archivos o sistemas que NO deben modificarse en esta historia]
```

### 4. Crear las sub-tarjetas en Trello

- Crear una **checklist** en la tarjeta padre con los nombres de las historias.
- Crear cada historia como una **nueva tarjeta** en la lista "📋 To Do".
- El nombre de cada sub-tarjeta debe tener el prefijo del nombre de la tarea
  padre para agruparlas visualmente. Ejemplo:
  ```
  [Colisiones] 1/4 - Agregar método resolveAABB() en GameSimulation
  [Colisiones] 2/4 - Aplicar resolveAABB en update() del Player
  ```
- Agregar la checklist a la tarjeta padre usando:
  ```
  POST https://api.trello.com/1/checklists
  body: { idCard, name: "Historias" }

  POST https://api.trello.com/1/checklists/{checklistId}/checkItems
  body: { name: "[nombre de la historia]" }
  ```

### 5. Confirmar con el usuario

Después de crear las tarjetas, mostrar un resumen en formato tabla con:
- Número de historia
- Nombre
- Archivos que toca
- Estimación de líneas de código a cambiar (aprox)

## Consideraciones especiales para "IA con contexto pequeño"

Una IA como Gemini Flash puede manejar ~8k tokens de contexto efectivo.
Esto significa que cada historia debe ser ejecutable con solo leer:
- La descripción de la tarjeta (~200 tokens)
- Los archivos mencionados (~1000-3000 tokens cada uno)
- Máximo 2-3 archivos por historia

**Evitar** historias que requieran:
- Entender el flujo completo del EventBus
- Modificar más de un sistema a la vez
- Contexto de conversaciones anteriores

**Incluir siempre** en la descripción:
- El nombre exacto de la clase/función a modificar
- El tipo de dato de entrada/salida esperado
- El evento del EventBus que se usa (si aplica), con su nombre de constante exacta (ej. `EVENTS.ENTITY_CREATED`)

## Ejemplo de ejecución

Si el usuario dice: *"Partí la tarea de Colisiones"*, el agente debe:

1. Buscar la tarjeta "🔧 Colisiones físicas con obstáculos" en la lista Doing.
2. Leer `GameSimulation.js`, `Player.js`, `Enemy.js`, `StaticObstacleEntity.js`.
3. Generar historias como:
   - `[Colisiones] 1/N - Crear función resolveAABB(entityA, entityB)` en `GameSimulation`
   - `[Colisiones] 2/N - Aplicar resolveAABB entre jugadores y obstáculos en update()`
   - `[Colisiones] 3/N - Aplicar resolveAABB entre enemigos y obstáculos en update()`
4. Crear las tarjetas en Trello y la checklist en la tarjeta padre.
5. Mostrar resumen al usuario.
