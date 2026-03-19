import { getChargeRatio, lerp } from './weapons';

function buildBaseAttack(weapon) {
    return {
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
}

export function applySweepAngles(attackProfile, facingAngle, direction) {
    if (attackProfile.attackShape !== 'melee_sweep') {
        return attackProfile;
    }

    const halfAngle = ((attackProfile.sweepAngle || 90) * Math.PI) / 360;
    const sweepDirection = direction >= 0 ? 1 : -1;
    const startAngle = sweepDirection > 0 ? facingAngle - halfAngle : facingAngle + halfAngle;
    const endAngle = sweepDirection > 0 ? facingAngle + halfAngle : facingAngle - halfAngle;

    return {
        ...attackProfile,
        sweepDirection,
        startAngle,
        endAngle
    };
}

export function buildAttackProfile(weapon, facingAngle, options = {}) {
    const baseAttack = buildBaseAttack(weapon);

    if (weapon.family === 'combo_melee') {
        const comboIndex = options.comboIndex ?? 0;
        const step = weapon.combo?.[comboIndex] || weapon.combo?.[0];
        const comboAttack = {
            ...baseAttack,
            ...step,
            family: weapon.family,
            comboIndex: comboIndex + 1,
            comboLabel: step?.label || 'combo'
        };

        return {
            attackProfile: applySweepAngles(comboAttack, facingAngle, step?.sweepDirection || 1),
            nextComboIndex: (comboIndex + 1) % weapon.combo.length
        };
    }

    if (weapon.family === 'melee_sweep') {
        const direction = options.swingDirection ?? 1;
        return {
            attackProfile: applySweepAngles(baseAttack, facingAngle, direction),
            nextSwingDirection: direction * -1
        };
    }

    if (weapon.family === 'charged_throw') {
        const chargeMs = Math.max(weapon.castTimeMs, options.chargeMs || weapon.castTimeMs);
        const chargeRatio = getChargeRatio(chargeMs, weapon);

        return {
            attackProfile: {
                ...baseAttack,
                chargeMs,
                chargeRatio,
                damage: Math.round(lerp(weapon.minDamage, weapon.maxDamage, chargeRatio)),
                impactForce: Math.round(lerp(weapon.minImpactForce, weapon.maxImpactForce, chargeRatio)),
                reach: Math.round(lerp(weapon.minRange, weapon.maxRange, chargeRatio)),
                aoeRadius: Math.round(lerp(weapon.minAoeRadius, weapon.maxAoeRadius, chargeRatio))
            }
        };
    }

    return {
        attackProfile: baseAttack
    };
}
