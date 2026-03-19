import { cloneWeaponLoadout, getWeaponById } from './weapons';

const ENEMY_WEAPON_OVERRIDES = {
    fists: {
        aiStyle: 'rush',
        damageMultiplier: 0.9,
        impactForceMultiplier: 0.95,
        cooldownMultiplier: 1.15,
        hitstunMultiplier: 0.9,
        preferredRange: 52,
        retreatRange: 0,
        badgeColor: 0xf8f8f8
    },
    knife: {
        aiStyle: 'rush',
        damageMultiplier: 0.9,
        impactForceMultiplier: 0.9,
        cooldownMultiplier: 1.2,
        hitstunMultiplier: 0.95,
        preferredRange: 82,
        retreatRange: 0,
        badgeColor: 0xfff08a
    },
    gun: {
        aiStyle: 'ranged',
        damageMultiplier: 0.7,
        impactForceMultiplier: 0.75,
        cooldownMultiplier: 1.3,
        hitstunMultiplier: 0.8,
        preferredRange: 320,
        retreatRange: 170,
        badgeColor: 0x74d3ff
    },
    bottle: {
        aiStyle: 'lobber',
        damageMultiplier: 0.8,
        impactForceMultiplier: 0.8,
        cooldownMultiplier: 1.4,
        hitstunMultiplier: 0.9,
        preferredRange: 210,
        retreatRange: 120,
        chargeMs: 520,
        badgeColor: 0xff8cc8
    }
};

const ENEMY_WEAPON_POOLS = [
    { minWave: 1, items: [{ weaponId: 'fists', weight: 100 }] },
    { minWave: 2, items: [{ weaponId: 'fists', weight: 70 }, { weaponId: 'knife', weight: 30 }] },
    { minWave: 3, items: [{ weaponId: 'fists', weight: 45 }, { weaponId: 'knife', weight: 35 }, { weaponId: 'gun', weight: 20 }] },
    { minWave: 4, items: [{ weaponId: 'fists', weight: 30 }, { weaponId: 'knife', weight: 30 }, { weaponId: 'gun', weight: 25 }, { weaponId: 'bottle', weight: 15 }] }
];

function getPoolForWave(wave) {
    let activePool = ENEMY_WEAPON_POOLS[0];
    for (const pool of ENEMY_WEAPON_POOLS) {
        if (wave >= pool.minWave) {
            activePool = pool;
        }
    }
    return activePool.items;
}

export function createEnemyWeaponProfile(weaponId) {
    const weapon = getWeaponById(weaponId);
    const override = ENEMY_WEAPON_OVERRIDES[weaponId];

    if (!weapon || !override) {
        return null;
    }

    return {
        ...cloneWeaponLoadout().find((item) => item.id === weaponId),
        damage: Math.max(1, Math.round(weapon.damage * override.damageMultiplier)),
        impactForce: Math.max(1, Math.round(weapon.impactForce * override.impactForceMultiplier)),
        cooldownMs: Math.round(weapon.cooldownMs * override.cooldownMultiplier),
        hitstunMs: Math.round(weapon.hitstunMs * override.hitstunMultiplier),
        preferredRange: override.preferredRange,
        retreatRange: override.retreatRange,
        aiStyle: override.aiStyle,
        chargeMs: override.chargeMs || weapon.castTimeMs,
        badgeColor: override.badgeColor
    };
}

export function pickEnemyWeaponIdForWave(wave, randomFn = Math.random) {
    const pool = getPoolForWave(wave);
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let roll = randomFn() * totalWeight;

    for (const item of pool) {
        roll -= item.weight;
        if (roll <= 0) {
            return item.weaponId;
        }
    }

    return pool[pool.length - 1].weaponId;
}
