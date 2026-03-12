# Estilo Visual y Perspectiva de Cámara

Este documento analiza las opciones de perspectiva y dirección artística para "El After del Conurbano". Antes de definir el estilo de arte final (Pixel Art, Low Poly, Ilustración 2D, etc.), debemos definir **cómo el jugador ve el mundo y cómo se mueven los enemigos**, ya que esto afectará directamente al *Game Design* de las hordas masivas.

---

## 1. Análisis de Perspectivas de Cámara

Aquí te presento las 4 opciones principales con sus pro y contras respecto a nuestro *Core Loop* (Sobrevivir a hordas masivas + Action RPG).

### Opción A: Top-Down (Vista Cenital Pura / "Tres Cuartos")
Es la cámara clásica de *Vampire Survivors*, *Enter the Gungeon* o *The Legend of Zelda* antiguo. Vemos al personaje desde arriba o en un ligero ángulo descendente.
- **Pros:** 
  - **Ideal para hordas masivas:** Puedes ver enemigos viniendo de los 360 grados.
  - **Clase Action RPG:** Apuntar habilidades de área (AoE) o proyectiles es muy intuitivo.
  - **Eficiencia:** Es la perspectiva más fácil de programar para colisiones y de dibujar (basta con 4 animaciones de dirección: arriba, abajo, izq, der).
- **Contras:** 
  - Visualmente puede sentirse menos impactante o "más plano" si no tiene un trabajo de iluminación potente.
- **Ejemplo Tonal:** *Brotato*, *Vampire Survivors*, *Nuclear Throne*.

### Opción B: Isométrica (2.5D o 3D simulado)
Vemos el nivel rotado 45 grados (ej: *Hades*, *Diablo*, *Bastion*).
- **Pros:** 
  - **Espectacularidad:** Se ve increíblemente profesional. Permite mucha profundidad en los escenarios del conurbano (edificios altos, profundidad de las calles, la entrada del boliche se vería épica).
  - **Action RPG:** Excelente para ver proyectiles y áreas marcadas en el piso.
- **Contras:** 
  - Las hordas masivas pueden empezar a taparse unas a otras (Los enemigos grandes delante tapan a los chicos detrás).
  - Mayor costo de producción en arte y animaciones (8 direcciones si es 2D puro, o modelado 3D renderizado a 2D).
- **Ejemplo Tonal:** *Hades*, *Death's Door*.

### Opción C: Beat 'em Up / Cinturón de Scroll (Estilo Double Dragon / Streets of Rage)
La cámara viaja lateralmente de izquierda a derecha. El personaje se mueve en los ejes X y Z (Hacia el fondo y hacia delante).
- **Pros:** 
  - **Ataques Cuerpo a Cuerpo:** Se siente muy bien para pegar piñas, patadas y empujar enemigos, enfatizando el "golpe a golpe". 
  - Ideal para las calles del conurbano si queremos que sea un viaje de calle por calle.
- **Contras (¡CUIDADO AQUI!):** 
  - **Mal encaje con Vampire Survivors:** En este estilo los enemigos no te rodean fácilmente por los 360 grados. Si ponemos 1.000 enemigos en pantalla acá, terminan solapándose todos en una masacote ininteligible de un solo lado de la pantalla. No podrías huir libremente formando trenes ("kiting").
- **Ejemplo Tonal:** *Streets of Rage 4*, *TMNT: Shredder's Revenge*.

### Opción D: Plataformero 2D / Metroidvania (Estilo Castlevania / Hollow Knight)
Scroll netamente lateral con gravedad.
- **Pros:** Añade plataformeo, poder trepar techos, saltar colectivos, etc.
- **Contras:** Rompe por completo la premisa "Vampire Survivors". En este modo las hordas solo pueden venir de la derecha o la izquierda. Perderíamos las mecánicas de arrinconamiento y esquive circular.
- **Ejemplo Tonal:** *Risk of Rain (El primer juego)*, *Blasphemous*.

---

## 2. Recomendación del Game Designer (Arquitectura IA)

Teniendo en cuenta que:
1. Habrá hordas GIGANTES de enemigos absurdos.
2. Tienes ataques automáticos radiales + Habilidades manuales.
3. Tienes aliados (La Banda) que correrán a tu alrededor.

**👉 La recomendación es ir con la Opción A (Top-Down "Tres Cuartos") o la Opción B (Isométrica si hay más presupuesto).** Ambas garantizan que la pantalla se lea claramente cuando tengas 300 fisuras, 4 patovicas y 2 policías en pantalla, y puedas apuntar tu escopeta manualmente hacia donde hay un hueco.

---

## 3. Direcciones de Arte Propuestas (Una vez definida la cámara)

- **Pixel Art "Sucio / Sátira":** Estilo *Metal Slug* o *Hotline Miami*. Encaja perfecto con el gore hiperbólico, la cumbia y el tono exagerado del conurbano (Ej: Personajes deformemente musculosos o exageradamente lánguidos).
- **Ilustración 2D / Cómic:** Estilo animado tipo *Darkest Dungeon* pero satírico. Trazos oscuros y gruesos, donde las calles se sienten opresivas pero hay colores neón saturados (las luces del patrullero, cartulinas de choripán fluorescente).

---

## 4. Tecnología de Renderizado: Animaciones SVG en el Navegador

Utilizar **SVG (Scalable Vector Graphics)** ejecutándose directamente en un navegador web es una decisión técnica y artística muy interesante, pero que trae desafíos específicos para un juego estilo *Vampire Survivors*.

### A. Ventajas del SVG (El Estilo "Flat Vector")
- **Resolución Infinita:** El juego se verá increíblemente nítido tanto en un celular de gama baja con pantalla pequeña, como en un monitor 4K. Nunca habrá pixeles estirados o borrosos.
- **Peso Liviano:** Los archivos SVG son código (XML). El peso total del juego será bajísimo, ideal para cargas instantáneas en la web.
- **Animación Modular (Bone/Transform):** En lugar de dibujar cada frame a mano (como en el Pixel Art), animas rotando y moviendo partes (brazos, piernas, botellas) a través de CSS o JS. Da un estilo muy fluido y caricaturesco tipo *South Park*, *Rimworld* o *The Binding of Isaac* (Flash original).
- **Filtros Dinámicos:** Mover tintes de colores, brillos de neón o transparencias es nativo y facilísimo de hacer con CSS en el navegador (Ej: un enemigo envenenado simplemente cambia la propiedad `fill` a verde chillon).

### B. El Riesgo Crítico: Rendimiento (Performance)
- **El cuello de botella del DOM:** Si intentamos renderizar 3.000 fisuras inyectando 3.000 etiquetas `<svg>` directamente en el DOM (HTML) del navegador, la página colapsará y el juego correrá a 2 FPS. El navegador no está hecho para recalcular miles de elementos HTML por segundo.

### C. La Solución Arquitectónica (Cómo hacerlo funcionar)
Para lograr este estilo visual sin matar el rendimiento, hay que usar el "Arte en SVG", pero **no dibujarlo como HTML clásico**, sino usar **HTML5 `<canvas>` con WebGL**:
1. **La Técnica de Rasterización en Memoria:** Dibujamos los vectores en SVG (con Illustrator, Inkscape), pero al cargar el juego, el motor oculta el SVG y lo "fotografía" (lo convierte en una textura bitmap en memoria RAM). 
2. **Motores Recomendados:** Utilizar un motor web como **PixiJS** (ultra rápido para 2D web) o **Phaser.js**. Estos motores toman la imagen nítida de tu SVG y usan la Placa de Video (WebGL) para multiplicar ese sprite 5.000 veces en un Canvas a 60 FPS sin pestañear.

> [!CAUTION] 
> **Veredicto del Arquitecto:** Apuntar a SVG vectorizado es una excelente idea estética (le dará ese toque de caricatura argentina flash hiper-nítida), **pero** bajo ninguna circunstancia debemos usar animación CSS pura o nodos DOM para las hordas. Debemos renderizar esos vectores dentro de un `<canvas>` acelerado por hardware gráfico.

---

## 5. Técnicas de Animación y Efectos Visuales (VFX)

Si apuntamos a un entorno de navegador o PC con gráficos de alta escala, las animaciones, las partículas y los efectos determinan el 90% del impacto de un Action RPG.

### A. Metodología de Animación 2D: ¿Sprite Sheets o Modular/Esqueletal?
- **Pixel Art (Sprite Sheets Clásicos):** Se dibuja literalmente cada cuadro de la animación del personaje a mano, uno por uno.
  - *Pros:* Genera el mayor impacto "retro" de todos, un *Game Feel* brutal al permitir exprimir los detalles en cuadros clave.
  - *Contras:* Es carísimo y lento. Si decides que tu personaje agarre una botella en vez de un cuchillo, hay que redibujar 20 cuadros completos a mano.
- **Esqueletal / Vector Modular (Spine 2D / DragonBones):** Se dibujan piezas planas separadas (Torso, Cabeza, Brazo 1, Brazo 2, Cuchillo) usando SVG o ilustraciones cortadas, y se rotan matemáticamente simulando huesos.
  - *Pros:* Excepcional para Roguelites. Permite escalabilidad masiva y baratísima. Puedes mezclar 5 reméras de fútbol distintas con 4 gorras y 10 armas distintas de manera instantánea y tu red de animaciones sigue funcionando.
  - *Recomendación:* Si usas SVG, **debes usar animación Esqueletal 2D**.

### B. VFX: El Caos de Partículas y la Pantalla Llena
En juegos de 2.000 enemigos, el sistema de partículas (sangre, chispas, humo, billetes volando) debe ser inteligente para no fundir la PC.
1. **GPU Particles:** Las chispas de armas y la sangre "pixelada" o vectorial deben computarse directamente en la placa de video, no calculando colisiones individuales para cada chispa.
2. **Hit-Stop y Flashes:** Cuando golpeas duro (Ej: el garrote de un Patovica), el juego se detiene 0.05 segundos (Lag intencionado) y el enemigo se pinta de blanco un frame entero. Esto hace que un simple SVG plano se sienta increíblemente violento y pesado, muy importante para el feedback visceral de los ataques automáticos.

### C. La Genialidad del "Estado de Ebriedad": Cámara y Shaders
La sugerencia de que las **bebidas** alteren la cámara es brillante y temáticamente pura para *El After del Conurbano*. 
Podemos usar *post-processing shaders* (Filtros de pantalla entera programados) que mutan pasivamente la visión según los consumos:
- **Sobredosis de Velocidad (Energy Drinks al Máximo):** Desenfoque de movimiento en los bordes de la pantalla (*Radial Blur*), aberración cromática (los colores rojo/azul se separan un poco en los límites de la pantalla como si fueras a toda pastilla).
- **Sobredosis de Resistencia (Packs de Fernet):** Viñeta oscura gruesa y pantalla latiendo al ritmo de un bombo lejano cuando la salud baja del 20%, simulando estar resistiendo el peor coma alcohólico (visión pesada, lenta pero de tanquesito de guerra).
- **Combate y Locura (Pocas pulgas / Más Daño):** Lente de ojo de pez súper leve (*Fish-eye distortion*) cerca del personaje, una saturación mayor de luces estilo "letrero de neón cumbiero barrial" cuando haces críticos. A mayor buff de daño, el escenario pierde un poco de detalle gris y los colores brillantes resaltan mucho más, simulando un subidón de adrenalina en medio del pogo. 
- *Riesgo:* Tiene que haber un Slider en Opciones de Accesibilidad («Reducir Mareos») porque estas combinaciones para quienes acumulen 15 bebidas por run pueden llegar a marear, estilo *Cruelty Squad*, lo cual, de vuelta, es brillante conceptualmente.
