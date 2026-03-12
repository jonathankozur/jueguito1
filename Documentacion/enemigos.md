# Catálogo de Enemigos y La Horda

La "Hora del After" vuelve agresivos a todos los seres vivos, inanimados y trabajadores de la noche del conurbano. Este documento detalla la Inteligencia Artificial base que rige "la horda" y los tipos de adversarios.

---

## 1. Ficha del Sistema: IA de Hordas
- **Objetivo:** Crear tensión constante mediante formaciones numéricas abrumadoras, priorizando el rendimiento del motor (optimizando la IA).
- **Lógica Vectorial:** La enorme mayoría de los enemigos usa un algoritmo de navegación simplificado: "Ir en línea recta o diagonal hacia la posición del jugador". Solo los enemigos y jefes de élite ejecutan esquives o usan Pathfinder (A*) para evadir obstáculos.
- **Densidad (Swarm Logic):** En vez de chocar 100% entre ellos y crear cuellos de botella feos (como hormigas en un embudo), los enemigos pueden "encimarse" visualmente. Es decir, aunque todos te persigan, pueden amontonarse unos arriba del otro creando lo que se llama "Agrupación Viscosa". Si disparás un escopetazo a un bulto viscoso, es probable que mates 15 enemigos que estaban pegados.

---

## 2. Arquetipos Tácticos (Lista Inicial)

### 2.1. El Enemigo Básico (La Masa/Fodder)
Sirven únicamente para sumar números, agotar tu espacio de movimiento y ser alimento (XP + Dinero).
- **"El Fisura Zombi":** Camina despacio. Su ataque es tropezarse encima tuyo. 10 HP. Aparecen de a 200 en las oleadas iniciales del nivel 1 y 2.
- **"Borrachín de Esquina":** Camina muy raro (Patrón de zigzag y pausas), haciendo que apuntarle con armas rectas (Rifle) o esquivarlo sea un molesto dolor de cabeza en medio de la horda.

### 2.2. El Acelerador (El Rusher)
Diseñados para forzar al jugador a gastar su "Dash" o posicionamiento rápido.
- **"El Motochorro Demente":** No te sigue de a pasitos. Te mira, marca una inmensa línea roja en el suelo, y 1 segundo después cruza de punta a punta de la pantalla en menos de 0.2 segundos causando un enorme daño frontal. Si choca una pared, queda aturdido momentáneamente.
- **"El Punga en Roller":** Se mueve el doble de rápido que un Fisura normal. Constantemente intenta flanquearte y atacarte por la espalda o los laterales. (Aparecen de a 3 o 4 por oleadas grandes).

### 2.3. El Élite/Tanque (La Pared)
Aparecen para absorber todo tu DPM (Daño Por Minuto) y proteger a la Horda de tus disparos.
- **"El Patovica Entrenado":** HP Gigante, armadura pesada y camina relativamente rápido. Su radio de colisión o área de daño es inmensa (Si te toca desde a 2 metros, te revienta). Son el terror de las armas "Ranged". Te obliga a usar armas con *Knockback* (como el Bate) para ganar tiempo, o retroceder muchísimo para fundirlos de a poco.
- **"El Inspector de Boleto (Nivel del Bondi)":** Corta el paso en los pasillos angostos del colectivo de la Zona 5. Te aturde gritando de cerca, impidiendo que ataques o te muevas por 0.5 segs.

### 2.4. Controladores de Área y Artillería (Ranged)
Enemigos raros cuyo objetivo es denegar zonas, forzándote a moverte hacia situaciones incómodas o trampas de hordas.
- **"El Vendedor de Medias":** A largas distancias lanza 3 pares de zoquetes empaquetados en cono. Si los pisas, te quedas atrapado 2 segundos en el sitio, regalándote a la "Masa" de enemigos frente a ti.
- **"El Auto Tuning (Música Fuerte)":** Un auto chocado que cobra vida (Mecánica fantasma). Tira ondas expansivas circulares gigantes cada 5 segundos al compás del *Gede* del DJ, haciendote daño progresivo si estás en la zona interna. 

---

## 3. Ejemplo de Jefe (Zona 2: La Vereda)
Los jefes detienen el spawn de hordas masivas de basurillas para enfocarse en peleas tipo "Bullet Hell" y de patrones mecánicos.

### Jefe: "El Dueño de la Cuadra" (El Mega-Trapito)
- **Concepto:** Gritos, exigencia de plata y mucha violencia vehicular. Mide 3 veces más que el Jefe.
- **Patrón 1 - Lluvia de Pedazos de Cordón:** Golpea la calle 3 veces, generando zonas rojas aleatorias por toda la pantalla donde al milisegundo caen trozos inmensos de escombros (Bullet Hell a esquivar).
- **Patrón 2 - Tránsito Pesado:** Silva fuertísimo a la calle. 2 Taxis amarillos cruzan la pantalla horizontal o verticalmente arrasando con todo a su paso. El jugador tiene 1.5 segs para meterse entre la vía segura.
- **Pasiva:** Tiene una barrera invulnerable la mitad del tiempo ("el chaleco refractario brillante"). Solo puede recibir daño en fracciones tras terminar el ataque del Patrón 2.
