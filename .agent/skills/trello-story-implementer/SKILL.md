---
name: trello-story-implementer
description: >
  Toma una "Historia" de Trello que ya posee un "Plan de Implementación",
  ejecuta los cambios en el código fuente siguiendo el plan,
  verifica el resultado y mueve la tarjeta a la lista de completadas.
---

# Skill: Trello Story Implementer

## Objetivo

Ejecutar de manera autónoma y precisa los cambios de código descritos en un Plan de Implementación técnica almacenado en una tarjeta de Trello.

## Cuándo usar esta skill

- El usuario señala una tarjeta en la lista "🔧 Doing" que ya tiene un plan técnico (creado por el Planner).
- El usuario pide "implementar la historia", "ejecutar el plan" o "hacer la tarea X".

## Paso a paso

### 1. Lectura del Plan en Trello

Leer la descripción y los comentarios de la tarjeta para extraer el **Plan de Implementación**.
- Prestar especial atención a los bloques de código y pseudocódigo.
- Identificar los archivos exactos a modificar.

```
GET https://api.trello.com/1/cards/{cardId}?key={KEY}&token={TOKEN}
```

### 2. Preparación del Entorno

Antes de escribir, leer los archivos destino para asegurar que el plan sigue siendo válido respecto al estado actual del disco.
- Si hay discrepancias (ej. el plan menciona una función que cambió de nombre), **corregir el plan** mentalmente o pedir aclaración.

### 3. Ejecución de Cambios (Coding)

Aplicar los cambios usando las herramientas de edición de archivos.
- Seguir el orden cronológico del plan.
- Mantener el estilo de código existente (indentación, nombres de variables, uso de ESModules).
- **Importante**: No hacer cambios fuera del alcance del plan.

### 4. Verificación de la Tarea

Intentar validar los cambios:
- Si existen tests unitarios afectados: `npm test [archivo]`.
- Si es un cambio visual: Notificar qué observar en el juego.
- Realizar un `lint` básico visual de los archivos editados.

### 5. Finalización en Trello

Una vez que el código está listo y verificado:
- **Mover la tarjeta** a la lista "✅ Done".
- Marcar los items de la checklist de la tarjeta padre si aplica.

```
PUT https://api.trello.com/1/cards/{cardId}?idList={DONE_LIST_ID}&key={KEY}&token={TOKEN}
```

## Reglas de Ejecución

1. **Fidelidad al Plan**: No improvisar lógica nueva a menos que sea estrictamente necesario para que el código compile/funcione.
2. **Atomicidad**: Solo se deben tocar los archivos listados en la sección "Archivos a modificar" del plan.
3. **Limpieza**: Eliminar logs de debug o comentarios temporales a menos que el plan pida explícitamente agregarlos.
4. **Sincronización**: Siempre verificar la respuesta de las herramientas de escritura de archivos para confirmar que el contenido se guardó correctamente.

## Ejemplo de Comando

*"Implementá la historia de colisiones que ya tiene el plan listo"*
o
*"Ejecutá el plan de la tarjeta 1/4"*
