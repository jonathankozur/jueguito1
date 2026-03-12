import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'ws://localhost:3001';

/**
 * NetworkClient
 *
 * Corre SOLO en el browser de los jugadores CLIENTE (no host).
 * - Se conecta al SignalingServer y se une a una room existente.
 * - Captura inputs locales y los envía al host por WebSocket (NO al EventBus local).
 * - Recibe el WORLD_STATE del host y emite PLAYER_STATE_UPDATED al EventBus para renderizar.
 */
export default class NetworkClient {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;
        this.isConnected = false;

        // Input state caching (igual que InputController)
        this.lastInputMove = { x: null, y: null };
        this.lastInputAim = { x: null, y: null };

        // [FIX] Track which entities we've already created sprites for
        this.knownEntities = new Set();

        // Callbacks para la UI
        this.onJoined = null;       // (playerId, players) => void
        this.onPlayerJoined = null; // (playerId) => void
        this.onPlayerLeft = null;   // (playerId) => void
        this.onError = null;        // (message) => void
    }

    connect(roomId) {
        return new Promise((resolve, reject) => {
            this.roomId = roomId;
            this.ws = new WebSocket(SIGNALING_URL);

            this.ws.onopen = () => {
                this.isConnected = true;
                console.log(`[NetworkClient] Connected to SignalingServer, joining room ${roomId}`);
                this.ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId }));
            };

            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                this._handleMessage(msg, resolve, reject);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                console.warn('[NetworkClient] Disconnected from SignalingServer');
            };

            this.ws.onerror = (err) => {
                console.error('[NetworkClient] WebSocket error:', err);
                reject(err);
                if (this.onError) this.onError('No se pudo conectar a la sala.');
            };
        });
    }

    _handleMessage(msg, resolve, reject) {
        switch (msg.type) {
            case 'ROOM_JOINED':
                this.playerId = msg.playerId;
                console.log(`[NetworkClient] Joined room ${msg.roomId} as ${this.playerId}`);
                if (this.onJoined) this.onJoined(this.playerId, msg.existingPlayers);
                resolve(this.playerId);
                break;

            case 'PLAYER_JOINED':
                console.log(`[NetworkClient] ${msg.playerId} joined the room`);
                if (this.onPlayerJoined) this.onPlayerJoined(msg.playerId);
                EventBus.enqueueEvent(EVENTS.REMOTE_PLAYER_JOINED, MessagePriority.CRITICAL, {
                    senderId: msg.playerId
                });
                break;

            case 'PLAYER_LEFT':
                console.log(`[NetworkClient] ${msg.playerId} left the room`);
                if (this.onPlayerLeft) this.onPlayerLeft(msg.playerId);
                EventBus.enqueueEvent(EVENTS.REMOTE_PLAYER_LEFT, MessagePriority.CRITICAL, {
                    senderId: msg.playerId
                });
                break;

            case 'SYNC_PLAYERS':
                // The host told us who's already in the room
                console.log('[NetworkClient] Existing players:', msg.players);
                EventBus.enqueueEvent(EVENTS.PLAYERS_SYNCED, MessagePriority.CRITICAL, {
                    object1: msg.players
                });
                break;

            case 'WORLD_STATE':
                // The definitive truth from the host about where everything is
                this._applyWorldState(msg.entities);
                break;

            case 'ATTACK':
                // Host relays attack events so client can render the cones
                EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
                    senderId: msg.senderId,
                    float1: msg.x,
                    float2: msg.y,
                    float3: msg.angle,
                    float4: msg.damage
                });
                break;

            case 'HP_CHANGED':
                // Host relays HP changes for React UI (HP bar)
                EventBus.enqueueEvent(EVENTS.PLAYER_HP_CHANGED, MessagePriority.HIGH, {
                    senderId: msg.senderId,
                    float1: msg.hp,
                    float2: msg.maxHp
                });
                break;

            case 'PLAYER_DIED':
                // A player died. Client checks if it's them for game over.
                EventBus.enqueueEvent(EVENTS.PLAYER_DIED, MessagePriority.CRITICAL, {
                    senderId: msg.senderId
                });
                // Also remove sprite
                EventBus.enqueueEvent(EVENTS.ENTITY_DESTROYED, MessagePriority.CRITICAL, {
                    senderId: msg.senderId
                });
                this.knownEntities.delete(msg.senderId);
                break;

            case 'PLAYER_WON':
                // Last player standing wins
                EventBus.enqueueEvent(EVENTS.PLAYER_WON, MessagePriority.CRITICAL, {
                    senderId: msg.senderId
                });
                break;

            case 'GAME_OVER':
                EventBus.enqueueEvent(EVENTS.GAME_OVER, MessagePriority.CRITICAL, {
                    senderId: msg.senderId || ''
                });
                break;

            case 'ERROR':
                console.error('[NetworkClient] Server error:', msg.message);
                if (this.onError) this.onError(msg.message);
                if (reject) reject(new Error(msg.message));
                break;
        }
    }

    /**
     * Aplica el estado del mundo recibido del host al EventBus local.
     * Esto hace que MainScene (el renderer) se actualice sin correr la simulación.
     */
    _applyWorldState(entities) {
        for (const entityState of entities) {
            // [FIX] If we haven't seen this entity before, create a sprite for it
            if (!this.knownEntities.has(entityState.id)) {
                this.knownEntities.add(entityState.id);

                // Determine entity type from ID prefix
                const isPlayer = entityState.id.startsWith('player_');
                EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.CRITICAL, {
                    string1: isPlayer ? 'Player' : 'Enemy',
                    senderId: entityState.id,
                    object1: {
                        stats: {
                            maxHp: entityState.maxHp ?? 100
                        }
                    },
                    float1: entityState.x,
                    float2: entityState.y
                });
                console.log(`[NetworkClient] Auto-created entity: ${entityState.id}`);
            }

            // Update position
            EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.NORMAL, {
                string1: 'moved',
                senderId: entityState.id,
                float1: entityState.x,
                float2: entityState.y,
                float5: entityState.angle
            });

            // Update HP if provided
            if (entityState.hp !== null) {
                EventBus.enqueueEvent(EVENTS.ENTITY_HP_CHANGED, MessagePriority.NORMAL, {
                    senderId: entityState.id,
                    float1: entityState.hp,
                    float2: entityState.maxHp
                });
            }
        }
    }

    /**
     * Envía el input de movimiento al host por WebSocket.
     * Solo envía cuando cambia (igual que InputController local).
     */
    sendMoveInput(dirX, dirY) {
        if (this.lastInputMove.x === dirX && this.lastInputMove.y === dirY) return;
        this.lastInputMove = { x: dirX, y: dirY };

        this._sendToHost({
            type: 'INPUT_MOVE',
            dirX,
            dirY
        });
    }

    /**
     * Envía el input de apuntado al host por WebSocket.
     */
    sendAimInput(aimX, aimY) {
        if (this.lastInputAim.x === aimX && this.lastInputAim.y === aimY) return;
        this.lastInputAim = { x: aimX, y: aimY };

        this._sendToHost({
            type: 'INPUT_AIM',
            aimX,
            aimY
        });
    }

    _sendToHost(payload) {
        if (!this.isConnected) return;
        this.ws.send(JSON.stringify({
            type: 'RELAY',
            payload
        }));
    }

    destroy() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}
