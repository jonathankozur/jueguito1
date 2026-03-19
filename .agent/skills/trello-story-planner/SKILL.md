---
name: trello-story-planner
description: >
  Toma una "Historia" (sub-tarjeta) de la lista "Doing" del tablero Trello,
  analiza el código fuente relevante y redacta un plan de implementación técnico detallado
  directamente en la descripción o comentarios de la tarjeta.
---

# Skill: Trello Story Planner

## Objetivo

Transformar una historia de usuario de Trello en un plan técnico ejecutable paso a paso, con pseudocódigo y referencias exactas al código fuente, facilitando la tarea para una IA o un desarrollador.

## Cuándo usar esta skill

- El usuario señala una tarjeta de historia (sub-tarjeta) que está en la lista "🔧 Doing".
- El usuario pide "armar un plan", "planificar la implementación" o "detallar los pasos" para una tarea.

## Paso a paso

### 1. Obtener contexto de la tarjeta

Leer la tarjeta de Trello para identificar:
- El **objetivo** de la historia.
- Los **archivos mencionados** originalmente por el splitter.
- Los **criterios de aceptación**.

```
GET https://api.trello.com/1/cards/{cardId}?key={KEY}&token={TOKEN}
```

### 2. Análisis profundo del código

A diferencia del splitter, el planner **DEBE leer el contenido completo** de los archivos involucrados para proponer lógica real.
- Buscar los puntos de inserción exactos (nombres de funciones, hooks de eventos).
- Identificar variables de estado o componentes que deben ser accedidos.

### 3. Diseñar el Plan de Implementación

El plan debe seguir esta estructura:

#### 📋 Plan de Implementación Técnica

**A. Análisis de Impacto**
- ¿Qué otros módulos podrían verse afectados?
- ¿Qué eventos del `EventBus` se dispararán?

**B. Pasos Detallados**
1. **Paso 1: [Nombre del Archivo]** - Descripción de la modificación.
2. **Paso 2: [Nombre del Archivo]** - Implementación de la lógica.
3. ...

**C. Propuesta de Código / Pseudocódigo**
```javascript
// Ejemplo de la lógica a aplicar
function newLogic() {
  // 1. Obtener estado
  // 2. Procesar
  // 3. Emitir evento
}
```

**D. Verificación Unitaria**
- Pasos manuales o comando de test para verificar el éxito.

### 4. Actualizar la tarjeta en Trello

Escribir el plan en la tarjeta Trello. Se recomienda usar un **comentario** (para no borrar la descripción original) o anexarlo al final de la **descripción**.

```
POST https://api.trello.com/1/cards/{cardId}/actions/comments
body: { text: "[El Plan de Implementación en Markdown]" }
```

### 5. Notificar al usuario

Mostrar un resumen breve del plan y confirmar que ya está escrito en Trello.

## Reglas de Oro

1. **Precisión**: Si mencionas una línea o función, asegúrate de que exista y el nombre sea exacto.
2. **Atomicidad**: El plan debe cubrir SOLAMENTE lo que pide la historia, ni más ni menos.
3. **Contexto para Flash**: El plan debe ser tan claro que una IA con 8k de contexto pueda seguirlo sin dudar.
4. **Seguridad**: No proponer cambios que rompan el EventBus o la arquitectura ECS sin una justificación clara.

## Ejemplo de Comando

*"Usa el trello-story-planner para la tarjeta '1/4 - Crear función resolveAABB'"*
o
*"Planifica la implementación de la historia que pasé a Doing"*
