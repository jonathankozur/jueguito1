import EventBus, { EVENTS } from '../events/EventBus';
import EnemySpawnerSystem from '../systems/EnemySpawnerSystem';
import CombatSystem from '../systems/CombatSystem';

export default class GameSimulation {
    constructor() {
        // Registro universal de todas las entidades en la simulación
        this.entities = new Map();
        
        // Sistemas de simulación
        this.enemySpawner = new EnemySpawnerSystem(this);
        this.combatSystem = new CombatSystem(this);

        EventBus.subscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
    }

    onEntityCreated(msg) {
        this.entities.set(msg.senderId, msg.object1);
    }

    // Motor central de avance en el tiempo (Tick)
    update(delta) {
        // [MULTIPLAYER] Find ALL player positions (not just 'player1')
        const playerPositions = [];
        for (const [id, entity] of this.entities.entries()) {
            if (id.startsWith('player_')) {
                playerPositions.push({ x: entity.x, y: entity.y });
            }
        }

        // For enemy AI: target the nearest player
        // (With enemies disabled this is moot, but future-proofed)
        const primaryPlayer = playerPositions[0] ?? null;

        // Run spawner (disabled in multiplayer branch)
        this.enemySpawner.update(delta, primaryPlayer);

        // Actualizar lógicas de todas las entidades
        this.entities.forEach(entity => {
            if (typeof entity.update === 'function') {
                entity.update(delta, primaryPlayer);
            }
        });

        this.checkCollisions();
    }

    checkCollisions() {
        this.entities.forEach(entity => {
            if (entity.x !== undefined && entity.y !== undefined) {
                if (entity.x < 0) entity.x = 0;
                if (entity.x > 1600) entity.x = 1600;
                if (entity.y < 0) entity.y = 0;
                if (entity.y > 1600) entity.y = 1600;
            }
        });
    }

    /**
     * [MULTIPLAYER] Removes a player entity when they disconnect.
     */
    removePlayer(playerId) {
        const entity = this.entities.get(playerId);
        if (entity) {
            if (typeof entity.destroy === 'function') entity.destroy();
            this.entities.delete(playerId);
            console.log(`[GameSimulation] Removed player ${playerId}`);
        }
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
        if (this.enemySpawner) {
            this.enemySpawner.destroy();
            this.enemySpawner = null;
        }
        if (this.combatSystem) {
            this.combatSystem.destroy();
            this.combatSystem = null;
        }
        // Destroy all entities
        this.entities.forEach(entity => {
            if (typeof entity.destroy === 'function') entity.destroy();
        });
        this.entities.clear();
    }
}
