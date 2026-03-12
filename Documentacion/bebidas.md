# Catálogo de Bebidas (La Barra del Boliche)

Este documento define la tienda de "La Barra" dentro del Hub. Aquí el jugador gasta **Dinero** para consumir bebidas de **Precio Fijo**. 

A diferencia de las armas, una bebida no se "mejora" a Nivel 2. Si quieres más Salud, debes comprar e ingerir otro vaso de la misma bebida por exactamente el mismo precio reiteradas veces, apilando el mismo porcentaje de buff permanentemente.

---

## 1. El Menú de Tragos (Modificadores Permanentes)

### 1.1. Fernet 70/30 (El Clásico)
- **Incremento de Stat:** +2% de **Salud Máxima (HP)** permanente por ingesta.
- **Precio Fijo:** $500.
- **Efecto de Cámara (Sobredosis de Fernet - >10 Tomados):** La pantalla gana una "Viñeta Oscura" en los bordes. Cuando la vida baja del 20% en un Run, la pantalla late oscura al ritmo de un bombo legüero lento (Resistencia de tanque borracho).

### 1.2. Energy Drink Barata ("Speedy")
- **Incremento de Stat:** +2% de **Velocidad de Movimiento (MS)** permanente por ingesta.
- **Precio Fijo:** $800.
- **Efecto de Cámara (Sobredosis de Speed - >10 Tomados):** Agrega un ligero *Radial Blur* (Desenfoque de movimiento en los extremos del monitor) constante. El juego visualmente se siente rapidísimo y nervioso.

### 1.3. Cerveza Artesanal IPA (La Carita)
- **Incremento de Stat:** +1% de **Probabilidad de Crítico**.
- **Precio Fijo:** $2.000.
- **Efecto de Cámara:** Al hacer un golpe crítico, las partículas (sangre/chispas) brillan intensamente por un microsegundo, como un destello de luz amarilla/dorada.

### 1.4. Destornillador Fuerte (Vodka y Jugo en caja)
- **Incremento de Stat:** +2% de **Daño Base (Poder Multiplicatorio global)**.
- **Precio Fijo:** $3.000.
- **Efecto de Cámara (Sobredosis - >10 Tomados):** Lente de "Ojo de Pez" muy tenue (distorsión circular) en los bordes de la pantalla. Los colores neón de los proyectiles se saturan a más del 100%. "El mundo se ve más vívido y violento".

### 1.5. Licor de Melón ("El Dulzón")
- **Incremento de Stat:** +5% al **Rango de Recolección (Imán)**.
- **Precio Fijo:** $1.000.
- **Efecto de Cámara:** Ninguno pesado, pero un suave pitido agradable de 8-bits suena cuando recolectas Puntos de Aguante (XP) de muy lejos, dando un refuerzo positivo constante de confort.

### 1.6. Vasito de Agua (Prohibido en varios lados, vital acá)
- **Incremento de Stat:** +1 de **Regeneración de Salud** cada 5 segundos.
- **Precio Fijo:** $5.000 (Es extremadamente valiosa porque la curación en el juego escasea).
- **Efecto de Cámara:** Ninguno. Purifica la mente. Si tomas agua, puedes "diluir" los efectos de mareo de cámara del resto de bebidas si así lo deseas (funciona como un Toggle u opción de accesibilidad visual).

### 1.7. "La Mezcla Dudosa" (Jarra Loca)
- **Incremento de Stat:** +1 Vida Extra (Te levantas en el lugr con 50% de HP al morir por primera vez en un Run).
- **Precio Fijo:** $25.000.
- **Límite:** Solo se puede comprar y apilar hasta tener 2 Vidas Extras en total guardadas.
- **Efecto de Cámara:** Al revivir estilo "Segunda Oportunidad", la pantalla hace un flash blanco violento, suena un pitido de tinnitus de 1 segundo, y la pantalla tiembla agresivamente.

---

## 2. Lógica Comercial (El Barman)
- **Cero Restricciones Logarítmicas:** El precio fijo asegura que el jugador pueda "Buildear" su metaprogresión. Puede ahorrar todo su dinero en 5 partidas malas jugando solo con Puños para comprar un "Vasito de Agua" y jugar a lo seguro desde el principio, o comprar 3 "Fernets" y 2 "Energy Drinks" por el mismo precio y mandarse de pecho a moverse rápido y aguantar golpes.
