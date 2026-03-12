import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

const SIGNALING_URL = 'ws://localhost:3001';

/**
 * NetworkHost
 *
 * Corre SOLO en el browser del jugador HOST.
 * - Se conecta al SignalingServer para gestionar la room.
 * - Recibe inputs de clientes remotos y los inyecta al EventBus local.
 * - Cada tick serializa el estado de entidades y lo broadcast a clientes.
 */
export default class NetworkHost {
    constructor() {
        this.ws = null;
        this.roomId = null;
        this.playerId = null;     // Será 'player_1'
        this.connectedPlayers = new Map(); // playerId -> { status }
        this.isConnected = false;

        // Callbacks para la UI
        this.onRoomCreated = null;  // (roomId) => void
        this.onPlayerJoined = null; // (playerId) => void
        this.onPlayerLeft = null;   // (playerId) => void
        this.onError = null;        // (message) => void

        // Relay game events to clients so they can render effects and UI
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, this._onAttackPerformed, this);
        EventBus.subscribe(EVENTS.PLAYER_HP_CHANGED, this._onPlayerHpChanged, this);
        EventBus.subscribe(EVENTS.PLAYER_DIED, this._onPlayerDied, this);
        EventBus.subscribe(EVENTS.PLAYER_WON, this._onPlayerWon, this);
        EventBus.subscribe(EVENTS.GAME_OVER, this._onGameOver, this);
    }

    _onAttackPerformed(msg) {
        if (!this.isConnected || this.connectedPlayers.size <= 1) return;
        this._broadcastToClients({
            type: 'ATTACK',
            senderId: msg.senderId,
            x: msg.float1,
            y: msg.float2,
            angle: msg.float3,
            damage: msg.float4
        });
    }

    _onPlayerHpChanged(msg) {
        if (!this.isConnected || this.connectedPlayers.size <= 1) return;
        this._broadcastToClients({
            type: 'HP_CHANGED',
            senderId: msg.senderId,
            hp: msg.float1,
            maxHp: msg.float2
        });
    }

    _onPlayerDied(msg) {
        if (!this.isConnected || this.connectedPlayers.size <= 1) return;
        this._broadcastToClients({
            type: 'PLAYER_DIED',
            senderId: msg.senderId
        });
    }

    _onPlayerWon(msg) {
        if (!this.isConnected || this.connectedPlayers.size <= 1) return;
        this._broadcastToClients({
            type: 'PLAYER_WON',
            senderId: msg.senderId
        });
    }

    _onGameOver(msg) {
        if (!this.isConnected || this.connectedPlayers.size <= 1) return;
        this._broadcastToClients({
            type: 'GAME_OVER',
            senderId: msg.senderId || ''
        });
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(SIGNALING_URL);

            this.ws.onopen = () => {
                this.isConnected = true;
                console.log('[NetworkHost] Connected to SignalingServer');
                // Crear la room automáticamente al conectarse
                this.ws.send(JSON.stringify({ type: 'CREATE_ROOM' }));
            };

            this.ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                this._handleMessage(msg, resolve, reject);
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                console.warn('[NetworkHost] Disconnected from SignalingServer');
            };

            this.ws.onerror = (err) => {
                console.error('[NetworkHost] WebSocket error:', err);
                reject(err);
                if (this.onError) this.onError('No se pudo conectar al servidor de señalización.');
            };
        });
    }

    _handleMessage(msg, resolve, reject) {
        switch (msg.type) {
            case 'ROOM_CREATED':
                this.roomId = msg.roomId;
                this.playerId = msg.playerId;
                this.connectedPlayers.set(msg.playerId, { status: 'host' });
                console.log(`[NetworkHost] Room created: ${this.roomId}, I am ${this.playerId}`);
                if (this.onRoomCreated) this.onRoomCreated(this.roomId);
                resolve(this.roomId);
                break;

            case 'PLAYER_JOINED':
                this.connectedPlayers.set(msg.playerId, { status: 'joined' });
                console.log(`[NetworkHost] ${msg.playerId} joined the room`);
                if (this.onPlayerJoined) this.onPlayerJoined(msg.playerId);
                // Notify the new player about all existing players
                this._sendToPlayer(msg.playerId, {
                    type: 'SYNC_PLAYERS',
                    players: [...this.connectedPlayers.keys()]
                });
                // Notify all existing players about the new one
                EventBus.enqueueEvent(EVENTS.REMOTE_PLAYER_JOINED, MessagePriority.CRITICAL, {
                    senderId: msg.playerId
                });
                break;

            case 'PLAYER_LEFT':
                this.connectedPlayers.delete(msg.playerId);
                console.log(`[NetworkHost] ${msg.playerId} left the room`);
                if (this.onPlayerLeft) this.onPlayerLeft(msg.playerId);
                EventBus.enqueueEvent(EVENTS.REMOTE_PLAYER_LEFT, MessagePriority.CRITICAL, {
                    senderId: msg.playerId
                });
                break;

            // SignalingServer unwraps RELAY payloads, so client inputs arrive
            // as direct message types (not wrapped in 'RELAY')
            case 'INPUT_MOVE':
            case 'INPUT_AIM':
                this._processClientInput(msg);
                break;

            case 'ERROR':
                console.error('[NetworkHost] Server error:', msg.message);
                if (this.onError) this.onError(msg.message);
                if (reject) reject(new Error(msg.message));
                break;
        }
    }

    /**
     * Un cliente remoto nos manda sus inputs.
     * Los inyectamos al EventBus local como si fuera un input real,
     * pero con el playerId correspondiente en `targetId`.
     */
    _processClientInput(msg) {
        // SignalingServer adds 'from' to the root of the unwrapped message
        const fromPlayerId = msg.from;

        if (msg.type === 'INPUT_MOVE') {
            EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, {
                targetId: fromPlayerId,
                float1: msg.dirX,
                float2: msg.dirY
            });
        } else if (msg.type === 'INPUT_AIM') {
            EventBus.enqueueCommand(EVENTS.INPUT_AIM, MessagePriority.NORMAL, {
                targetId: fromPlayerId,
                float1: msg.aimX,
                float2: msg.aimY
            });
        }
    }

    /**
     * Llamado por el GameEngine al final de cada tick.
     * Serializa el estado de todas las entidades y lo envía a todos los clientes.
     */
    broadcastWorldState(entities) {
        if (!this.isConnected || this.connectedPlayers.size <= 1) return;

        const stateSnapshot = [];
        for (const [id, entity] of entities.entries()) {
            if (entity.x !== undefined) {
                stateSnapshot.push({
                    id,
                    x: entity.x,
                    y: entity.y,
                    angle: entity.angle ?? 0,
                    hp: entity.stats?.currentHp ?? null,
                    maxHp: entity.stats?.maxHp ?? null
                });
            }
        }

        this._broadcastToClients({
            type: 'WORLD_STATE',
            entities: stateSnapshot
        });
    }

    /**
     * Envía un mensaje a TODOS los clientes (excluyendo al host).
     */
    _broadcastToClients(payload) {
        if (!this.isConnected) return;
        this.ws.send(JSON.stringify({
            type: 'RELAY',
            payload
        }));
    }

    /**
     * Envía un mensaje a un cliente específico.
     */
    _sendToPlayer(playerId, payload) {
        if (!this.isConnected) return;
        this.ws.send(JSON.stringify({
            type: 'RELAY',
            to: playerId,
            payload
        }));
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.ATTACK_PERFORMED, this._onAttackPerformed, this);
        EventBus.unsubscribe(EVENTS.PLAYER_HP_CHANGED, this._onPlayerHpChanged, this);
        EventBus.unsubscribe(EVENTS.PLAYER_DIED, this._onPlayerDied, this);
        EventBus.unsubscribe(EVENTS.PLAYER_WON, this._onPlayerWon, this);
        EventBus.unsubscribe(EVENTS.GAME_OVER, this._onGameOver, this);
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }
}
