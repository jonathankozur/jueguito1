# El Boliche: Hub Central de Metaprogresión

Este documento detalla los sistemas de metaprogresión (fuera del run) y cómo funciona la economía global del juego dentro del Hub principal: **El Boliche**.

---

## 1. Ficha del Sistema: El Boliche (Hub Interactuable)
- **Sistema:** Metaprogresión y Economía Global.
- **Objetivo:** Darle un propósito duradero a los runs fallidos mediante compras permanentes (Stats, Armas Base, Aliados) usando recursos extraídos de la partida.
- **Descripción Inicial (El Primer Mapa):** El Boliche se juega obligatoriamente como tu primer mapa real al iniciar el archivo de guardado por primera vez. Una vez que sobrevives y "Limpias" el antro de enemigos derrotando al DJ, deja de ser una pista de pelea a muerte.
- **El Hub Pacífico:** Tras ser limpiado, se vuelve tu **HUB Permanente**. En él te pones a caminar físicamente con tu avatar interactuando con los NPCs esparcidos (El Barman tirando humo en la barra, El Tranza oculto en el baño vendiendo armas, la cola del VIP afuera de la puerta ofreciéndote alistar vagos de la banda).

---

## 2. Las Dos Monedas de Cambio

Para separar la progresión del personaje de la composición de su equipo, el juego usará dos economías distintas obtenidas durante el run:

### A. Dinero ("Pesos")
- **¿Cómo se obtiene?** Rompiendo la map elements (Ej: Tachos de basura, cajeros automáticos), derrotando Jefes de Zona, o recolectando billetes sueltos que caen raramente de los enemigos.
- **¿Para qué sirve?** Comprar Armas Base y Mejoras Estadísticas Permanentes (Bebidas).

### B. Respeto ("Influencia / Aguante")
- **¿Cómo se obtiene?** Sobreviviendo a oleadas masivas. Escala exponencialmente: Matar 100 enemigos = +1 Respeto. Vencer Jefes o ayudar NPCs aleatorios en el mapa durante el run da un gran bonus de Respeto.
- **¿Para qué sirve?** Contratar Aliados (La Banda) para que arranquen el run contigo.

---

## 3. Sectores del Boliche (Estaciones de Mejora)

### 3.1. El Baño del Boliche (El Tranza de Armas)
Aquí se compran y mejoran las **Armas Base** con *Dinero*.
- **Mecánica de Armas Base:** Empiezas siempre con puños. Desde aquí compras el "arma principal" con la que arrancas el *run*.
- **Precio Base en Escala:** El costo inicial de comprar una nueva arma depende de su daño base, su alcance y si otorga alguna habilidad única.
  - *Ej:* Cuchillo (Corto alcance, Daño Medio) = $500.
  - *Ej:* Revólver (Largo alcance, Daño Alto) = $3.500.
- **Mejora Logarítmica:** Puedes mejorar el arma para que su nivel base sea superior (hasta un límite razonable). Sin embargo, el costo de cada nivel no es lineal, sino que sigue una **escala logarítmica** (o exponencial).
  - *Ej:* El Nivel 2 cuesta el doble ($1.000). El Nivel 3 requiere grindeo severo ($4.000). El Nivel 4 ($15.000), recompensando solo a quienes sobreviven mucho.

### 3.2. La Barra de Tragos (Mejoras Permanentes de Stats)
Aquí compras ventajas absolutas pasivas para todos tus runs pagando *Dinero* al Barman. A diferencia de las armas, **las bebidas tienen un precio fijo**.
- **Mecánica de Bebidas:** Cada bebida te sube un stat específico. No importa cuántas veces te tomes un "Fernet", siempre te va a salir lo mismo y te va a aumentar exactamente la misma cantidad de Vida.
- **Ejemplos de Stats (Bebidas a Precio Fijo):**
  - *Fernet 70/30 ($500 fijos al Tomarlo):* +2% de Vida Máxima base.
  - *Cerveza Artesanal IPA ($2.000 fijos al Tomarla):* +1% Probabilidad de Crítico.
  - *Energy Drink barata ($800 fijos al Tomarla):* +2% Velocidad de Movimiento Base.
  - *Destornillador Fuerte ($3.000 fijos al Tomarlo):* +2% de Daño de Ataques Automáticos.
  *Nota de Balance:* Al tener precio fijo, el jugador puede decidir si "farmear" 10 fernets para ir con súper vida, o distribuir el dinero en distintas stats.

### 3.3. El VIP / La Fila del Boliche (Reclutamiento de "La Banda")
Aquí gastas *Respeto* para contratar aliados iniciales.
- **Mecánica de Contrato:** Comienzas los runs siempre solo (Costando 0). Puedes gastar tu *Respeto* acumulado para que 1 Aliado te acompañe desde el minuto 0.
- **Ejército Desbloqueable:** Inicialmente la fila del boliche está vacía. Desbloqueas aliados ganándote su respeto dentro del mapa (Ej: Salvando al "Pibe de los Mandados" de una horda en el run 5, la próxima vez estará en la fila del Boliche para ser contratado).

---

## 4. Ideas para Expandir el Boliche (Sistemas Avanzados)

1. **El Guardarropa (Skins y Cosméticos):** Gastar dinero sobrante en ropa para el protagonista (Camiseta de fútbol, anteojos de sol a la noche) que quizás otorgan +1% pasivo de alguna estadística.
2. **El Patovica de la Puerta (Sistema de Dificultad "Heat"):** Antes de salir del boliche, puedes "Insultar al Patovica". Esto activa modificadores de dificultad (Ej: "+50% Vida de Enemigos", "Aparecen más Patrulleros") a cambio de un multiplicador de +50% en todo el Respeto y Dinero que obtengas en ese run (Idéntico a los "Pactos de Castigo" de Hades).
3. **El DJ (Banda Sonora Activa):** Elegir qué tipo de cumbia/cuarteto poner en la rocola. La música afecta pasivamente el *Game Feel* y el ritmo de spawn de las hordas.

---
*(Documento en iteración - Fase de Diseño y Economía Global).*
