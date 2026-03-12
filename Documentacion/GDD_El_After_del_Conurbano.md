# 🍺 Game Design Document Master: El After del Conurbano

Este documento central funciona como eje arquitectónico del proyecto, resumiendo la visión y enlazando a todos los subsistemas detallados en módulos individuales.

---

## I. Visión General

### 1. Concepto ("Elevator Pitch")
"El After del Conurbano" es un roguelite de acción y supervivencia (estilo Vampire Survivors + Twin-Stick) donde encarnas a un joven que sale de un boliche a las 6 AM en pleno conurbano bonaerense. Durante su intento de volver a casa, debe atravesar la "Hora del After", haciendo frente a hordas bizarras de la fauna nocturna.

### 2. Fantasía del Jugador
Sobrevivir al caos y la épica decadente de la noche del conurbano. Empezar débil esquivando fisuras y terminar convertido en una máquina destructiva frente a hordas masivas, para lograr llegar a la cama y dormir.

### 3. Core Gameplay Loop (In-Run)
- **Combatir (Acción Híbrida):** Ataques automáticos constantes sumados al uso táctico de Habilidades Manuales (Apuntadas con ratón).
- **Recolectar:** Farmeo de Dinero, Respeto y "Aguante" (Experiencia).
- **Progresar:** Armar tu "Build" en pausa al subir de nivel con armas y pasivas. Elegir un Arquetipo/Rol al nivel 10.
- **Sinergizar:** Contratar y rescatar miembros de "La Banda".

### 4. Loops Secundarios (Metaprogresión)
- **Extracción o Riesgo:** Matar al jefe y seguir a la siguiente zona, o gastar un porcentaje del botín en un Uber/Bondi para volver a casa a salvo.
- **El Boliche (Hub):** Regresar a la entrada para comprar bebidas permanentes (Stats), mejorar las armas base iniciales (Precios exponenciales), y gastar Respeto contratando aliados para el próximo run.

---

## II. Índice de Subsistemas y Documentación Técnica

El detalle exhaustivo y las reglas de diseño determinísticas de cada parte del juego se encuentran en los siguientes módulos:

### 1. Sistema de Controles y HUD
- [controles.md](controles.md): Esquema Twin-Stick (WASD + Mouse) y uso del Action RPG.
- [ux_ui.md](ux_ui.md): Reglas de "Game Feel" (Hit-Stop, Screen Shake) y HUD centralizado.

### 2. El Personaje y La Banda
- [personajes.md](personajes.md): Atributos y pasivas únicas de los Protagonistas (El Pibe, El Rugbier, La Milipili).
- [stats.md](stats.md): El núcleo matemático del personaje (HP, Daño, CDR, etc).
- [aliados.md](aliados.md): Cómo funciona "La Banda" (NPCs genéricos, especiales y la forma de reclutar).

### 3. El Arsenal (Combate)
- [ataques.md](ataques.md): Detalle técnico sobre los 4 tipos de ataques (Automáticos, Activos, Pasivas y Ultimates) y la asignación de Roles a Nivel 10.
- [armas.md](armas.md): Catálogo de las armas in-game (Botella Rota, Tramontina, Bate, Escopeta) y la progresión logarítmica/infinita en el Hub.

### 4. Mundo y Escenarios
- [mapas.md](mapas.md): Los 6 escenarios del juego (Boliche, Vereda, Plaza, Subte, Bondi, Barrio) y el sistema "Riesgo-Recompensa" de extracción de cada zona.
- [enemigos.md](enemigos.md): Arquetipos de la inteligencia artificial de las hordas (Fodders, Rushers, Tanques) y diseño del primer Jefe.
- [estilo_visual.md](estilo_visual.md): El pitch gráfico. Pixel Art Saturado Top-Down con el sistema de Shaders por consumo de Bebidas.

### 5. Progresión y Economía
- [progresion.md](progresion.md): Funcionamiento de la XP In-Run, drops (choris/Puntos de aguante) y eventos de cofre.
- [boliche.md](boliche.md): La metaprogresión. Funcionamiento de las estaciones (El Tranza, La Fila, El DJ).
- [bebidas.md](bebidas.md): Catálogo de bebidas permanentes a precio fijo que aumentan las variables matemáticas de `stats.md`.

---

## III. Presentación Comercial (Pitch)
- 👉 [presentacion_el_after.md](presentacion_el_after.md): Resumen final del concepto, MVP para el motor (Phaser_React / Godot) y tecnologías para trabajo de IA.
