# Pitch de Proyecto: El After del Conurbano

## 1. Nombre del juego y autor de la idea
**Título:** El After del Conurbano

## 2. Concepto general
Es un juego de supervivencia y acción desenfrenada donde el jugador encarna a un joven que acaba de salir de un boliche a las 6 AM en pleno conurbano bonaerense. Durante su intento de volver a casa, la realidad de la calle colapsa en un fenómeno místico llamado "La Hora del After": debe hacer frente a hordas inmensas y caóticas de la fauna nocturna local (fisuras, patovicas, trapitos, policías) para poder llegar a dormir. Si pierde, reaparece en la puerta del boliche para intentarlo de nuevo.

## 3. Género y referencias
- **Género:** Action Roguelite / Twin-Stick Shooter / Bullet Heaven.
- **Referencias e Inspiración:**
  - *Vampire Survivors / Brotato:* Por la escala de cientos de enemigos en pantalla, los ataques automáticos y la sinergia de items/armas al subir de nivel en una misma partida.
  - *Hades:* Por cómo estructura el "Hub" (El Boliche) y su sistema de metaprogresión (donde puedes hablar y comprar mejoras permanentes luego de cada muerte).
  - *Nuclear Throne / Enter the Gungeon:* Por el ángulo de cámara y el frenetismo del apuntado manual.

## 4. Mecánicas principales
- **El Combate Híbrido:** Una mezcla entre ataques automáticos (que no requieren input para disparar su cooldown) y habilidades/ataques manuales que el jugador apunta con el ratón o joystick derecho.
- **Subida de Nivel y Construcción de Stats:** En las runs derrotando enemigos recolectas dinero y respeto. El dinero sirve para gastarlo en el boliche comprando armas y bebidas. El respeto para reclutar aliados.
- **La Banda (Sistema de Aliados):** El jugador puede armar su propio grupo en el Hub gastando *Respeto*:
  - *Genéricos:* Tipos de calle que cuestan poco respeto y te ayudan con fuego de cobertura.
  - *Especiales (Únicos):* Deben ser encontrados y salvados previamente de alguna horda en los mapas del juego. Si los salvas, desbloqueas su contrato permanente en el Boliche (Hub) y aportarán mecánicas exclusivas.
- **Riesgo y Extracción (Volver a Casa Cuesta Plata):** Puedes abandonar el mapa, pero el costo de viajar definirá tu botín:
  - *Morir:* Pierdes un porcentaje alto de tus ganancias del run.
  - *Tomarse un Uber (Retirada Segura):* Abandonas el mapa invicto, pero el Uber te cobra muchísimo dinero fijo de tu botín.
  - *Tomarse el Bondi (Retirada Económica):* Cuesta mucho menos dinero que el Uber, pero tienes que sobrevivir a un nivel extra (pelea tipo survival) adentro del colectivo.
  - *Derrotar al Jefe del Mapa:* Avanzas caminando al 100% de recompensas.

## 5. Mundo / ambientación
El conurbano bonaerense en todo su esplendor pos-nocturno, bañado en un tono de sátira profunda, exageración urbana y mucho humor absurdo argentino. Empieza desde el calor asfixiante de la pista de baile del boliche, atraviesa la vereda humeante de los carritos de choripanes, transita estaciones claustrofóbicas del tren Roca/Línea B y colectivos endemoniados (Línea 60), culminando en la vereda de tu propia casa.
Los enemigos toman formas reconocibles: desde jaurías de perros callejeros sincronizados hasta vendedores de medias lanzando pares inmovilizadores y patovicas empuñando vallas metálicas.

## 6. Estilo visual y artístico
- **Cámara:** Top-Down (Vista Cenital 3/4) perfecta para leer la posición de hordas rodeándote 360 grados.
- **Dirección de Arte:** "Pixel Art Saturado" y sucio (estilo *Hotline Miami* o *Metal Slug*). Una estética de callejones y asfalto oscuro que contrasta violentamente con las luces de neón brillantes y destellos de balazos.
- **Efectos de Ebriedad:** Un sistema de VFX en cámara (Filtros/Shaders). A medida que el jugador toma bebidas, su pantalla puede verse afectada por aberraciones cromáticas (distorsiones por bebidas energizantes) o viñetas que laten al ritmo del corazón.

## 7. Aspectos técnicos (Motores Recomendados para co-desarrollo con IA)
Para que un Agente IA pueda trabajar de forma casi autónoma, escribir código, testear y armar sistemas de forma fluida, es altamente recomendable usar **Tecnologías Web (HTML5/JS)** en lugar de motores pesados con editores gráficos cerrados (como Godot o GameMaker, donde la IA no puede hacer "click" en el editor visual para conectar nodos o físicas fácilmente).
- **Opción A - Phaser 3 (HTML5/JavaScript):** Es el rey de los juegos 2D en navegador. La IA puede generar el código, correr un servidor local al instante y crear toda la lógica de los miles de colisiones del Pixel Art mediante código puro, sin necesidad de editores visuales que la bloqueen.
- **Opción B - React + PixiJS:** Si el "Boliche" (Hub) va a tener mucha UI (Tiendas, Inventarios, Menús), React es perfecto para la interfaz y PixiJS se encarga de renderizar la horda de enemigos en un Canvas con rendimiento altísimo.
- **Exportación Multiplataforma:** Ambas opciones se ejecutan en Web por defecto, pero usando herramientas como **Tauri o Electron** se empaquetan como juegos nativos de **Escritorio (Steam)**, y usando **Capacitor** se exportan directamente como aplicaciones nativas para **Android e iOS**.

## 8. Alcance de la idea
Es un proyecto de tipo **Indie Escalable**. El "Core Loop" (moverse, matar, subir de nivel) es de bajo costo y rápido de prototipar. Sin embargo, su virtud radica en que es extremadamente robusto a las expansiones horizontales: para agregar horas de juego se pueden inyectar fácilmente más ítems, sinergias ocultas, nuevos arquetipos de enemigos y aliados adicionales sin tener que reinventar la ingeniería base.

## 9. Versión Mínima Jugable (MVP)
Para validar que el juego es divertido antes de escalar el arte, la primera versión (Prototipo/MVP) debe tener:
1. **Un (1) solo mapa infinito:** "La Vereda del Boliche".
2. **Sistema de Control:** Movimiento con teclado y mira con el ratón.
3. **El Híbrido:** 1 Arma automática (Ej: Revolear botellas solas) y 1 Habilidad Activa (Lanzar Molotov manualmente).
4. **Progresión de Nivel Básica:** 4 drops básicos en el mapa, y un menú temporal que permita subir de nivel 3 elementos.
5. **Enemigos:** 2 variantes (los Fisuras lentos y un Patovica rápido/pesado) generados progresivamente por oleadas. 1 Jefe básico de fin de nivel.
6. **Hub Básico:** Un menú para comprar solo 2 mejoras (más vida o más daño) utilizando los recursos que suelte el Jefe.

## 10. Notas o ideas extra
- **Doble Economía Permanente:** Dividimos la economía con astucia; *el Dinero* sirve para mejorar las armas base y comprar stats (bebidas a precio fijo o por escala de poder), y *el Respeto (Influencia)* se usa exclusivamente para contratar aliados en el Boliche.
- **El DJ (Banda Sonora Activa):** El jugador puede gastar Dinero en el Hub para "Comprarle Pistas/Canciones" al DJ del boliche. La música seleccionada antes del run no solo cambia la vibra de la cumbia, sino que **otorga buffs pasivos persistentes** al jugador (Ej: Una base de cumbia villera rápida otorga +5% velocidad; un cuarteto alegre otorga regeneración de salud).
- **Sobrevivir dentro un "Bondi" en movimiento** donde las frenadas te re-posicionan es un hito de diseño que encaja brillante temáticamente (Y es la alternativa de viaje barato pero riesgosa en la extracción).
