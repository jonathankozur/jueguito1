import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import EnemySpawnerSystem from '../systems/EnemySpawnerSystem';
import CombatSystem from '../systems/CombatSystem';

const WORLD_SIZE = 1600;

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
        const obstacles = [];
        const movers = [];

        this.entities.forEach(entity => {
            if (entity.width && entity.height && entity.material) {
                obstacles.push(entity);
            }
            if (entity.radius && entity.x !== undefined && entity.y !== undefined) {
                movers.push(entity);
            }
        });

        movers.forEach(entity => {
            const worldCorrected = this._clampToWorld(entity);
            const obstacleCorrected = this._resolveObstacles(entity, obstacles);
            if (worldCorrected || obstacleCorrected) {
                this._emitCorrection(entity);
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

    isCircleBlocked(x, y, radius) {
        if (x - radius < 0 || x + radius > WORLD_SIZE || y - radius < 0 || y + radius > WORLD_SIZE) {
            return true;
        }

        for (const entity of this.entities.values()) {
            if (entity.width && entity.height && entity.material) {
                if (this._circleIntersectsRect(x, y, radius, entity)) {
                    return true;
                }
            }
        }

        return false;
    }

    _clampToWorld(entity) {
        const radius = entity.radius || 0;
        const prevX = entity.x;
        const prevY = entity.y;

        entity.x = Math.max(radius, Math.min(WORLD_SIZE - radius, entity.x));
        entity.y = Math.max(radius, Math.min(WORLD_SIZE - radius, entity.y));

        return prevX !== entity.x || prevY !== entity.y;
    }

    _resolveObstacles(entity, obstacles) {
        let corrected = false;
        for (const obstacle of obstacles) {
            if (this._resolveCircleVsRect(entity, obstacle)) {
                corrected = true;
            }
        }
        return corrected;
    }

    _resolveCircleVsRect(entity, obstacle) {
        const radius = entity.radius || 0;
        if (!radius) return false;

        const halfW = obstacle.width / 2;
        const halfH = obstacle.height / 2;
        const left = obstacle.x - halfW;
        const right = obstacle.x + halfW;
        const top = obstacle.y - halfH;
        const bottom = obstacle.y + halfH;

        const closestX = Math.max(left, Math.min(entity.x, right));
        const closestY = Math.max(top, Math.min(entity.y, bottom));
        const dx = entity.x - closestX;
        const dy = entity.y - closestY;
        const distSq = (dx * dx) + (dy * dy);

        if (distSq >= radius * radius) {
            return false;
        }

        if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const overlap = radius - dist;
            entity.x += (dx / dist) * overlap;
            entity.y += (dy / dist) * overlap;
            entity._dirty = true;
            return true;
        }

        const pushLeft = Math.abs(entity.x - left);
        const pushRight = Math.abs(right - entity.x);
        const pushTop = Math.abs(entity.y - top);
        const pushBottom = Math.abs(bottom - entity.y);
        const minPush = Math.min(pushLeft, pushRight, pushTop, pushBottom);

        if (minPush === pushLeft) entity.x = left - radius;
        else if (minPush === pushRight) entity.x = right + radius;
        else if (minPush === pushTop) entity.y = top - radius;
        else entity.y = bottom + radius;

        entity._dirty = true;
        return true;
    }

    _circleIntersectsRect(x, y, radius, rect) {
        const halfW = rect.width / 2;
        const halfH = rect.height / 2;
        const closestX = Math.max(rect.x - halfW, Math.min(x, rect.x + halfW));
        const closestY = Math.max(rect.y - halfH, Math.min(y, rect.y + halfH));
        const dx = x - closestX;
        const dy = y - closestY;
        return (dx * dx) + (dy * dy) < radius * radius;
    }

    _emitCorrection(entity) {
        EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.NORMAL, {
            string1: 'moved',
            senderId: entity.id,
            float1: entity.x,
            float2: entity.y,
            float3: entity.velX || 0,
            float4: entity.velY || 0,
            float5: entity.angle || 0,
            int1: entity.selectedSlot ?? 0
        });
    }
}
