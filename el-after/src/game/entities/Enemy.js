import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import StatsComponent from '../components/StatsComponent';
import { buildAttackProfile } from '../data/attackProfiles';
import { createEnemyWeaponProfile } from '../data/enemyWeapons';

const ENEMY_TYPES = {
    fodder: {
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
    constructor(id, x, y, type = 'fodder', weaponId = 'fists') {
        const config = ENEMY_TYPES[type] || ENEMY_TYPES.fodder;

        this.id = id;
        this.x = x;
        this.y = y;
        this.velX = 0;
        this.velY = 0;
        this.angle = 0;
        this.type = config === ENEMY_TYPES.fodder ? 'fodder' : type;
        this.equippedWeapon = createEnemyWeaponProfile(weaponId) || createEnemyWeaponProfile('fists');
        this.weaponId = this.equippedWeapon.id;
        this.attackRange = this.equippedWeapon.preferredRange;
        this.retreatRange = this.equippedWeapon.retreatRange || 0;
        this.timeSinceLastAttack = Math.random() * this.equippedWeapon.cooldownMs;

        this.stats = new StatsComponent(config.stats);
        this.radius = config.radius;

        this.comboIndex = 0;
        this.comboTimerMs = Number.POSITIVE_INFINITY;
        this.nextKnifeSwingDirection = -1;

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

            this.comboTimerMs += deltaMs;

            const desiredRange = this.equippedWeapon.preferredRange;
            const retreatRange = this.retreatRange;

            if (distance > desiredRange) {
                this.moveTowards(dx, dy, distance, deltaMs);
                this.timeSinceLastAttack = 0;
            } else if (retreatRange > 0 && distance < retreatRange) {
                this.moveAway(dx, dy, distance, deltaMs);
                this.timeSinceLastAttack = 0;
            } else {
                this.velX = 0;
                this.velY = 0;
                this.timeSinceLastAttack += deltaMs;

                if (this.timeSinceLastAttack >= this.equippedWeapon.cooldownMs) {
                    this.timeSinceLastAttack = 0;
                    this.performAttack();
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

    moveTowards(dx, dy, distance, deltaMs) {
        if (distance <= 0) {
            this.velX = 0;
            this.velY = 0;
            return;
        }

        const speed = this.stats.getSpeed();
        this.velX = (dx / distance) * speed;
        this.velY = (dy / distance) * speed;
        this.x += this.velX * (deltaMs / 1000);
        this.y += this.velY * (deltaMs / 1000);
    }

    moveAway(dx, dy, distance, deltaMs) {
        if (distance <= 0) {
            this.velX = 0;
            this.velY = 0;
            return;
        }

        const speed = this.stats.getSpeed() * 0.8;
        this.velX = (-dx / distance) * speed;
        this.velY = (-dy / distance) * speed;
        this.x += this.velX * (deltaMs / 1000);
        this.y += this.velY * (deltaMs / 1000);
    }

    performAttack() {
        if (this.equippedWeapon.family === 'combo_melee' && this.comboTimerMs > this.equippedWeapon.comboWindowMs) {
            this.comboIndex = 0;
        }

        const result = buildAttackProfile(this.equippedWeapon, this.angle, {
            comboIndex: this.comboIndex,
            swingDirection: this.nextKnifeSwingDirection,
            chargeMs: this.equippedWeapon.chargeMs
        });

        if (this.equippedWeapon.family === 'combo_melee') {
            this.comboIndex = result.nextComboIndex ?? this.comboIndex;
            this.comboTimerMs = 0;
        }

        if (this.equippedWeapon.family === 'melee_sweep') {
            this.nextKnifeSwingDirection = result.nextSwingDirection ?? this.nextKnifeSwingDirection;
        }

        const attackProfile = result.attackProfile;

        EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
            senderId: this.id,
            float1: this.x,
            float2: this.y,
            float3: this.angle,
            float4: attackProfile.damage,
            float5: attackProfile.impactForce,
            int1: attackProfile.reach,
            string1: attackProfile.attackShape,
            object1: attackProfile
        });
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
