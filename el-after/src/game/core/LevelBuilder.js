import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import PlayerEntity from '../entities/Player';

// Starting positions spread around the arena center for up to 4 players
const PLAYER_SPAWN_POSITIONS = [
    { x: 750, y: 750 },  // player_1 (host)
    { x: 850, y: 750 },  // player_2
    { x: 750, y: 850 },  // player_3
    { x: 850, y: 850 }   // player_4
];

export default class LevelBuilder {
    /**
     * Construye el nivel instanciando todos los jugadores de la partida.
     * @param {string[]} playerIds - Array de IDs de jugadores, ej ['player_1', 'player_2']
     */
    buildLevel(playerIds = ['player_1']) {
        playerIds.forEach((playerId, index) => {
            this._spawnPlayer(playerId, index);
        });
    }

    /**
     * Añade un jugador adicional al nivel (cuando alguien se une en caliente).
     * @param {string} playerId
     */
    addPlayer(playerId) {
        // Determine slot from last digit in playerId (e.g. 'player_2' -> index 1)
        const slotIndex = parseInt(playerId.split('_')[1], 10) - 1;
        this._spawnPlayer(playerId, slotIndex);
    }

    _spawnPlayer(playerId, slotIndex) {
        const pos = PLAYER_SPAWN_POSITIONS[slotIndex] ?? { x: 800, y: 800 };
        const player = new PlayerEntity(playerId, pos.x, pos.y);

        EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.NORMAL, {
            object1: player,
            string1: 'Player',
            senderId: player.id,
            float1: pos.x,
            float2: pos.y
        });

        console.log(`[LevelBuilder] Spawned ${playerId} at (${pos.x}, ${pos.y})`);
    }
}
