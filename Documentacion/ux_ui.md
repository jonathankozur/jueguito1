# Pautas de Experiencia de Usuario (UI y Game Feel)

Tener miles de sprites y proyectiles en pantalla exige reglas de diseño de interfaz (UI) precisas para no saturar al jugador, y reglas de "Sentimiento de Juego" (Game Feel) para que los combates se sientan impactantes.

---

## 1. El Game Feel (La Sensación de Impacto)

En un Action RPG, los ataques que *no se sienten* terminan aburriendo o restándole credibilidad a la acción. 

### 1.1. Hit-Stop y Hit-Flash
- **Hit-Flash:** Cuando un enemigo es dañado (sin importar su tamaño), su sprite debe pintarse un 100% de color blanco puro durante **2 o 3 fotogramas**. Es la forma más barata y universal de darle a entender al jugador "Le di".
- **Hit-Stop (Micro-Lag Intencional):** Al asestar un Daño Crítico a un Jefe o lanzar un Habilidad Manual muy pesada (Ej: Un batazo fuerte de béisbol con "El Rugbier"), todo el motor del juego **se pausa por 0.05 segundos**. Esta micro-pausa subconsciente engaña al cerebro dándole peso visual a la acción.

### 1.2. Screen Shake (Temblor de Cámara)
Debe usarse con moderación absoluta para evitar mareos:
- **Temblores micro:** Cuando se disparan habilidades manuales fuertes (La Escopeta) o estalla una Molotov.
- **Temblores macro:** Cuando aparece un "Jefe" o muere un Boss (Ej: Cuando el Mega-Trapito cae al suelo).
- *Nota Accesible:* Siempre debe existir un Toggle en el menú de pausa que baje el Screen Shake al 0% a gusto del usuario.

### 1.3. La Sangre / Recompensa Visual
Sustituyendo el gore tradicional con sátira: 
Al matar enemigos con combos, estos estallan dejando caer chorros de *vino de cartón* o *billetes fluorescentes*, ensuciando momentáneamente una capa "inferior" al asfalto de la zona para que sirva como recompensa subconsciente por limpiar áreas.

---

## 2. Reglas de la Interfaz de Usuario (UI) In-Run

La regla de oro: **El centro de la pantalla es un área sagrada**. Toda la UI vital se desplaza a los bordes.

### 2.1. El HUD del Jugador (Lo que se ve mientras peleás)
- **Barra de Vida y Aguante:** Anclados en miniatura directo debajo del sprite del Jugador (Flotando), no arriba a la izquierda como es habitual. Si la pantalla mide 1920x1080, los ojos del jugador estarán el 95% del tiempo fijos en su personaje. Si la barra de XP o Vida está lejos, morirá por no poder apartar la vista de los enemigos.
- **Punteros Inteligentes:**
  - El cursor principal debe ser un *Crosshair Neon* que indique el estado de habilidades (Ej: si la Molotov del Click Derecho está en Cooldown, el ratón se torna rojo intermitente).
- **Indicadores de Peligro (Off-Screen):** Si un "Rusher" (El Motochorro Demente) te va a atacar desde fuera de los límites de tu monitor, DEBE aparecer un círculo de alerta ("¡!") en el borde de tu pantalla apuntando hacia su dirección, dando 1 segundo de aviso.

### 2.2. Pantalla de Level-Up (Sube de Nivel)
- Debe pausar la acción abruptamente.
- Todo lo que no sean las "Cartas de Mejoras" se ensombrece o se desenfoca (Blur) de fondo para relajar la vista por unos segundos.
- Los iconos de las habilidades/pasivas deben ser claros y grandes. Destacar en color verde (neón) los números estadísticos para compararlos rápido (Ej: "*Fuerza de Bate +**12%***").
- Las opciones que ofrezcan crear una **"Evolución / Sinergia de Armas"** deben brillar en dorado o vibrar para sugerir tácitamente "Elegí esto, combinan perfecto".

### 2.3. Daño Flotante (Damage Numbers)
Hacer aparecer los números de daño ("-45", "-134") encima de la cabeza del enemigo da un *feedback* matemático increíble.
- **Regla de Legibilidad:** Si un arma automática en área (Ej: Botella con explosión) daña simultáneamente a 30 enemigos, no dibujes 30 números sobre sus cabezas, o colapsarás la visión y el rendimiento. Dibujá 1 solo número "sumariado" en el centro de la explosión (Ej: "-400" en grandote), o bien, limitá los Damage Numbers para que solo se vean los que infligen Daño Crítico.
