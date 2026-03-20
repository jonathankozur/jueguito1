const DRINK_DEFINITIONS = [
    {
        id: 'fernet',
        name: 'Fernet 70/30',
        color: 0x7a4b22,
        pickupWeight: 28,
        durationMs: 0,
        effect: {
            heal: 24
        }
    },
    {
        id: 'speedy',
        name: 'Speedy',
        color: 0x17d87f,
        pickupWeight: 24,
        durationMs: 10000,
        effect: {
            speedMultiplier: 0.28
        }
    },
    {
        id: 'vodka',
        name: 'Vodka Tonic',
        color: 0x89d4ff,
        pickupWeight: 24,
        durationMs: 10000,
        effect: {
            attackSpeedMultiplier: 0.25
        }
    },
    {
        id: 'destornillador',
        name: 'Destornillador',
        color: 0xffa549,
        pickupWeight: 24,
        durationMs: 10000,
        effect: {
            damageMultiplier: 0.22
        }
    }
];

const PERMANENT_DRINK_CHOICES = [
    {
        id: 'choice_fernet',
        title: 'Fernet 70/30',
        description: '+18 HP maximos y cura 18 HP',
        reward: {
            maxHp: 18,
            heal: 18
        }
    },
    {
        id: 'choice_speedy',
        title: 'Speedy',
        description: '+12% velocidad permanente del run',
        reward: {
            speedMultiplier: 0.12
        }
    },
    {
        id: 'choice_vodka',
        title: 'Vodka Tonic',
        description: '+12% cadencia permanente del run',
        reward: {
            attackSpeedMultiplier: 0.12
        }
    },
    {
        id: 'choice_destornillador',
        title: 'Destornillador',
        description: '+14% dano permanente del run',
        reward: {
            damageMultiplier: 0.14
        }
    },
    {
        id: 'choice_agua',
        title: 'Agua salvadora',
        description: '+1 HP/s de regeneracion permanente',
        reward: {
            regenPerSecond: 1
        }
    }
];

export function getDrinkDefinition(id) {
    return DRINK_DEFINITIONS.find((drink) => drink.id === id) || null;
}

export function pickRandomDrink(randomFn = Math.random) {
    const totalWeight = DRINK_DEFINITIONS.reduce((sum, drink) => sum + drink.pickupWeight, 0);
    let roll = randomFn() * totalWeight;

    for (const drink of DRINK_DEFINITIONS) {
        roll -= drink.pickupWeight;
        if (roll <= 0) {
            return { ...drink, effect: { ...drink.effect } };
        }
    }

    const fallback = DRINK_DEFINITIONS[DRINK_DEFINITIONS.length - 1];
    return { ...fallback, effect: { ...fallback.effect } };
}

export function getPermanentDrinkChoices() {
    return PERMANENT_DRINK_CHOICES.map((choice) => ({
        ...choice,
        reward: { ...choice.reward }
    }));
}

export default DRINK_DEFINITIONS;
