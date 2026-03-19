---
name: trello-orchestrator
description: >
  Analiza las tarjetas en la lista "Doing" de Trello y decide qué acción tomar:
  subdividir (Splitter), planificar (Planner) o ejecutar (Implementer).
---

# Skill: Trello Orchestrator

## Objetivo

Automatizar el flujo de trabajo de desarrollo gestionando el ciclo de vida de las tareas en Trello por orden de prioridad y estado de madurez.

## Cuándo usar esta skill

- El usuario dice "siguiente paso", "decidí qué hacer", "continuar con el proyecto" o similar.
- El usuario quiere que la IA gestione el flujo sin darle comandos técnicos específicos.

## Lógica de Decisión

El orquestador debe inspeccionar la lista **"🔧 Doing"** y aplicar la siguiente prioridad de arriba hacia abajo:

### 1. ¿Necesita subdivisión? (Splitter)
**Condición**: La tarjeta es una tarea general (no tiene prefijo de historia ni checklist de subtareas aún).
- **Acción**: Ejecutar `trello-story-splitter`.
- **Resultado**: La tarea se divide en historias que se mueven a "📋 To Do".

### 2. ¿Necesita planificación? (Planner)
**Condición**: La tarjeta es una historia (sub-tarea en Doing) pero NO contiene un bloque de "Plan de Implementación" en su descripción o comentarios.
- **Acción**: Ejecutar `trello-story-planner`.
- **Resultado**: La tarjeta ahora tiene un plan técnico detallado.

### 3. ¿Necesita ejecución? (Implementer)
**Condición**: La tarjeta es una historia en Doing y YA tiene un plan técnico detallado.
- **Acción**: Ejecutar `trello-story-implementer`.
- **Resultado**: El código se actualiza y la tarjeta se mueve a "✅ Done".

## Paso a paso

1. **Listar tarjetas en "🔧 Doing"**:
   ```
   GET https://api.trello.com/1/lists/{DOING_LIST_ID}/cards
   ```

2. **Analizar la primera tarjeta disponible**:
   - Revisar su nombre, descripción, checklists y comentarios.

3. **Ejecutar la skill correspondiente**:
   - Llamar internamente al Splitter, Planner o Implementer según la lógica de decisión arriba descrita.

4. **Informar al usuario**:
   - Indicar qué tarjeta se tomó y qué acción se está realizando (incluyendo el "por qué").

## Ejemplo de flujo automático

- **Usuario**: "Siguiente paso."
- **Agente**: "Veo que tienes 'Colisiones' en Doing pero no tiene historias. Ejecutando **Splitter**..."
- (El Splitter termina y crea 4 historias en To Do).
- **Usuario**: "Siguiente."
- (El usuario mueve 'Historia 1' a Doing)
- **Agente**: "Veo 'Historia 1' en Doing pero le falta el plan. Ejecutando **Planner**..."
- **Usuario**: "Siguiente."
- **Agente**: "¡Historia 1 lista para implementar! Ejecutando **Implementer**..."
