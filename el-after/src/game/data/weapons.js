const PLAYER_WEAPON_LOADOUT = [
    {
        id: 'fists',
        slot: 1,
        name: 'Los Punos',
        family: 'combo_melee',
        attackShape: 'melee_sweep',
        selectable: true,
        damage: 6,
        impactForce: 22,
        cooldownMs: 220,
        reach: 58,
        hitstunMs: 180,
        castMode: 'instant',
        castTimeMs: 0,
        chargeMaxMs: 0,
        chargeCurve: 'none',
        sweepAngle: 90,
        wallBehavior: 'ignore',
        aoeRadius: 0,
        comboWindowMs: 450,
        combo: [
            {
                label: 'jab_left',
                damage: 6,
                impactForce: 18,
                cooldownMs: 220,
                reach: 56,
                hitstunMs: 190,
                attackShape: 'melee_sweep',
                sweepAngle: 82,
                sweepDirection: -1
            },
            {
                label: 'jab_right',
                damage: 7,
                impactForce: 20,
                cooldownMs: 220,
                reach: 58,
                hitstunMs: 190,
                attackShape: 'melee_sweep',
                sweepAngle: 82,
                sweepDirection: 1
            },
            {
                label: 'push',
                damage: 10,
                impactForce: 52,
                cooldownMs: 360,
                reach: 64,
                hitstunMs: 280,
                attackShape: 'melee_circular',
                sweepAngle: 120,
                sweepDirection: 0
            }
        ]
    },
    {
        id: 'knife',
        slot: 2,
        name: 'Cuchillo',
        family: 'melee_sweep',
        attackShape: 'melee_sweep',
        selectable: true,
        damage: 16,
        impactForce: 16,
        cooldownMs: 300,
        reach: 86,
        hitstunMs: 150,
        castMode: 'instant',
        castTimeMs: 0,
        chargeMaxMs: 0,
        chargeCurve: 'none',
        sweepAngle: 120,
        wallBehavior: 'ignore',
        aoeRadius: 0
    },
    {
        id: 'gun',
        slot: 3,
        name: 'El Chumbo',
        family: 'projectile',
        attackShape: 'distance',
        selectable: true,
        damage: 25,
        impactForce: 44,
        cooldownMs: 600,
        reach: 500,
        hitstunMs: 95,
        castMode: 'instant',
        castTimeMs: 0,
        chargeMaxMs: 0,
        chargeCurve: 'none',
        sweepAngle: 0,
        wallBehavior: 'material_penetration',
        aoeRadius: 0,
        projectileRadius: 4,
        projectileSpeed: 5.4,
        materialLoss: {
            soft: 10,
            medium: 40,
            hard: 'stop'
        }
    },
    {
        id: 'bottle',
        slot: 4,
        name: 'Botella',
        family: 'charged_throw',
        attackShape: 'throwable',
        selectable: true,
        damage: 12,
        impactForce: 34,
        cooldownMs: 900,
        reach: 180,
        hitstunMs: 220,
        castMode: 'hold_release',
        castTimeMs: 120,
        chargeMaxMs: 900,
        chargeCurve: 'ease_out',
        sweepAngle: 0,
        wallBehavior: 'stop_on_high',
        aoeRadius: 68,
        projectileRadius: 6,
        projectileSpeed: 0.78,
        movementMultiplier: 0.65,
        minDamage: 10,
        maxDamage: 18,
        minImpactForce: 30,
        maxImpactForce: 90,
        minRange: 160,
        maxRange: 360,
        minAoeRadius: 60,
        maxAoeRadius: 120
    },
    {
        id: 'reserved',
        slot: 5,
        name: 'Reservado',
        family: 'reserved',
        attackShape: 'disabled',
        selectable: false,
        damage: 0,
        impactForce: 0,
        cooldownMs: 0,
        reach: 0,
        hitstunMs: 0,
        castMode: 'disabled',
        castTimeMs: 0,
        chargeMaxMs: 0,
        chargeCurve: 'none',
        sweepAngle: 0,
        wallBehavior: 'ignore',
        aoeRadius: 0
    }
];

function cloneWeapon(weapon) {
    return {
        ...weapon,
        combo: weapon.combo ? weapon.combo.map((step) => ({ ...step })) : undefined,
        materialLoss: weapon.materialLoss ? { ...weapon.materialLoss } : undefined
    };
}

export function cloneWeaponLoadout() {
    return PLAYER_WEAPON_LOADOUT.map(cloneWeapon);
}

export function getWeaponLoadout() {
    return PLAYER_WEAPON_LOADOUT;
}

export function getWeaponBySlot(slot) {
    return PLAYER_WEAPON_LOADOUT.find((weapon) => weapon.slot === slot) || null;
}

export function getSelectableWeaponSlots(loadout = PLAYER_WEAPON_LOADOUT) {
    return loadout.filter((weapon) => weapon.selectable).map((weapon) => weapon.slot);
}

export function getChargeRatio(chargeMs, weapon) {
    if (!weapon || !weapon.chargeMaxMs) return 0;
    const linear = Math.max(0, Math.min(1, chargeMs / weapon.chargeMaxMs));

    if (weapon.chargeCurve === 'ease_out') {
        return 1 - ((1 - linear) * (1 - linear));
    }

    return linear;
}

export function lerp(min, max, t) {
    return min + ((max - min) * t);
}

export default PLAYER_WEAPON_LOADOUT;
