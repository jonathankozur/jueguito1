import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import StatsComponent from '../components/StatsComponent';

const ENEMY_TYPES = {
    fodder: {
        attackRange: 34,
        radius: 16,
        stats: {
            maxHp: 50,
            baseSpeed: 100,
            damage: 5,
            attackRate: 1000,
            strength: 5,
            endurance: 5
        }
    },
    bouncer: {
        attackRange: 42,
        radius: 20,
        stats: {
            maxHp: 120,
            baseSpeed: 70,
            damage: 10,
            attackRate: 1350,
            strength: 12,
            endurance: 16
        }
    }
};

export default class EnemyEntity {
    constructor(id, x, y, type = 'fodder') {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.fodder;

        this.id = id;
        this.x = x;
        this.y = y;
        this.velX = 0;
        this.velY = 0;
        this.angle = 0;
        this.type = config === ENEMY_TYPES.fodder ? 'fodder' : type;
        this.attackRange = config.attackRange;
        this.timeSinceLastAttack = Math.random() * 500;

        this.stats = new StatsComponent(config.stats);
        this.radius = config.radius;
        this.knockbackVelX = 0;
        this.knockbackVelY = 0;
        this.knockbackRemainingMs = 0;
        this.hitstunRemainingMs = 0;
        this._dirty = true;
    }

    update(deltaMs, playerTarget) {
        if (this.stats.isDead) return;

        const prevX = this.x;
        const prevY = this.y;
        const prevAngle = this.angle;

        if (this.isControlled()) {
            this.updateImpulse(deltaMs);
            this.timeSinceLastAttack = 0;
        } else if (playerTarget) {
            const dx = playerTarget.x - this.x;
            const dy = playerTarget.y - this.y;
            const distance = Math.sqrt((dx * dx) + (dy * dy));

            if (distance > 0) {
                this.angle = Math.atan2(dy, dx);
            }

            if (distance > this.attackRange) {
                const speed = this.stats.getSpeed();
                this.velX = (dx / distance) * speed;
                this.velY = (dy / distance) * speed;
                this.x += this.velX * (deltaMs / 1000);
                this.y += this.velY * (deltaMs / 1000);
                this.timeSinceLastAttack = 0;
            } else {
                this.velX = 0;
                this.velY = 0;
                this.timeSinceLastAttack += deltaMs;

                if (this.timeSinceLastAttack >= this.stats.attackRate) {
                    this.timeSinceLastAttack = 0;
                    EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
                        senderId: this.id,
                        float1: this.x,
                        float2: this.y,
                        float3: this.angle,
                        float4: this.stats.damage,
                        float5: this.stats.strength * 2,
                        int1: this.attackRange,
                        string1: 'melee_frontal',
                        object1: {
                            weaponId: `${this.type}_melee`,
                            weaponName: `${this.type}_melee`,
                            family: 'enemy_melee',
                            attackShape: 'melee_frontal',
                            damage: this.stats.damage,
                            impactForce: this.stats.strength * 2,
                            reach: this.attackRange,
                            hitstunMs: 110,
                            sweepAngle: 60
                        }
                    });
                }
            }
        } else {
            this.velX = 0;
            this.velY = 0;
        }

        if (this.x !== prevX || this.y !== prevY || this.angle !== prevAngle) {
            this._dirty = true;
        }

        if (this._dirty || playerTarget) {
            EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.NORMAL, {
                string1: 'moved',
                senderId: this.id,
                float1: this.x,
                float2: this.y,
                float3: this.velX,
                float4: this.velY,
                float5: this.angle
            });
            this._dirty = false;
        }
    }

    isControlled() {
        return this.knockbackRemainingMs > 0 || this.hitstunRemainingMs > 0;
    }

    applyImpulse(payload) {
        const speed = payload.speed || 0;
        const durationMs = payload.durationMs || 0;

        if (speed <= 0 && !payload.hitstunMs) {
            return;
        }

        this.knockbackVelX = Math.cos(payload.angle) * speed;
        this.knockbackVelY = Math.sin(payload.angle) * speed;
        this.knockbackRemainingMs = Math.max(this.knockbackRemainingMs, durationMs);
        this.hitstunRemainingMs = Math.max(this.hitstunRemainingMs, payload.hitstunMs || 0);
        this.velX = 0;
        this.velY = 0;
        this.timeSinceLastAttack = 0;
        this._dirty = true;
    }

    updateImpulse(deltaMs) {
        const knockbackStepMs = Math.min(deltaMs, this.knockbackRemainingMs);
        if (knockbackStepMs > 0) {
            this.x += this.knockbackVelX * (knockbackStepMs / 1000);
            this.y += this.knockbackVelY * (knockbackStepMs / 1000);

            const decay = Math.exp(-knockbackStepMs / 95);
            this.knockbackVelX *= decay;
            this.knockbackVelY *= decay;
            this.knockbackRemainingMs = Math.max(0, this.knockbackRemainingMs - knockbackStepMs);
        }

        this.hitstunRemainingMs = Math.max(0, this.hitstunRemainingMs - deltaMs);

        if (this.knockbackRemainingMs <= 0) {
            this.knockbackVelX = 0;
            this.knockbackVelY = 0;
        }

        this.velX = this.knockbackRemainingMs > 0 ? this.knockbackVelX : 0;
        this.velY = this.knockbackRemainingMs > 0 ? this.knockbackVelY : 0;
    }

    destroy() {
        // Cleanup subscriptions if any
    }

    receiveDamage(amount) {
        this.stats.takeDamage(amount);

        EventBus.enqueueEvent(EVENTS.ENTITY_HP_CHANGED, MessagePriority.HIGH, {
            senderId: this.id,
            float1: this.stats.currentHp,
            float2: this.stats.maxHp
        });

        return this.stats.isDead;
    }
}
