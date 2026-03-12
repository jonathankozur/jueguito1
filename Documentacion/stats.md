# Estadísticas del Jugador (Stats)

Este documento define el núcleo matemático del personaje. Estas estadísticas dictan cómo se siente controlar al protagonista y cuán efectivo es combatiendo las hordas.

Las estadísticas se dividen en dos grupos: **Supervivencia** y **Ofensiva**. 

---

## 1. Estadísticas de Supervivencia

Determinan cuánto aguanta el jugador antes de tener que tomar un Uber a casa.

- **Salud Máxima (HP):** La cantidad de daño total que el jugador puede recibir antes de morir. Todo jugador empieza con 100 HP.
- **Armadura / Resistencia:** Porcentaje (%) de reducción de daño recibido. 
- **Velocidad de Movimiento (MS):** Qué tan rápido camina el jugador con las teclas WASD. Es crucial para el *game feel* y para poder escapar de hordas cerradas (Kiting).
- **Regeneración de Salud (Regen):** Cantidad de HP que el jugador recupera automáticamente cada 5 segundos. Comienza en 0.
- **Evasión (Dodge):** Probabilidad porcentual (%) de evitar por completo el daño de un impacto.
- **Aguante / Stamina:** El recurso que se consume al utilizar el Dash (esquive) o ciertas Habilidades Manuales pesadas.

---

## 2. Estadísticas Ofensivas

Modifican pasivamente el poder de todas las armas y habilidades activas.

- **Daño Base (Poder):** Multiplicador global (%) que aumenta el daño de **todas** las armas equipadas.
- **Probabilidad de Crítico (Crit Chance):** Probabilidad (%) de que un ataque inflija daño multiplicado.
- **Daño Crítico (Crit Damage):** Multiplicador de daño cuando ocurre un crítico (Por defecto: 150%).
- **Velocidad de Ataque / Cadencia:** Reduce el tiempo entre disparos de las armas *Automáticas*.
- **Reducción de Cooldown (CDR):** Reduce el tiempo de espera de las *Habilidades Manuales* (Click Izquierdo/Derecho).
- **Área de Efecto (AoE Size):** Aumenta el radio porcentual de las explosiones, charcos de fuego y ataques melee en arco.
- **Cantidad de Proyectiles (Multishot):** Añade proyectiles extra a las armas que los disparan (Ej: La botella rota ahora lanza 2 en vez de 1).

---

## 3. Estadísticas Utilitarias

Definen cómo el protagonista interactúa con los recursos del mapa.

- **Rango de Recolección (Imán/Vacuum):** El radio de distancia a la que el personaje absorbe automáticamente la experiencia (Puntos de Aguante) caída en el piso.
- **Suerte:** Aumenta exponencialmente la probabilidad de encontrar Consumibles de Cura (Pancho/Chori) en el piso, o que los Jefes suelten mejores recompensas monetarias.

---

## 4. Evolución de los Stats

Como se diseñó en la economía, los Stats **nunca** escalan subiendo de nivel con el "Tranza". Los stats **solo** pueden subirse permanentemente comprando *Bebidas* en la barra del Boliche (Metaprogresión), o temporalmente durante un *Run* seleccionando Mejoras Pasivas al subir de nivel en la calle.
