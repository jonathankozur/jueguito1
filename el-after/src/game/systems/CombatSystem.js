import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

export default class CombatSystem {
    constructor(simulation) {
        this.simulation = simulation;
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, this.handleAttack, this);
    }

    handleAttack(msg) {
        const attackerId = msg.senderId;
        const originX = msg.float1;
        const originY = msg.float2;
        const angle = msg.float3;
        const attack = this.normalizeAttack(msg);
        const attacker = this.simulation.entities.get(attackerId);
        const attackerStrength = attacker?.stats?.strength || 10;

        if (attack.attackShape === 'melee_circular' || attack.attackShape === 'melee_frontal' || attack.attackShape === 'melee_sweep') {
            this.handleMelee(attackerId, originX, originY, angle, attack, attackerStrength);
        } else if (attack.attackShape === 'distance') {
            this.handleDistance(attackerId, originX, originY, angle, attack, attackerStrength);
        } else if (attack.attackShape === 'throwable') {
            this.handleThrowable(attackerId, originX, originY, angle, attack, attackerStrength);
        }
    }

    normalizeAttack(msg) {
        const details = msg.object1 || {};

        return {
            weaponId: details.weaponId || details.id || msg.string1,
            weaponName: details.weaponName || details.name || msg.string1,
            family: details.family || msg.string1,
            attackShape: details.attackShape || msg.string1,
            damage: details.damage ?? msg.float4,
            impactForce: details.impactForce ?? msg.float5,
            reach: details.reach ?? msg.int1,
            hitstunMs: details.hitstunMs ?? 0,
            sweepAngle: details.sweepAngle ?? 60,
            startAngle: details.startAngle,
            endAngle: details.endAngle,
            aoeRadius: details.aoeRadius ?? 0,
            projectileRadius: details.projectileRadius ?? 4,
            projectileSpeed: details.projectileSpeed ?? 0,
            materialLoss: details.materialLoss ? { ...details.materialLoss } : undefined,
            comboIndex: details.comboIndex ?? 0,
            comboLabel: details.comboLabel || null,
            chargeRatio: details.chargeRatio ?? 0
        };
    }

    handleMelee(attackerId, originX, originY, angle, attack, attackerStrength) {
        for (const [targetId, entity] of this.simulation.entities.entries()) {
            if (targetId === attackerId || !entity.stats || entity.stats.isDead) continue;

            const dx = entity.x - originX;
            const dy = entity.y - originY;
            const dist = Math.sqrt((dx * dx) + (dy * dy));
            const effectiveRange = attack.reach + (entity.radius || 0);

            if (dist > effectiveRange) continue;
            if (!this.isMeleeTargetHit(dx, dy, dist, angle, attack)) continue;

            this.applyImpact(entity, attack.damage, attack, attackerStrength, Math.atan2(dy, dx));
        }
    }

    isMeleeTargetHit(dx, dy, dist, angle, attack) {
        if (attack.attackShape === 'melee_circular') {
            return true;
        }

        const angleToTarget = Math.atan2(dy, dx);

        if (attack.attackShape === 'melee_frontal') {
            const halfCone = ((attack.sweepAngle || 60) * Math.PI) / 360;
            return Math.abs(this.normalizeAngle(angleToTarget - angle)) <= halfCone;
        }

        if (attack.attackShape === 'melee_sweep') {
            const startAngle = attack.startAngle ?? (angle - (((attack.sweepAngle || 120) * Math.PI) / 360));
            const endAngle = attack.endAngle ?? (angle + (((attack.sweepAngle || 120) * Math.PI) / 360));
            return this.isAngleInsideSweep(angleToTarget, startAngle, endAngle, attack.sweepAngle || 120);
        }

        return dist <= attack.reach;
    }

    isAngleInsideSweep(targetAngle, startAngle, endAngle, sweepAngleDeg) {
        const samples = 7;
        const totalArc = (sweepAngleDeg * Math.PI) / 180;
        const tolerance = (totalArc / Math.max(1, samples - 1)) * 0.7;

        for (let i = 0; i < samples; i += 1) {
            const t = samples === 1 ? 0 : i / (samples - 1);
            const sampleAngle = startAngle + ((endAngle - startAngle) * t);
            if (Math.abs(this.normalizeAngle(targetAngle - sampleAngle)) <= tolerance) {
                return true;
            }
        }

        return false;
    }

    handleDistance(attackerId, originX, originY, angle, attack, attackerStrength) {
        let currentForce = this.calculateScaledForce(attack.impactForce, attackerStrength);
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const stepSize = 8;
        let currentX = originX;
        let currentY = originY;
        let distanceTraveled = 0;
        let projectileImpact = null;
        const hitEntities = new Set();

        projectileLoop:
        while (currentForce > 0 && distanceTraveled < attack.reach) {
            currentX += dirX * stepSize;
            currentY += dirY * stepSize;
            distanceTraveled += stepSize;

            for (const [targetId, entity] of this.simulation.entities.entries()) {
                if (targetId === attackerId || hitEntities.has(targetId)) continue;

                if (!this.checkPointInEntity(currentX, currentY, entity)) {
                    continue;
                }

                if (entity.stats && !entity.stats.isDead) {
                    this.applyImpact(entity, attack.damage, attack, attackerStrength, angle);
                    hitEntities.add(targetId);
                    currentForce = Math.max(0, currentForce - 20);

                    if (currentForce <= 0) {
                        projectileImpact = { x: currentX, y: currentY, reason: 'entity' };
                        break projectileLoop;
                    }
                } else if (entity.material) {
                    currentForce = this.applyMaterialLoss(currentForce, entity.material, attack.materialLoss);
                    if (currentForce <= 0) {
                        projectileImpact = { x: currentX, y: currentY, reason: 'wall' };
                        break projectileLoop;
                    }
                }
            }
        }

        if (projectileImpact) {
            this.emitProjectileImpact(attackerId, projectileImpact.x, projectileImpact.y, attack, projectileImpact.reason);
        }
    }

    handleThrowable(attackerId, originX, originY, angle, attack, attackerStrength) {
        const destX = originX + (Math.cos(angle) * attack.reach);
        const destY = originY + (Math.sin(angle) * attack.reach);
        const collision = this.getHighestWallCollision(originX, originY, destX, destY);

        const finalX = collision ? collision.x : destX;
        const finalY = collision ? collision.y : destY;
        const burstAttack = {
            ...attack,
            attackShape: 'melee_circular',
            reach: attack.aoeRadius || 80
        };

        this.handleMelee(attackerId, finalX, finalY, 0, burstAttack, attackerStrength);
        this.emitProjectileImpact(attackerId, finalX, finalY, attack, collision ? 'wall' : 'burst');
    }

    applyMaterialLoss(currentForce, material, materialLoss) {
        const lossTable = materialLoss || {
            soft: 10,
            medium: 40,
            hard: 'stop'
        };

        const materialRule = lossTable[material];
        if (materialRule === 'stop') {
            return 0;
        }

        return Math.max(0, currentForce - (materialRule || 0));
    }

    applyImpact(target, damage, attack, attackerStrength, angle) {
        const isDead = target.receiveDamage(damage);

        if (isDead) {
            this.killEntity(target.id, target);
            return;
        }

        const impulse = this.buildImpulse(target, attack, attackerStrength, angle);
        if (impulse.distance <= 0 && impulse.hitstunMs <= 0) {
            return;
        }

        if (typeof target.applyImpulse === 'function') {
            target.applyImpulse(impulse);
            return;
        }

        if (impulse.distance > 0) {
            const finalPosition = this.resolveKnockbackDestination(target, angle, impulse.distance);
            target.x = finalPosition.x;
            target.y = finalPosition.y;
            target._dirty = true;
        }
    }

    buildImpulse(target, attack, attackerStrength, angle) {
        const endurance = target.stats?.endurance || 10;
        const scaledForce = this.calculateScaledForce(attack.impactForce, attackerStrength);
        const effectiveForce = Math.max(0, scaledForce - (endurance * 1.1));
        const distance = effectiveForce * 0.85;
        const durationMs = Math.max(120, Math.min(260, 110 + (effectiveForce * 2.2)));
        const speed = durationMs > 0 ? distance / (durationMs / 1000) : 0;

        return {
            sourceWeaponId: attack.weaponId,
            angle,
            force: effectiveForce,
            distance,
            durationMs,
            speed,
            hitstunMs: attack.hitstunMs || 0
        };
    }

    calculateScaledForce(weaponImpactForce, attackerStrength) {
        return weaponImpactForce * (1 + (Math.max(0, (attackerStrength || 10) - 10) * 0.04));
    }

    emitProjectileImpact(attackerId, x, y, attack, reason) {
        EventBus.enqueueEvent(EVENTS.PROJECTILE_IMPACT, MessagePriority.HIGH, {
            senderId: attackerId,
            float1: x,
            float2: y,
            string1: attack.attackShape,
            object1: {
                weaponId: attack.weaponId,
                reason,
                aoeRadius: attack.aoeRadius || 0
            }
        });
    }

    getHighestWallCollision(x1, y1, x2, y2) {
        let nearestCollision = null;
        let minDistSq = Infinity;

        for (const entity of this.simulation.entities.values()) {
            if (entity.heightLevel === 'high') {
                const point = this.getLineRectIntersection(x1, y1, x2, y2, entity);
                if (point) {
                    const distSq = ((point.x - x1) ** 2) + ((point.y - y1) ** 2);
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        nearestCollision = point;
                    }
                }
            }
        }

        return nearestCollision;
    }

    getLineRectIntersection(x1, y1, x2, y2, rect) {
        const rectWidth = rect.width || 32;
        const rectHeight = rect.height || 32;
        const rectX = rect.x - (rectWidth / 2);
        const rectY = rect.y - (rectHeight / 2);

        if (x1 >= rectX && x1 <= rectX + rectWidth && y1 >= rectY && y1 <= rectY + rectHeight) {
            return { x: x1, y: y1 };
        }

        const steps = 20;
        for (let i = 0; i <= steps; i += 1) {
            const px = x1 + ((x2 - x1) * (i / steps));
            const py = y1 + ((y2 - y1) * (i / steps));
            if (px >= rectX && px <= rectX + rectWidth && py >= rectY && py <= rectY + rectHeight) {
                return { x: px, y: py };
            }
        }

        return null;
    }

    resolveKnockbackDestination(target, angle, pushDistance) {
        const radius = target.radius || 16;
        const startX = target.x;
        const startY = target.y;
        const destX = startX + (Math.cos(angle) * pushDistance);
        const destY = startY + (Math.sin(angle) * pushDistance);
        const distance = Math.hypot(destX - startX, destY - startY);
        const steps = Math.max(1, Math.ceil(distance / 4));
        let lastSafeX = startX;
        let lastSafeY = startY;

        for (let i = 1; i <= steps; i += 1) {
            const t = i / steps;
            const sampleX = startX + ((destX - startX) * t);
            const sampleY = startY + ((destY - startY) * t);

            if (this.isCircleBlocked(sampleX, sampleY, radius)) {
                return { x: lastSafeX, y: lastSafeY };
            }

            lastSafeX = sampleX;
            lastSafeY = sampleY;
        }

        return { x: destX, y: destY };
    }

    isCircleBlocked(x, y, radius) {
        for (const entity of this.simulation.entities.values()) {
            if (entity.width && entity.height && entity.material) {
                if (this.circleIntersectsRect(x, y, radius, entity)) {
                    return true;
                }
            }
        }

        return false;
    }

    circleIntersectsRect(x, y, radius, rect) {
        const halfW = (rect.width || 32) / 2;
        const halfH = (rect.height || 32) / 2;
        const closestX = Math.max(rect.x - halfW, Math.min(x, rect.x + halfW));
        const closestY = Math.max(rect.y - halfH, Math.min(y, rect.y + halfH));
        const dx = x - closestX;
        const dy = y - closestY;
        return ((dx * dx) + (dy * dy)) < (radius * radius);
    }

    checkPointInEntity(px, py, entity) {
        if (entity.radius) {
            const dx = px - entity.x;
            const dy = py - entity.y;
            return ((dx * dx) + (dy * dy)) <= ((entity.radius || 16) ** 2);
        }

        const halfW = (entity.width || 32) / 2;
        const halfH = (entity.height || 32) / 2;
        return px >= entity.x - halfW && px <= entity.x + halfW &&
               py >= entity.y - halfH && py <= entity.y + halfH;
    }

    normalizeAngle(angle) {
        let normalized = angle;
        while (normalized > Math.PI) normalized -= Math.PI * 2;
        while (normalized < -Math.PI) normalized += Math.PI * 2;
        return normalized;
    }

    killEntity(entityId) {
        this.simulation.entities.delete(entityId);
        EventBus.enqueueEvent(EVENTS.ENTITY_DESTROYED, MessagePriority.CRITICAL, {
            senderId: entityId
        });
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.ATTACK_PERFORMED, this.handleAttack, this);
        this.simulation = null;
    }
}
