import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import PlayerEntity from '../entities/Player';
import StaticObstacleEntity from '../entities/StaticObstacleEntity';

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

        this._spawnObstacles();
    }

    _spawnObstacles() {
        const obstacles = [
            { id: 'bar_norte', x: 800, y: 230, w: 680, h: 60, mat: 'hard', hLevel: 'high', penetrableDuringDash: true },
            { id: 'escenario_sur', x: 800, y: 1370, w: 680, h: 60, mat: 'hard', hLevel: 'high' },
            { id: 'cabina_oeste', x: 240, y: 800, w: 60, h: 480, mat: 'hard', hLevel: 'high' },
            { id: 'patio_este', x: 1360, y: 800, w: 60, h: 480, mat: 'hard', hLevel: 'high' },
            { id: 'muro_centro_izq', x: 650, y: 800, w: 40, h: 180, mat: 'hard', hLevel: 'high' },
            { id: 'muro_centro_der', x: 950, y: 800, w: 40, h: 180, mat: 'hard', hLevel: 'high' },
            { id: 'mesa_vip_izq', x: 520, y: 620, w: 180, h: 36, mat: 'medium', hLevel: 'low' },
            { id: 'mesa_vip_der', x: 1080, y: 620, w: 180, h: 36, mat: 'medium', hLevel: 'low' },
            { id: 'auto_izq', x: 520, y: 990, w: 140, h: 72, mat: 'medium', hLevel: 'low' },
            { id: 'auto_der', x: 1080, y: 990, w: 140, h: 72, mat: 'medium', hLevel: 'low' },
            { id: 'valla_superior', x: 800, y: 530, w: 260, h: 28, mat: 'soft', hLevel: 'low' },
            { id: 'valla_inferior', x: 800, y: 1070, w: 260, h: 28, mat: 'soft', hLevel: 'low' }
        ];

        obstacles.forEach(ob => {
            const options = ob.penetrableDuringDash ? { penetrableDuringDash: true } : {};
            const entity = new StaticObstacleEntity(ob.id, ob.x, ob.y, ob.w, ob.h, ob.mat, ob.hLevel, options);
            EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.NORMAL, {
                object1: entity,
                string1: 'Obstacle',
                senderId: ob.id,
                float1: ob.x,
                float2: ob.y
            });
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
