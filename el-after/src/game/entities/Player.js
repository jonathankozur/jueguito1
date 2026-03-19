import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import StatsComponent from '../components/StatsComponent';
import { cloneWeaponLoadout, getChargeRatio, getSelectableWeaponSlots, lerp } from '../data/weapons';

const CHARGE_BUCKETS = 10;

export default class PlayerEntity {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.velX = 0;
        this.velY = 0;
        this.angle = 0;
        this.timeSinceLastAttack = 0;

        this.stats = new StatsComponent({
            maxHp: 100,
            baseSpeed: 200,
            strength: 15,
            endurance: 12
        });

        this.radius = 16;
        this.inventory = cloneWeaponLoadout();
        this.selectedSlot = 0;
        this.inputDirX = 0;
        this.inputDirY = 0;

        this.comboIndex = 0;
        this.comboTimerMs = Number.POSITIVE_INFINITY;
        this.nextKnifeSwingDirection = -1;

        this.isChargingAttack = false;
        this.chargeElapsedMs = 0;
        this.lastChargeBucket = -1;
        this.lastChargeActive = false;

        this.knockbackVelX = 0;
        this.knockbackVelY = 0;
        this.knockbackRemainingMs = 0;
        this.hitstunRemainingMs = 0;

        EventBus.subscribe(EVENTS.INPUT_MOVE, this.handleInputMove, this);
        EventBus.subscribe(EVENTS.INPUT_AIM, this.handleInputAim, this);
        EventBus.subscribe(EVENTS.INPUT_ATTACK, this.handleLegacyAttack, this);
        EventBus.subscribe(EVENTS.INPUT_ATTACK_START, this.handleInputAttackStart, this);
        EventBus.subscribe(EVENTS.INPUT_ATTACK_RELEASE, this.handleInputAttackRelease, this);
        EventBus.subscribe(EVENTS.INPUT_INVENTORY_CHANGE, this.handleInventoryChange, this);

        this.emitWeaponChanged();
    }

    handleInputMove(msg) {
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;

        this.inputDirX = msg.float1;
        this.inputDirY = msg.float2;
        this._dirty = true;
    }

    handleInputAim(msg) {
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;

        const targetX = msg.float1;
        const targetY = msg.float2;
        const prevAngle = this.angle;
        this.angle = Math.atan2(targetY - this.y, targetX - this.x);

        if (this.angle !== prevAngle) {
            this._dirty = true;
        }
    }

    handleLegacyAttack(msg) {
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;

        const weapon = this.getActiveWeapon();
        if (!weapon?.selectable || this.isStunned()) return;

        if (weapon.castMode === 'hold_release') {
            if (this.timeSinceLastAttack < weapon.cooldownMs) return;
            this.performAttack(weapon, { chargeMs: weapon.castTimeMs });
            return;
        }

        this.handleInputAttackStart(msg);
    }

    handleInputAttackStart(msg) {
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;

        const weapon = this.getActiveWeapon();
        if (!weapon?.selectable || this.isStunned()) return;
        if (this.timeSinceLastAttack < weapon.cooldownMs) return;

        if (weapon.castMode === 'hold_release') {
            if (this.isChargingAttack) return;

            this.isChargingAttack = true;
            this.chargeElapsedMs = 0;
            this.lastChargeBucket = -1;
            this.emitChargeUpdated(true, 0, true);
            this._dirty = true;
            return;
        }

        this.performAttack(weapon);
    }

    handleInputAttackRelease(msg) {
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;
        if (!this.isChargingAttack) return;

        const weapon = this.getActiveWeapon();
        if (!weapon || weapon.castMode !== 'hold_release') {
            this.cancelCharge();
            return;
        }

        const chargeMs = Math.min(this.chargeElapsedMs, weapon.chargeMaxMs || this.chargeElapsedMs);
        if (chargeMs >= weapon.castTimeMs) {
            this.performAttack(weapon, { chargeMs });
        }

        this.cancelCharge();
    }

    handleInventoryChange(msg) {
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;

        const previousSlot = this.selectedSlot;

        if (msg.string1 === 'key') {
            const slotIndex = msg.int1 - 1;
            const weapon = this.inventory[slotIndex];
            if (weapon?.selectable) {
                this.selectedSlot = slotIndex;
            }
        } else if (msg.string1 === 'wheel') {
            this.selectedSlot = this.getNextSelectableSlot(msg.int1);
        }

        if (previousSlot !== this.selectedSlot) {
            if (this.isChargingAttack) {
                this.cancelCharge();
            }
            this.emitWeaponChanged();
            this._dirty = true;
        }
    }

    getActiveWeapon() {
        return this.inventory[this.selectedSlot];
    }

    getNextSelectableSlot(delta) {
        const step = delta >= 0 ? 1 : -1;
        const selectableSlots = getSelectableWeaponSlots(this.inventory).length;
        let nextSlot = this.selectedSlot;

        for (let attempts = 0; attempts < selectableSlots + 1; attempts += 1) {
            nextSlot = (nextSlot + step + this.inventory.length) % this.inventory.length;
            if (this.inventory[nextSlot]?.selectable) {
                return nextSlot;
            }
        }

        return this.selectedSlot;
    }

    emitWeaponChanged() {
        const weapon = this.getActiveWeapon();
        EventBus.enqueueEvent(EVENTS.PLAYER_WEAPON_CHANGED, MessagePriority.NORMAL, {
            senderId: this.id,
            int1: weapon.slot,
            string1: weapon.name,
            object1: {
                id: weapon.id,
                slot: weapon.slot,
                name: weapon.name,
                family: weapon.family,
                selectable: weapon.selectable
            }
        });
    }

    emitChargeUpdated(active, ratio, force = false) {
        const roundedRatio = Math.max(0, Math.min(1, ratio));
        const bucket = active ? Math.round(roundedRatio * CHARGE_BUCKETS) : -1;

        if (!force && bucket === this.lastChargeBucket && active === this.lastChargeActive) {
            return;
        }

        this.lastChargeBucket = bucket;
        this.lastChargeActive = active;

        EventBus.enqueueEvent(EVENTS.ATTACK_CHARGE_UPDATED, MessagePriority.NORMAL, {
            senderId: this.id,
            float1: roundedRatio,
            float2: this.chargeElapsedMs,
            int1: this.getActiveWeapon().slot,
            string1: active ? 'charging' : 'idle',
            object1: {
                weaponId: this.getActiveWeapon().id,
                active
            }
        });
    }

    cancelCharge() {
        this.isChargingAttack = false;
        this.chargeElapsedMs = 0;
        this.emitChargeUpdated(false, 0, true);
        this._dirty = true;
    }

    performAttack(weapon, options = {}) {
        const attackProfile = this.buildAttackProfile(weapon, options);
        if (!attackProfile) return;

        this.timeSinceLastAttack = 0;

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

    buildAttackProfile(weapon, options = {}) {
        const baseAttack = {
            weaponId: weapon.id,
            weaponName: weapon.name,
            slot: weapon.slot,
            family: weapon.family,
            attackShape: weapon.attackShape,
            damage: weapon.damage,
            impactForce: weapon.impactForce,
            cooldownMs: weapon.cooldownMs,
            reach: weapon.reach,
            hitstunMs: weapon.hitstunMs,
            sweepAngle: weapon.sweepAngle,
            wallBehavior: weapon.wallBehavior,
            aoeRadius: weapon.aoeRadius,
            projectileRadius: weapon.projectileRadius || 4,
            projectileSpeed: weapon.projectileSpeed || 0,
            materialLoss: weapon.materialLoss ? { ...weapon.materialLoss } : undefined
        };

        if (weapon.family === 'combo_melee') {
            if (this.comboTimerMs > weapon.comboWindowMs) {
                this.comboIndex = 0;
            }

            const step = weapon.combo[this.comboIndex] || weapon.combo[0];
            const comboIndex = this.comboIndex;

            this.comboIndex = (this.comboIndex + 1) % weapon.combo.length;
            this.comboTimerMs = 0;

            const comboAttack = {
                ...baseAttack,
                ...step,
                family: weapon.family,
                comboIndex: comboIndex + 1,
                comboLabel: step.label
            };

            return this.applySweepAngles(comboAttack, step.sweepDirection);
        }

        if (weapon.family === 'melee_sweep') {
            const direction = this.nextKnifeSwingDirection;
            this.nextKnifeSwingDirection *= -1;
            return this.applySweepAngles(baseAttack, direction);
        }

        if (weapon.family === 'charged_throw') {
            const chargeMs = Math.max(weapon.castTimeMs, options.chargeMs || weapon.castTimeMs);
            const chargeRatio = getChargeRatio(chargeMs, weapon);

            return {
                ...baseAttack,
                chargeMs,
                chargeRatio,
                damage: Math.round(lerp(weapon.minDamage, weapon.maxDamage, chargeRatio)),
                impactForce: Math.round(lerp(weapon.minImpactForce, weapon.maxImpactForce, chargeRatio)),
                reach: Math.round(lerp(weapon.minRange, weapon.maxRange, chargeRatio)),
                aoeRadius: Math.round(lerp(weapon.minAoeRadius, weapon.maxAoeRadius, chargeRatio))
            };
        }

        return baseAttack;
    }

    applySweepAngles(attackProfile, direction) {
        if (attackProfile.attackShape !== 'melee_sweep') {
            return attackProfile;
        }

        const halfAngle = ((attackProfile.sweepAngle || 90) * Math.PI) / 360;
        const sweepDirection = direction >= 0 ? 1 : -1;
        const startAngle = sweepDirection > 0 ? this.angle - halfAngle : this.angle + halfAngle;
        const endAngle = sweepDirection > 0 ? this.angle + halfAngle : this.angle - halfAngle;

        return {
            ...attackProfile,
            sweepDirection,
            startAngle,
            endAngle
        };
    }

    isStunned() {
        return this.hitstunRemainingMs > 0 || this.knockbackRemainingMs > 0;
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
        this.isChargingAttack = false;
        this.chargeElapsedMs = 0;
        this.emitChargeUpdated(false, 0, true);
        this._dirty = true;
    }

    update(deltaMs) {
        const prevX = this.x;
        const prevY = this.y;

        this.timeSinceLastAttack += deltaMs;
        this.comboTimerMs += deltaMs;

        if (this.isChargingAttack) {
            const weapon = this.getActiveWeapon();
            this.chargeElapsedMs = Math.min(this.chargeElapsedMs + deltaMs, weapon.chargeMaxMs || this.chargeElapsedMs);
            this.emitChargeUpdated(true, getChargeRatio(this.chargeElapsedMs, weapon));
        }

        if (this.knockbackRemainingMs > 0 || this.hitstunRemainingMs > 0) {
            this.updateImpulse(deltaMs);
        } else {
            this.updateMovementFromInput();
            this.x += this.velX * (deltaMs / 1000);
            this.y += this.velY * (deltaMs / 1000);
        }

        if (this.x !== prevX || this.y !== prevY) {
            this._dirty = true;
        }

        if (this._dirty || this.velX !== 0 || this.velY !== 0) {
            EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.NORMAL, {
                string1: 'moved',
                senderId: this.id,
                float1: this.x,
                float2: this.y,
                float3: this.velX,
                float4: this.velY,
                float5: this.angle,
                int1: this.selectedSlot
            });
            this._dirty = false;
        }
    }

    updateMovementFromInput() {
        const dirX = this.inputDirX;
        const dirY = this.inputDirY;

        if (dirX === 0 && dirY === 0) {
            this.velX = 0;
            this.velY = 0;
            return;
        }

        const length = Math.sqrt((dirX * dirX) + (dirY * dirY));
        const weapon = this.getActiveWeapon();
        const speedMultiplier = this.isChargingAttack ? (weapon.movementMultiplier || 1) : 1;
        const currentSpeed = this.stats.getSpeed() * speedMultiplier;

        this.velX = (dirX / length) * currentSpeed;
        this.velY = (dirY / length) * currentSpeed;
    }

    updateImpulse(deltaMs) {
        const knockbackStepMs = Math.min(deltaMs, this.knockbackRemainingMs);
        if (knockbackStepMs > 0) {
            this.x += this.knockbackVelX * (knockbackStepMs / 1000);
            this.y += this.knockbackVelY * (knockbackStepMs / 1000);

            const decay = Math.exp(-knockbackStepMs / 90);
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
        EventBus.unsubscribe(EVENTS.INPUT_MOVE, this.handleInputMove, this);
        EventBus.unsubscribe(EVENTS.INPUT_AIM, this.handleInputAim, this);
        EventBus.unsubscribe(EVENTS.INPUT_ATTACK, this.handleLegacyAttack, this);
        EventBus.unsubscribe(EVENTS.INPUT_ATTACK_START, this.handleInputAttackStart, this);
        EventBus.unsubscribe(EVENTS.INPUT_ATTACK_RELEASE, this.handleInputAttackRelease, this);
        EventBus.unsubscribe(EVENTS.INPUT_INVENTORY_CHANGE, this.handleInventoryChange, this);
    }

    receiveDamage(amount) {
        this.stats.takeDamage(amount);

        EventBus.enqueueEvent(EVENTS.PLAYER_HP_CHANGED, MessagePriority.HIGH, {
            senderId: this.id,
            float1: this.stats.currentHp,
            float2: this.stats.maxHp
        });

        if (this.stats.isDead) {
            EventBus.enqueueEvent(EVENTS.PLAYER_DIED, MessagePriority.CRITICAL, {
                senderId: this.id
            });
            return true;
        }

        return false;
    }
}
