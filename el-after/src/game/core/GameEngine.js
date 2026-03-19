import GameSimulation from './GameSimulation';
import LevelBuilder from './LevelBuilder';
import EventBus, { EVENTS } from '../events/EventBus';
import NetworkHost from '../network/NetworkHost';
import NetworkClient from '../network/NetworkClient';

/**
 * El GameEngine es el verdadero dueño del Ciclo de Vida Lógico del juego.
 * 
 * Modos:
 *   - 'solo': Juego de un solo jugador (comportamiento original)
 *   - 'host': Corre la simulación completa + NetworkHost (relay de estado al resto).
 *   - 'client': NO corre simulación. NetworkClient recibe el estado del host y lo aplica al renderer.
 */
export default class GameEngine {
    /**
     * @param {Object} options
     * @param {'solo'|'host'|'client'} options.mode
     * @param {string} [options.roomId] - Requerido si mode === 'client'
     */
    constructor(options = {}) {
        this.mode = options.mode || 'solo';
        this.roomId = options.roomId || null;

        this.simulation = null;
        this.levelBuilder = null;
        this.networkHost = null;
        this.networkClient = null;

        this.animationFrameId = null;
        this.lastTime = performance.now();
        this.isRunning = false;
        this.currentFrame = 0;
        this.gameState = 'LOBBY'; // LOBBY -> PLAYING -> GAME_OVER

        // Bindeamos el método tick para pasar la referencia limpia al requestAnimationFrame
        this.tick = this.tick.bind(this);

        EventBus.subscribe(EVENTS.UI_READY, this.onUiReady, this);
        EventBus.subscribe(EVENTS.PLAYER_DIED, this.onPlayerDied, this);
        EventBus.subscribe(EVENTS.REMOTE_PLAYER_JOINED, this.onRemotePlayerJoined, this);
        EventBus.subscribe(EVENTS.REMOTE_PLAYER_LEFT, this.onRemotePlayerLeft, this);
    }

    /**
     * Arranca el engine. En modo 'host' crea la room en el SignalingServer.
     * En modo 'client' se une a la room del host.
     * Devuelve una Promise que se resuelve cuando la conexión está lista.
     */
    async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        if (this.mode === 'host' || this.mode === 'solo') {
            this.simulation = new GameSimulation();
            this.levelBuilder = new LevelBuilder();
        }

        if (this.mode === 'host') {
            this.networkHost = new NetworkHost();

            this.networkHost.onPlayerJoined = (playerId) => {
                console.log(`[GameEngine] Player joined: ${playerId}`);
            };
            this.networkHost.onPlayerLeft = (playerId) => {
                console.log(`[GameEngine] Player left: ${playerId}`);
            };

            await this.networkHost.connect();
            this.roomId = this.networkHost.roomId;

        } else if (this.mode === 'client') {
            this.networkClient = new NetworkClient();
            const playerId = await this.networkClient.connect(this.roomId);
            this.localPlayerId = playerId;
        }

        // Arrancar el game loop
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.tick);

        // Return the local player ID so callers (GameComponent) can use it
        return this.localPlayerId ?? (this.networkHost?.playerId ?? 'player_1');
    }

    onUiReady() {
        // En modo cliente la UI ya está lista pero NO construimos el nivel local.
        // El cliente recibirá las entidades via WORLD_STATE del host.
        if (this.mode === 'client') return;

        if (this.levelBuilder) {
            // [FIX] Build level with ALL players already connected (not just host)
            // This handles players who joined during the waiting room
            const allPlayerIds = this.networkHost
                ? [...this.networkHost.connectedPlayers.keys()]
                : ['player_1'];
            this.levelBuilder.buildLevel(allPlayerIds);
            this.gameState = 'PLAYING';

            if (this.simulation?.enemySpawner) {
                if (this.mode === 'solo') {
                    this.simulation.enemySpawner.startSoloRun();
                } else {
                    this.simulation.enemySpawner.stopRun();
                }
            }
        }
    }

    onRemotePlayerJoined(msg) {
        const newPlayerId = msg.senderId;
        console.log(`[GameEngine] Remote player joined: ${newPlayerId}`);

        if (this.mode === 'host' && this.simulation) {
            // [FIX] Only create the player mid-game if the game has already started.
            // Players who join during the waiting room are handled by onUiReady().
            if (this.gameState === 'PLAYING') {
                this.levelBuilder.addPlayer(newPlayerId);
            }
            // If gameState is still LOBBY, the player will be created by onUiReady()
            // when the host clicks "EMPEZAR PARTIDA".
        }
    }

    onRemotePlayerLeft(msg) {
        const leftPlayerId = msg.senderId;
        console.log(`[GameEngine] Remote player left: ${leftPlayerId}`);

        if (this.mode === 'host' && this.simulation) {
            this.simulation.removePlayer(leftPlayerId);
        }

        EventBus.enqueueEvent(EVENTS.ENTITY_DESTROYED, 0, {
            senderId: leftPlayerId
        });
    }

    onPlayerDied(msg) {
        if (this.mode === 'client') return;

        const deadPlayerId = msg.senderId;
        console.warn(`[GameEngine] PLAYER_DIED: ${deadPlayerId}`);

        // Remove dead player from the simulation so it stops updating
        if (this.simulation) {
            this.simulation.removePlayer(deadPlayerId);
        }

        // Notify the UI to remove the sprite
        EventBus.enqueueEvent(EVENTS.ENTITY_DESTROYED, 0, {
            senderId: deadPlayerId
        });

        // Count surviving players
        let alivePlayers = [];
        if (this.simulation) {
            for (const [id] of this.simulation.entities.entries()) {
                if (id.startsWith('player_')) {
                    alivePlayers.push(id);
                }
            }
        }

        if (this.mode === 'solo') {
            // Solo mode: player dies → game over
            this.gameState = 'GAME_OVER';
            EventBus.enqueueEvent(EVENTS.GAME_OVER, 0, {
                senderId: deadPlayerId
            });
        } else if (alivePlayers.length === 1) {
            // Multiplayer: last one standing wins
            const winnerId = alivePlayers[0];
            console.log(`[GameEngine] 🏆 WINNER: ${winnerId}`);
            this.gameState = 'GAME_OVER';
            EventBus.enqueueEvent(EVENTS.PLAYER_WON, 0, {
                senderId: winnerId
            });
        } else if (alivePlayers.length === 0) {
            // Everyone died (edge case: simultaneous kills)
            this.gameState = 'GAME_OVER';
            EventBus.enqueueEvent(EVENTS.GAME_OVER, 0, {});
        }
        // If alivePlayers > 1, match continues
    }

    tick(time) {
        if (!this.isRunning) return;

        const deltaMs = time - this.lastTime;
        this.lastTime = time;

        if (!this.isPaused) {
            this.processFrame(deltaMs);
        }

        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    processFrame(deltaMs) {
        EventBus.setFrame(this.currentFrame++);

        // Fase 1: Commands
        EventBus.dispatchCommands();
        // Fase 2: Events
        EventBus.dispatchEvents();

        // Fase 3: Simulación (solo en host/solo)
        if (this.gameState === 'PLAYING' && this.simulation) {
            this.simulation.update(deltaMs);

            // El host broadcastea el estado del mundo tras cada tick
            if (this.mode === 'host' && this.networkHost) {
                this.networkHost.broadcastWorldState(this.simulation.entities);
            }
        }

        // Fase 4: Render
        EventBus.dispatchRender();
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.lastTime = performance.now();
    }

    step() {
        if (this.isPaused) {
            this.processFrame(16.6);
        }
    }

    stop() {
        this.isRunning = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.simulation) {
            this.simulation.destroy();
            this.simulation = null;
        }

        if (this.networkHost) {
            this.networkHost.destroy();
            this.networkHost = null;
        }

        if (this.networkClient) {
            this.networkClient.destroy();
            this.networkClient = null;
        }

        EventBus.unsubscribe(EVENTS.UI_READY, this.onUiReady, this);
        EventBus.unsubscribe(EVENTS.PLAYER_DIED, this.onPlayerDied, this);
        EventBus.unsubscribe(EVENTS.REMOTE_PLAYER_JOINED, this.onRemotePlayerJoined, this);
        EventBus.unsubscribe(EVENTS.REMOTE_PLAYER_LEFT, this.onRemotePlayerLeft, this);
    }
}
