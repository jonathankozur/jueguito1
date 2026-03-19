import EnemyEntity from '../entities/Enemy';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

export default class EnemySpawnerSystem {
    constructor(simulation) {
        this.simulation = simulation; // Reference to GameSimulation
        this.baseSpawnDelay = 3000; // Spawn 1 enemy every 3 seconds
        this.timeSinceLastSpawn = 0;
        this.enemyIdCounter = 1;
        this.maxEnemies = 20;
        this.maxAliveEnemies = 6;
        this.currentWave = 0;
        this.waveDurationMs = 30000;
        this.waveElapsedMs = 0;
        this.currentSpawnDelay = this.baseSpawnDelay;
        
        // Spawn radius from the player
        this.spawnDistance = 600;

        // [MULTIPLAYER] Disabled while implementing network layer.
        // Set to true to re-enable enemy waves.
        this.enabled = false;
    }

    startSoloRun() {
        this.enabled = true;
        this.currentWave = 1;
        this.waveElapsedMs = 0;
        this.timeSinceLastSpawn = this.baseSpawnDelay;
        this.currentSpawnDelay = this.baseSpawnDelay;
        this.maxAliveEnemies = 6;

        EventBus.enqueueEvent(EVENTS.WAVE_CHANGED, MessagePriority.HIGH, {
            int1: this.currentWave
        });
    }

    stopRun() {
        this.enabled = false;
        this.currentWave = 0;
        this.waveElapsedMs = 0;
        this.timeSinceLastSpawn = 0;
        this.currentSpawnDelay = this.baseSpawnDelay;
        this.maxAliveEnemies = 6;
    }

    update(deltaMs, playerCoords) {
        // Disabled for multiplayer branch
        if (!this.enabled) return;

        // We only start spawning when the player exists
        if (!playerCoords) return;

        this.waveElapsedMs += deltaMs;
        if (this.waveElapsedMs >= this.waveDurationMs) {
            this.waveElapsedMs -= this.waveDurationMs;
            this.currentWave += 1;
            this.currentSpawnDelay = Math.max(900, this.baseSpawnDelay - ((this.currentWave - 1) * 250));
            this.maxAliveEnemies = Math.min(this.maxEnemies, 6 + ((this.currentWave - 1) * 2));

            EventBus.enqueueEvent(EVENTS.WAVE_CHANGED, MessagePriority.HIGH, {
                int1: this.currentWave
            });
        }

        const aliveEnemies = this._countAliveEnemies();
        if (aliveEnemies >= this.maxAliveEnemies) return;

        this.timeSinceLastSpawn += deltaMs;

        if (this.timeSinceLastSpawn >= this.currentSpawnDelay) {
            this.timeSinceLastSpawn = 0;
            this.spawnEnemy(playerCoords);
        }
    }

    spawnEnemy(playerCoords) {
        const id = `enemy_${this.enemyIdCounter++}`;
        const spawn = this._findSpawnPoint(playerCoords);
        const enemyType = this._pickEnemyType();

        const enemy = new EnemyEntity(id, spawn.x, spawn.y, enemyType);
        
        // 1. We must add the enemy directly to the simulation immediately
        // so it participates in physics/AI right away.
        this.simulation.entities.set(id, enemy);

        // 2. We broadcast the news to the UI so it can render the red box
        EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.CRITICAL, {
            string1: 'Enemy',
            senderId: id,
            object1: enemy,
            float1: spawn.x,
            float2: spawn.y
        });
    }

    _pickEnemyType() {
        if (this.currentWave >= 3 && Math.random() < 0.3) {
            return 'bouncer';
        }
        return 'fodder';
    }

    _countAliveEnemies() {
        let total = 0;
        for (const [id, entity] of this.simulation.entities.entries()) {
            if (id.startsWith('enemy_') && entity.stats && !entity.stats.isDead) {
                total += 1;
            }
        }
        return total;
    }

    _findSpawnPoint(playerCoords) {
        for (let attempt = 0; attempt < 12; attempt += 1) {
            const randomAngle = Math.random() * Math.PI * 2;
            const spawnX = playerCoords.x + Math.cos(randomAngle) * this.spawnDistance;
            const spawnY = playerCoords.y + Math.sin(randomAngle) * this.spawnDistance;
            const clamped = {
                x: Math.max(40, Math.min(1560, spawnX)),
                y: Math.max(40, Math.min(1560, spawnY))
            };

            if (!this.simulation.isCircleBlocked(clamped.x, clamped.y, 20)) {
                return clamped;
            }
        }

        return {
            x: Math.max(40, Math.min(1560, playerCoords.x + this.spawnDistance)),
            y: Math.max(40, Math.min(1560, playerCoords.y))
        };
    }

    destroy() {
        this.simulation = null;
    }
}
