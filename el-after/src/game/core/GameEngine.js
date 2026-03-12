import GameSimulation from './GameSimulation';
import LevelBuilder from './LevelBuilder';
import EventBus from '../events/EventBus';

/**
 * El GameEngine es el verdadero dueño del Ciclo de Vida Lógico del juego.
 * Encapsula la Simulación Global, el Armado Inicial del Nivel (Builder) 
 * y gestiona su propio Game Loop asincrónico independiente de cualquier entorno gráfico.
 */
export default class GameEngine {
    constructor() {
        this.simulation = null;
        this.levelBuilder = null;
        this.animationFrameId = null;
        this.lastTime = performance.now();
        this.isRunning = false;
        this.currentFrame = 0;
        this.gameState = 'PLAYING';

        // Bindeamos el método tick para pasar la referencia limpia al requestAnimationFrame
        this.tick = this.tick.bind(this);

        EventBus.subscribe(EventBus.EVENTS?.UI_READY || 7, this.onUiReady, this); // Hardcoded 7 just in case import timing
        EventBus.subscribe(EventBus.EVENTS?.PLAYER_DIED || 9, this.onPlayerDied, this);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // 1. Instanciamos el Cerebro y el Contratista
        this.simulation = new GameSimulation();
        this.levelBuilder = new LevelBuilder();

        // 3. Encender el motor (Loop Lógico). The level will be built when UI_READY is received.
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    onUiReady() {
        if (this.levelBuilder) {
            // 2. Disparamos la creación en la memoria RAM del Nivel 1 tras confirmar que React/Phaser están leyendo
            this.levelBuilder.buildLevel1();
        }
    }

    onPlayerDied() {
        console.warn("[GameEngine] PLAYER_DIED received. Halting Simulation.");
        this.gameState = 'GAME_OVER';
        
        // Notify React UI to display the Defeat Screen
        EventBus.enqueueEvent(EventBus.EVENTS?.GAME_OVER || 10, 0, {}); // Priority 0 is CRITICAL
    }

    tick(time) {
        if (!this.isRunning) return;

        const deltaMs = time - this.lastTime;
        this.lastTime = time;

        if (!this.isPaused) {
            this.processFrame(deltaMs);
        }

        // Pedir el siguiente frame
        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    processFrame(deltaMs) {
        EventBus.setFrame(this.currentFrame++);

        // Fase 1: Commands
        EventBus.dispatchCommands();
        // Fase 2: Events pendientes (generados en el setup o el frame anterior)
        EventBus.dispatchEvents();
        
        // Fase 3: Avanzamos el reloj de todas las entidades (SOLO SI JUGAMOS)
        if (this.gameState === 'PLAYING') {
            this.simulation.update(deltaMs);
        }
        
        // Fase 4: Render
        EventBus.dispatchRender();
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.lastTime = performance.now(); // Reset time to avoid huge delta jump
    }

    step() {
        if (this.isPaused) {
            // Step uses a fixed delta for determinism during debug (e.g., 60fps = ~16.6ms)
            this.processFrame(16.6);
        }
    }

    stop() {
        this.isRunning = false;

        // Apagamos loop Lógico
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Destruimos el estado de la simulación
        if (this.simulation) {
            this.simulation.destroy();
            this.simulation = null;
        }
        EventBus.unsubscribe(EventBus.EVENTS?.UI_READY || 7, this.onUiReady, this);
        EventBus.unsubscribe(EventBus.EVENTS?.PLAYER_DIED || 9, this.onPlayerDied, this);
    }
}
