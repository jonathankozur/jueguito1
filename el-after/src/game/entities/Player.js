import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import StatsComponent from '../components/StatsComponent';
import { cloneWeaponLoadout, getChargeRatio, getSelectableWeaponSlots } from '../data/weapons';
import { buildAttackProfile } from '../data/attackProfiles';

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
        this.activeBuffs = [];

        this.dashDurationMs = 130;
        this.dashCooldownMs = 900;
        this.dashSpeed = 640;
        this.dashRemainingMs = 0;
        this.dashCooldownRemainingMs = 0;
        this.dashDirX = 0;
        this.dashDirY = 0;

        this.knockbackVelX = 0;
        this.knockbackVelY = 0;
        this.knockbackRemainingMs = 0;
        this.hitstunRemainingMs = 0;

        EventBus.subscribe(EVENTS.INPUT_MOVE, this.handleInputMove, this);
        EventBus.subscribe(EVENTS.INPUT_AIM, this.handleInputAim, this);
        EventBus.subscribe(EVENTS.INPUT_ATTACK, this.handleLegacyAttack, this);
        EventBus.subscribe(EVENTS.INPUT_ATTACK_START, this.handleInputAttackStart, this);
        EventBus.subscribe(EVENTS.INPUT_ATTACK_RELEASE, this.handleInputAttackRelease, this);
        EventBus.subscribe(EVENTS.INPUT_DASH, this.handleInputDash, this);
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
            if (this.timeSinceLastAttack < this.stats.getAttackCooldown(weapon.cooldownMs)) return;
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
        if (this.timeSinceLastAttack < this.stats.getAttackCooldown(weapon.cooldownMs)) return;

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

    handleInputDash(msg) {
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;
        if (this.isStunned() || this.isChargingAttack) return;
        if (this.dashRemainingMs > 0 || this.dashCooldownRemainingMs > 0) return;

        const inputMagnitude = Math.hypot(this.inputDirX, this.inputDirY);
        if (inputMagnitude > 0) {
            this.dashDirX = this.inputDirX / inputMagnitude;
            this.dashDirY = this.inputDirY / inputMagnitude;
        } else {
            this.dashDirX = Math.cos(this.angle);
            this.dashDirY = Math.sin(this.angle);
        }

        this.dashRemainingMs = this.dashDurationMs;
        this.dashCooldownRemainingMs = this.dashCooldownMs;
        this.cancelCharge();
        this.emitDashState();
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
                level: weapon.level || 1,
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
        if (weapon.family === 'combo_melee' && this.comboTimerMs > weapon.comboWindowMs) {
            this.comboIndex = 0;
        }

        const result = buildAttackProfile(weapon, this.angle, {
            comboIndex: this.comboIndex,
            swingDirection: this.nextKnifeSwingDirection,
            chargeMs: options.chargeMs
        });

        if (weapon.family === 'combo_melee') {
            this.comboIndex = result.nextComboIndex ?? this.comboIndex;
            this.comboTimerMs = 0;
        }

        if (weapon.family === 'melee_sweep') {
            this.nextKnifeSwingDirection = result.nextSwingDirection ?? this.nextKnifeSwingDirection;
        }

        return {
            ...result.attackProfile,
            damage: this.stats.getScaledDamage(result.attackProfile.damage),
            impactForce: Math.max(1, Math.round(result.attackProfile.impactForce * this.stats.damageMultiplier)),
            cooldownMs: this.stats.getAttackCooldown(result.attackProfile.cooldownMs)
        };
    }

    isStunned() {
        return this.hitstunRemainingMs > 0 || this.knockbackRemainingMs > 0;
    }

    isInvulnerable() {
        return this.dashRemainingMs > 0;
    }

    getCollisionMass() {
        return this.isInvulnerable() ? 3.4 : 1.2;
    }

    applyImpulse(payload) {
        if (this.isInvulnerable()) {
            return;
        }

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
        this.updateDashCooldown(deltaMs);
        this.updateActiveBuffs(deltaMs);

        if (this.isChargingAttack) {
            const weapon = this.getActiveWeapon();
            this.chargeElapsedMs = Math.min(this.chargeElapsedMs + deltaMs, weapon.chargeMaxMs || this.chargeElapsedMs);
            this.emitChargeUpdated(true, getChargeRatio(this.chargeElapsedMs, weapon));
        }

        if (this.dashRemainingMs > 0) {
            this.updateDash(deltaMs);
        } else if (this.knockbackRemainingMs > 0 || this.hitstunRemainingMs > 0) {
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

    updateDashCooldown(deltaMs) {
        const previousCooldown = this.dashCooldownRemainingMs;
        this.dashCooldownRemainingMs = Math.max(0, this.dashCooldownRemainingMs - deltaMs);

        if (previousCooldown > 0 && this.dashCooldownRemainingMs === 0) {
            this.emitDashState();
        }
    }

    updateDash(deltaMs) {
        const dashStepMs = Math.min(deltaMs, this.dashRemainingMs);
        const dashDistance = this.dashSpeed * (dashStepMs / 1000);

        this.velX = this.dashDirX * this.dashSpeed;
        this.velY = this.dashDirY * this.dashSpeed;
        this.x += this.dashDirX * dashDistance;
        this.y += this.dashDirY * dashDistance;
        this.dashRemainingMs = Math.max(0, this.dashRemainingMs - dashStepMs);

        if (this.dashRemainingMs === 0) {
            this.velX = 0;
            this.velY = 0;
            this.emitDashState();
        }
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

    emitDashState() {
        EventBus.enqueueEvent(EVENTS.PLAYER_DASH_STATE_CHANGED, MessagePriority.NORMAL, {
            senderId: this.id,
            float1: this.dashRemainingMs,
            float2: this.dashCooldownRemainingMs,
            string1: this.dashRemainingMs > 0 ? 'dashing' : (this.dashCooldownRemainingMs > 0 ? 'cooldown' : 'ready')
        });
    }

    updateActiveBuffs(deltaMs) {
        if (this.activeBuffs.length === 0) {
            this.applyRegeneration(deltaMs);
            return;
        }

        for (let index = this.activeBuffs.length - 1; index >= 0; index -= 1) {
            const buff = this.activeBuffs[index];
            buff.remainingMs -= deltaMs;
            if (buff.remainingMs <= 0) {
                this.applyStatEffect(buff.effect, -1);
                this.activeBuffs.splice(index, 1);
            }
        }

        this.applyRegeneration(deltaMs);
    }

    applyRegeneration(deltaMs) {
        if (this.stats.regenPerSecond <= 0 || this.stats.currentHp >= this.stats.maxHp) {
            return;
        }

        const regenAmount = this.stats.regenPerSecond * (deltaMs / 1000);
        const healed = this.stats.heal(regenAmount);
        if (healed > 0) {
            this.emitHpChanged();
        }
    }

    emitHpChanged() {
        EventBus.enqueueEvent(EVENTS.PLAYER_HP_CHANGED, MessagePriority.HIGH, {
            senderId: this.id,
            float1: this.stats.currentHp,
            float2: this.stats.maxHp
        });
    }

    applyStatEffect(effect = {}, direction = 1) {
        if (effect.speedMultiplier) {
            this.stats.speedMultiplier = Math.max(0.5, this.stats.speedMultiplier + (effect.speedMultiplier * direction));
        }
        if (effect.attackSpeedMultiplier) {
            this.stats.attackSpeedMultiplier = Math.max(0.35, this.stats.attackSpeedMultiplier + (effect.attackSpeedMultiplier * direction));
        }
        if (effect.damageMultiplier) {
            this.stats.damageMultiplier = Math.max(0.5, this.stats.damageMultiplier + (effect.damageMultiplier * direction));
        }
        if (effect.regenPerSecond) {
            this.stats.regenPerSecond = Math.max(0, this.stats.regenPerSecond + (effect.regenPerSecond * direction));
        }
        if (effect.armor) {
            this.stats.armor = Math.max(0, this.stats.armor + (effect.armor * direction));
        }
    }

    applyDrink(drink) {
        if (!drink) return;

        if (drink.effect?.heal) {
            this.stats.heal(drink.effect.heal);
            this.emitHpChanged();
        }

        const statEffect = { ...drink.effect };
        delete statEffect.heal;

        if (drink.durationMs > 0 && Object.keys(statEffect).length > 0) {
            const existingIndex = this.activeBuffs.findIndex((buff) => buff.id === drink.id);
            if (existingIndex >= 0) {
                this.applyStatEffect(this.activeBuffs[existingIndex].effect, -1);
                this.activeBuffs.splice(existingIndex, 1);
            }

            this.applyStatEffect(statEffect, 1);
            this.activeBuffs.push({
                id: drink.id,
                name: drink.name,
                remainingMs: drink.durationMs,
                effect: statEffect,
                color: drink.color
            });
        }
    }

    applyPermanentReward(reward = {}) {
        if (reward.maxHp) {
            this.stats.maxHp += reward.maxHp;
            this.stats.currentHp = Math.min(this.stats.maxHp, this.stats.currentHp + reward.maxHp);
            this.emitHpChanged();
        }

        if (reward.heal) {
            this.stats.heal(reward.heal);
            this.emitHpChanged();
        }

        this.applyStatEffect(reward, 1);
    }

    upgradeWeapon(weaponId) {
        const weapon = this.inventory.find((item) => item.id === weaponId);
        if (!weapon) return;

        weapon.level = (weapon.level || 1) + 1;
        weapon.damage = Math.max(1, Math.round(weapon.damage * 1.14));
        weapon.impactForce = Math.max(1, Math.round(weapon.impactForce * 1.1));
        weapon.reach = Math.round(weapon.reach * 1.05);
        weapon.cooldownMs = Math.max(90, Math.round(weapon.cooldownMs * 0.94));

        if (weapon.combo) {
            weapon.combo = weapon.combo.map((step) => ({
                ...step,
                damage: Math.max(1, Math.round(step.damage * 1.14)),
                impactForce: Math.max(1, Math.round(step.impactForce * 1.1)),
                reach: Math.round(step.reach * 1.05),
                cooldownMs: Math.max(90, Math.round(step.cooldownMs * 0.94))
            }));
        }

        if (weapon.minDamage) weapon.minDamage = Math.max(1, Math.round(weapon.minDamage * 1.12));
        if (weapon.maxDamage) weapon.maxDamage = Math.max(weapon.minDamage || 1, Math.round(weapon.maxDamage * 1.12));
        if (weapon.minImpactForce) weapon.minImpactForce = Math.round(weapon.minImpactForce * 1.08);
        if (weapon.maxImpactForce) weapon.maxImpactForce = Math.round(weapon.maxImpactForce * 1.08);
        if (weapon.minRange) weapon.minRange = Math.round(weapon.minRange * 1.04);
        if (weapon.maxRange) weapon.maxRange = Math.round(weapon.maxRange * 1.04);
        if (weapon.minAoeRadius) weapon.minAoeRadius = Math.round(weapon.minAoeRadius * 1.06);
        if (weapon.maxAoeRadius) weapon.maxAoeRadius = Math.round(weapon.maxAoeRadius * 1.06);

        if (weapon === this.getActiveWeapon()) {
            this.emitWeaponChanged();
        }
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.INPUT_MOVE, this.handleInputMove, this);
        EventBus.unsubscribe(EVENTS.INPUT_AIM, this.handleInputAim, this);
        EventBus.unsubscribe(EVENTS.INPUT_ATTACK, this.handleLegacyAttack, this);
        EventBus.unsubscribe(EVENTS.INPUT_ATTACK_START, this.handleInputAttackStart, this);
        EventBus.unsubscribe(EVENTS.INPUT_ATTACK_RELEASE, this.handleInputAttackRelease, this);
        EventBus.unsubscribe(EVENTS.INPUT_DASH, this.handleInputDash, this);
        EventBus.unsubscribe(EVENTS.INPUT_INVENTORY_CHANGE, this.handleInventoryChange, this);
    }

    receiveDamage(amount) {
        if (this.isInvulnerable()) {
            return false;
        }

        this.stats.takeDamage(amount);

        this.emitHpChanged();

        if (this.stats.isDead) {
            EventBus.enqueueEvent(EVENTS.PLAYER_DIED, MessagePriority.CRITICAL, {
                senderId: this.id
            });
            return true;
        }

        return false;
    }
}
