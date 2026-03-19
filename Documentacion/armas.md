# Catálogo de Armas y Sistema de Combate

Este documento define las mecánicas de combate y el arsenal disponible en "El After del Conurbano". El sistema ha evolucionado de un modelo híbrido a un **Sistema de Combate Manual**, donde la agencia del jugador es primordial.

---

## 1. Mecánica de Ataque Manual
A diferencia de los sistemas de auto-ataque, en este juego cada golpe o disparo debe ser ejecutado por el jugador:
- **Acción Base:** Click Izquierdo (o tecla asignada).
- **Apuntado:** El ataque se dirige hacia la posición del cursor del ratón o la dirección en la que mira el personaje.
- **Inventario Rápido:** El jugador puede alternar entre 5 ranuras de equipo usando las teclas **1 al 5** o la **rueda del ratón**.

---

## 2. Tipos de Ataque y Lógica de Superficies

Todos los ataques tienen una **superficie de acción** definida:

### 2.1. Ataques Melee (Cuerpo a Cuerpo)
Se ejecutan en un área inmediata al personaje.
- **Superficie Delantera:** Un rectángulo o arco frente al personaje (ej. un cuchillazo).
- **Superficie Circular:** Un área de efecto (AoE) alrededor del personaje (ej. un giro con un bate).
- **Impacto:** Si un enemigo está dentro de la superficie al momento de la activación, recibe daño y empuje.

### 2.2. Ataques a Distancia (Proyectiles)
Disparan un objeto que viaja por el escenario hasta impactar o perder fuerza.
- **Lógica de Colisión y Materiales:** El proyectil puede atravesar superficies dependiendo de su fuerza y el material:
  - **Materiales Blandos (Madera, Plástico):** Reducen un 20% la fuerza del proyectil pero permiten que continúe.
  - **Materiales Medios (Ladrillo, Metal fino):** Reducen un 60% la fuerza.
  - **Materiales Duros (Hormigón, Muros de contención):** Detienen el proyectil por completo (fuerza = 0).
- **Pérdida de Fuerza:** Un proyectil se detiene cuando su fuerza llega a cero o impacta un material impenetrable.

### 2.3. Armas Arrojadizas
Siguen una trayectoria aérea parabólica.
- **Sobrepaso:** Pueden pasar por encima de obstáculos bajos (personas, cercas, objetos decorativos).
- **Bloqueo:** Se detienen si chocan contra una superficie alta (paredes de casas, edificios).
- **Efecto al Caer:** Al llegar a su destino o chocar con una pared, generan una **Superficie de Acción de Área** (explosión, charco de fuego, cristales rotos).

---

## 3. Sistema de Empuje (Knockback)
El combate físico incluye una respuesta de masa y fuerza:
- **Cálculo:** El desplazamiento del defensor depende de: `Fuerza del Atacante - Aguante del Defensor`.
- **Objetos:** Los proyectiles y golpes también pueden mover objetos del escenario si su fuerza es suficiente.

---

## 4. Variables de Balance (Atributos)
- **Daño:** Vida restada por impacto.
- **Fuerza de Salida / Empuje:** Determina el "knockback" y la capacidad de perforación en proyectiles.
- **Cadencia / Cooldown:** Tiempo entre ataques manuales.
- **Alcance / Radio:** Tamaño de la superficie de acción.

---

## 5. El Catálogo Inicial (Slots de Acceso Rápido)

| Slot | Arma | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| **1** | **Los Puños** | Melee (Circular) | Ataque básico. Poco daño pero empuje decente. |
| **2** | **Cuchillo Tramontina** | Melee (Frontal) | Ataque rápido y preciso en un rectángulo corto. |
| **3** | **El Chumbo (.38)** | Distancia | Proyectil con alta fuerza de perforación. |
| **4** | **Botella Rota** | Arrojadiza | Se lanza y crea un área de cristales al romper contra el suelo. |
| **5** | **Molotov** | Arrojadiza | Crea un área de fuego persistente. |

---

## 6. Progresión y Mejoras (En el Boliche)
Las armas se mejoran de forma ilimitada en el Hub:
- **Niveles:** Aumentan principalmente el **Daño** y la **Fuerza**.
- **Visuales:** A mayor nivel, el arma o el proyectil ganan efectos visuales (brillos, estelas, partículas) para reflejar su poder sin cambiar el modelo base.
- **Costo:** El precio de mejora escala exponencialmente por cada nivel.
