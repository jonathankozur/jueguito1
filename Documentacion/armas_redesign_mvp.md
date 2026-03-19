# Redisenio de armas MVP solo

## Objetivo

Este documento redefine el loadout base para que cada slot tenga una identidad clara, un rol tactico visible y una lectura consistente entre input, simulacion y HUD. El foco es el modo solo. Multiplayer solo debe seguir siendo compatible, sin redisenar la replicacion en esta etapa.

## Pilares

1. Cada arma debe resolver un problema distinto.
2. El knockback debe sentirse como control del espacio, no como un salto instantaneo.
3. La lectura visual debe coincidir con el alcance real del golpe.
4. El slot 4 debe abrir juego de carga y decision. El slot 5 queda reservado.

## Loadout base

### Slot 1 - Los Punos

- Identidad: control y stagger.
- Loop: combo de 3 pasos `jab_left -> jab_right -> push`.
- Ventana de combo: 450 ms.
- Rol: frenar enemigos, corregir posicion y abrir espacio corto.
- Regla de tuning:
  - pasos 1 y 2 con dano bajo y hitstun corto-alto
  - paso 3 con empuje claramente superior

### Slot 2 - Cuchillo

- Identidad: dano sostenido a corta distancia.
- Lectura: barrido alternado izquierda/derecha en arco de 120 grados.
- Regla de tuning:
  - mas dano que los punos
  - menos knockback que los punos
  - solo un hit por enemigo por swing

### Slot 3 - El Chumbo

- Identidad: pick puntual con penetracion por materiales.
- Regla de pared/material:
  - `soft`: pierde poca fuerza
  - `medium`: pierde mucha fuerza
  - `hard`: se detiene
- Requisito de lectura:
  - el proyectil debe frenar visualmente donde realmente se detiene

### Slot 4 - Botella cargada

- Identidad: control de zona y empuje fuerte.
- Input: `hold + release`.
- Cast minimo: 120 ms.
- Carga maxima: 900 ms.
- Escala con la carga:
  - fuerza de salida
  - alcance
  - radio de explosion
- Costo de decision:
  - velocidad de movimiento reducida al 65% mientras se carga

### Slot 5 - Reservado

- Visible en HUD.
- No seleccionable por tecla ni por rueda.
- Queda libre para una futura variante o power-up.

## Knockback e hitstun

### Problema anterior

El empuje movia la posicion del objetivo un frame, pero la IA del enemigo recalculaba persecucion en el siguiente `update`, dando la sensacion de que seguia caminando dentro del knockback.

### Regla nueva

- El impacto construye un payload de impulso con:
  - `angle`
  - `force`
  - `durationMs`
  - `speed`
  - `hitstunMs`
  - `sourceWeaponId`
- Mientras `knockbackRemainingMs > 0` o `hitstunRemainingMs > 0`, el enemigo:
  - no persigue
  - no ataca
  - no conserva velocidad previa

### Jerarquia inicial

- Punos: poco dano, buen stagger, gran empuje en el tercer golpe.
- Cuchillo: buen dano, poco empuje.
- Chumbo: dano alto, empuje medio, hitstun corto.
- Botella: dano medio, empuje muy alto a carga maxima, radio variable.

## HUD y lectura

- HUD principal:
  - vida
  - arma actual
  - lista de slots 1-5
  - slot 5 marcado como `reservado`
- HUD contextual:
  - barra de carga para slot 4 mientras se mantiene el click
- FX:
  - arco visible para cuchillo y jabs
  - punto de impacto real para proyectiles

## Roadmap corto

1. Balancear numeros de combo/hitstun tras playtest.
2. Agregar sonido y VFX especificos por material.
3. Explorar variantes futuras para slot 5.
