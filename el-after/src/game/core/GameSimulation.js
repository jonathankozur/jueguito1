import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import EnemySpawnerSystem from '../systems/EnemySpawnerSystem';
import CombatSystem from '../systems/CombatSystem';
import RunDirectorSystem from '../systems/RunDirectorSystem';

const WORLD_SIZE = 1600;

export default class GameSimulation {
    constructor() {
        this.entities = new Map();
        this.enemySpawner = new EnemySpawnerSystem(this);
        this.combatSystem = new CombatSystem(this);
        this.runDirector = new RunDirectorSystem(this);

        EventBus.subscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
    }

    onEntityCreated(msg) {
        this.entities.set(msg.senderId, msg.object1);
    }

    update(delta) {
        const players = [];
        for (const [id, entity] of this.entities.entries()) {
            if (id.startsWith('player_')) {
                players.push(entity);
            }
        }

        const primaryPlayer = players[0] ?? null;

        this.enemySpawner.update(delta, primaryPlayer ? { x: primaryPlayer.x, y: primaryPlayer.y } : null);
        this.runDirector.update(delta, primaryPlayer);

        this.entities.forEach((entity) => {
            if (typeof entity.update === 'function') {
                entity.update(delta, primaryPlayer);
            }
        });

        this.checkCollisions(players);
    }

    checkCollisions(players = null) {
        const obstacles = [];
        const actors = [];
        const pickups = [];
        const playerActors = players || [];
        const correctedEntities = new Set();

        this.entities.forEach((entity) => {
            if (entity.width && entity.height && entity.material) {
                obstacles.push(entity);
            } else if (entity.pickupType) {
                pickups.push(entity);
            } else if (entity.radius && entity.x !== undefined && entity.y !== undefined) {
                actors.push(entity);
            }
        });

        actors.forEach((entity) => {
            const worldCorrected = this._clampToWorld(entity);
            const obstacleCorrected = this._resolveObstacles(entity, obstacles);
            if (worldCorrected || obstacleCorrected) {
                correctedEntities.add(entity);
            }
        });

        this._resolveActorPairs(actors, correctedEntities);

        correctedEntities.forEach((entity) => {
            const worldCorrected = this._clampToWorld(entity);
            const obstacleCorrected = this._resolveObstacles(entity, obstacles);
            if (worldCorrected || obstacleCorrected) {
                entity._dirty = true;
            }
        });

        this._collectPickups(playerActors.length > 0 ? playerActors : actors.filter((entity) => entity.id?.startsWith('player_')), pickups);

        correctedEntities.forEach((entity) => {
            this._emitCorrection(entity);
        });
    }

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
        if (this.runDirector) {
            this.runDirector.destroy();
            this.runDirector = null;
        }

        this.entities.forEach((entity) => {
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
            if (this._shouldBypassObstacle(entity, obstacle)) {
                continue;
            }
            if (this._resolveCircleVsRect(entity, obstacle)) {
                corrected = true;
            }
        }
        return corrected;
    }

    _shouldBypassObstacle(entity, obstacle) {
        if (!obstacle.penetrableDuringDash) {
            return false;
        }

        if (typeof entity.isInvulnerable === 'function' && entity.isInvulnerable()) {
            return true;
        }

        return false;
    }

    _resolveActorPairs(actors, correctedEntities) {
        for (let i = 0; i < actors.length; i += 1) {
            for (let j = i + 1; j < actors.length; j += 1) {
                const entityA = actors[i];
                const entityB = actors[j];
                const dx = entityB.x - entityA.x;
                const dy = entityB.y - entityA.y;
                const distance = Math.sqrt((dx * dx) + (dy * dy)) || 0.0001;
                const minDistance = (entityA.radius || 0) + (entityB.radius || 0);

                if (distance >= minDistance || minDistance <= 0) continue;

                const overlap = minDistance - distance;
                const nx = dx / distance;
                const ny = dy / distance;
                const massA = typeof entityA.getCollisionMass === 'function' ? entityA.getCollisionMass() : (entityA.collisionMass || 1);
                const massB = typeof entityB.getCollisionMass === 'function' ? entityB.getCollisionMass() : (entityB.collisionMass || 1);
                const totalMass = massA + massB;
                const moveA = overlap * (massB / totalMass);
                const moveB = overlap * (massA / totalMass);

                entityA.x -= nx * moveA;
                entityA.y -= ny * moveA;
                entityB.x += nx * moveB;
                entityB.y += ny * moveB;
                entityA._dirty = true;
                entityB._dirty = true;
                correctedEntities.add(entityA);
                correctedEntities.add(entityB);
            }
        }
    }

    _collectPickups(players, pickups) {
        for (const player of players) {
            for (const pickup of pickups) {
                if (!this.entities.has(pickup.id)) continue;

                const dx = pickup.x - player.x;
                const dy = pickup.y - player.y;
                const distanceSq = (dx * dx) + (dy * dy);
                const radius = (pickup.radius || 12) + (player.radius || 16);

                if (distanceSq > radius * radius) continue;

                this.entities.delete(pickup.id);
                EventBus.enqueueEvent(EVENTS.PICKUP_COLLECTED, MessagePriority.HIGH, {
                    senderId: player.id,
                    targetId: pickup.id,
                    object1: pickup
                });
                EventBus.enqueueEvent(EVENTS.ENTITY_DESTROYED, MessagePriority.CRITICAL, {
                    senderId: pickup.id
                });
            }
        }
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
