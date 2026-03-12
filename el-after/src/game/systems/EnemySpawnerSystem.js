import EnemyEntity from '../entities/Enemy';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

export default class EnemySpawnerSystem {
    constructor(simulation) {
        this.simulation = simulation; // Reference to GameSimulation
        this.baseSpawnDelay = 3000; // Spawn 1 enemy every 3 seconds
        this.timeSinceLastSpawn = 0;
        this.enemyIdCounter = 1;
        this.maxEnemies = 100; // Hardcap for now
        
        // Spawn radius from the player
        this.spawnDistance = 600;

        // [MULTIPLAYER] Disabled while implementing network layer.
        // Set to true to re-enable enemy waves.
        this.enabled = false;
    }

    update(deltaMs, playerCoords) {
        // Disabled for multiplayer branch
        if (!this.enabled) return;

        // We only start spawning when the player exists
        if (!playerCoords) return;

        // Don't spawn if we hit the limit
        // (subtract 1 for the player if entities map contains both)
        if (this.simulation.entities.size >= this.maxEnemies) return;

        this.timeSinceLastSpawn += deltaMs;

        if (this.timeSinceLastSpawn >= this.baseSpawnDelay) {
            this.timeSinceLastSpawn = 0;
            this.spawnEnemy(playerCoords);
        }
    }

    spawnEnemy(playerCoords) {
        const id = `enemy_${this.enemyIdCounter++}`;
        
        // Random angle for cirular spawn around the player
        const randomAngle = Math.random() * Math.PI * 2;
        const spawnX = playerCoords.x + Math.cos(randomAngle) * this.spawnDistance;
        const spawnY = playerCoords.y + Math.sin(randomAngle) * this.spawnDistance;

        const enemy = new EnemyEntity(id, spawnX, spawnY);
        
        // 1. We must add the enemy directly to the simulation immediately
        // so it participates in physics/AI right away.
        this.simulation.entities.set(id, enemy);

        // 2. We broadcast the news to the UI so it can render the red box
        EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.CRITICAL, {
            string1: 'Enemy',
            senderId: id,
            object1: enemy,
            float1: spawnX,
            float2: spawnY
        });
    }

    destroy() {
        this.simulation = null;
    }
}
