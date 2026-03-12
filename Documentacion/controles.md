# Controles y Experiencia de Usuario (UX)

Este documento define cómo el jugador interactúa físicamente con el juego. Ya que hemos establecido que el combate será **híbrido** (Ataques automáticos + Habilidades Manuales), el esquema de control debe ser intuitivo pero permitir la puntería (Aiming) y el reposicionamiento constante.

---

## 1. Ficha del Sistema: Esquema de Controles (PC)
- **Sistema:** Input, Movimiento y Puntería.
- **Objetivo:** Darle al jugador el control total de su posicionamiento mientras decide dónde lanzar sus ataques manuales, sin interrumpir el flujo constante de sus armas automáticas.
- **Descripción:** El juego utiliza un esquema clásico de *Twin-Stick Shooter* adaptado a Teclado y Ratón. 

---

## 2. Esquema Principal (Teclado + Ratón)

El jugador nunca deja de moverse, ya que detenerse en este género significa la muerte.

### Movimiento (Teclado)
- **W, A, S, D:** Movimiento omnidireccional del personaje (8 direcciones o analógico si es joystick).
- **Barra Espaciadora:** Habilidad de Movimiento / Evasión (Ej: *Dash* para atravesar enemigos, rodar, o empujar). Tiene *Cooldown* o gasta *Aguante*.

### Puntería y Combate (Ratón)
- **Cursor del Ratón (Puntero):** Define la dirección hacia donde el personaje está "mirando" o apuntando. 
  - *Mecánica Híbrida:* Las armas automáticas dispararán hacia el enemigo más cercano o aleatoriamente según su diseño, pero las **Habilidades Manuales** siempre se disparan hacia donde esté el Puntero.
- **Click Izquierdo (M1):** Ataque Manual Principal (Ej: Disparar la escopeta, dar un escudazo).
- **Click Derecho (M2):** Habilidad Secundaria (Ej: Tirar una Molotov hacia la posición exacta del cursor).
- **Rueda del Ratón / Tecla Q:** Habilidad Definitiva (Ultimate).

### Interfaz General (UI / UX)
- **Tab / I:** Abrir inventario temporal (para ver qué armas/pasivas llevas en el run).
- **Esc:** Pausa.

---

## 3. Adaptación a Joystick (Gamepad) - Opcional pero Recomendado

Al ser un juego de PC con perspectiva Top-Down, mucha gente preferirá jugarlo con mando. El esquema se traslada de forma natural a *Twin-Stick*:

- **Stick Izquierdo:** Movimiento del personaje.
- **Stick Derecho:** Puntería (Apunta un láser imaginario o mueve una retícula).
- **Gatillo Derecho (RT / R2):** Click Izquierdo (Ataque Manual Principal).
- **Gatillo Izquierdo (LT / L2):** Click Derecho (Habilidad Secundaria).
- **Botón A / Cruz:** Dash (Barra Espaciadora).
- **Botones Superiores (RB / R1):** Ultimate.

---

## 4. Feedback Visual de UX (Game Feel)

Para que estos controles se sientan bien y el jugador no pierda de vista su puntero en medio del caos visual de la pantalla llena de partículas y enemigos:
1. **Puntero de Alto Contraste:** El cursor no puede ser la flecha blanca básica de Windows. Debe ser una mira (Crosshair) brillante, idealmente de un color neón inversamente proporcional a la paleta del nivel (Ej: Fucsia o Verde Lima) que no se pierda entre los enemigos.
2. **Retícula Extendida (Mira Láser):** Algunos personajes o armas de largo alcance podrían dibujar una tenue línea láser desde el personaje hasta el puntero para facilitar tiros lejanos apuntados con el ratón.
3. **Indicador de Cooldown en el Puntero:** Cuando tiras la Molotov (Click Derecho) y entra en *cooldown*, la misma mira del ratón podría tener un pequeño círculo de carga alrededor, para que el jugador no tenga que desviar la vista hacia la esquina inferior izquierda de la pantalla para saber cuándo puede volver a disparar.
