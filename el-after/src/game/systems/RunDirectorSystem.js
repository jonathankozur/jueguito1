import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import PickupEntity from '../entities/PickupEntity';
import { getPermanentDrinkChoices, pickRandomDrink } from '../data/drinks';

const BAR_DRINK_SLOTS = [
    { x: 620, y: 230 },
    { x: 740, y: 230 },
    { x: 860, y: 230 },
    { x: 980, y: 230 }
];

const SCORE_BY_TYPE = {
    fodder: 100,
    bouncer: 240
};

const SCORE_BY_WEAPON = {
    fists: 1,
    knife: 1.1,
    gun: 1.25,
    bottle: 1.3
};

function quantizeMs(value, step = 100) {
    return Math.max(0, Math.ceil((value || 0) / step) * step);
}

export default class RunDirectorSystem {
    constructor(simulation) {
        this.simulation = simulation;
        this.runTimeMs = 0;
        this.kills = 0;
        this.score = 0;
        this.level = 1;
        this.xp = 0;
        this.nextLevelXp = 80;
        this.killsByType = {};
        this.levelUpPending = false;
        this.currentChoices = [];
        this.drinkSpawnElapsedMs = 0;
        this.drinkSpawnIntervalMs = 6500;
        this.maxDrinkPickups = 3;
        this.pickupCounter = 1;
        this.lastSnapshotKey = '';

        EventBus.subscribe(EVENTS.ENTITY_KILLED, this.handleEntityKilled, this);
        EventBus.subscribe(EVENTS.PICKUP_COLLECTED, this.handlePickupCollected, this);
        EventBus.subscribe(EVENTS.LEVEL_UP_CHOICE_REQUEST, this.handleLevelChoiceRequest, this);
    }

    update(deltaMs, player) {
        if (!player) return;

        this.runTimeMs += deltaMs;
        this.drinkSpawnElapsedMs += deltaMs;

        if (!this.levelUpPending && this.drinkSpawnElapsedMs >= this.drinkSpawnIntervalMs) {
            this.drinkSpawnElapsedMs = 0;
            this.spawnBarDrink();
        }

        this.emitSnapshot(player);
    }

    handleEntityKilled(msg) {
        const payload = msg.object1;
        if (!payload || payload.kind !== 'enemy') return;

        this.kills += 1;
        this.killsByType[payload.enemyType] = (this.killsByType[payload.enemyType] || 0) + 1;
        this.score += payload.scoreValue || 0;
        this.xp += payload.xpValue || 0;

        this.tryOpenLevelUp();
    }

    handlePickupCollected(msg) {
        const pickup = msg.object1;
        if (!pickup || pickup.pickupType !== 'drink') return;

        const player = this.simulation.entities.get(msg.senderId);
        if (!player) return;

        player.applyDrink(pickup.data);
        this.emitSnapshot(player);
    }

    handleLevelChoiceRequest(msg) {
        if (!this.levelUpPending) return;

        const player = this.getPrimaryPlayer();
        if (!player) return;

        const choice = this.currentChoices.find((item) => item.id === msg.string1);
        if (!choice) return;

        if (choice.kind === 'weapon_upgrade') {
            player.upgradeWeapon(choice.weaponId);
        } else if (choice.kind === 'drink_perk') {
            player.applyPermanentReward(choice.reward);
        }

        this.levelUpPending = false;
        this.currentChoices = [];

        EventBus.enqueueEvent(EVENTS.LEVEL_UP_RESOLVED, MessagePriority.CRITICAL, {
            senderId: player.id,
            object1: {
                choiceId: choice.id
            }
        });

        this.emitSnapshot(player, true);
    }

    tryOpenLevelUp() {
        if (this.levelUpPending) return;

        const player = this.getPrimaryPlayer();
        if (!player) return;

        while (!this.levelUpPending && this.xp >= this.nextLevelXp) {
            this.xp -= this.nextLevelXp;
            this.level += 1;
            this.nextLevelXp = Math.round(this.nextLevelXp * 1.34);
            this.currentChoices = this.generateLevelChoices(player);
            this.levelUpPending = true;

            EventBus.enqueueEvent(EVENTS.LEVEL_UP_READY, MessagePriority.CRITICAL, {
                senderId: player.id,
                int1: this.level,
                object1: {
                    level: this.level,
                    choices: this.currentChoices
                }
            });
        }
    }

    generateLevelChoices(player) {
        const activeWeapon = player.getActiveWeapon();
        const weaponChoice = {
            id: `upgrade_${activeWeapon.id}_${activeWeapon.level || 1}`,
            kind: 'weapon_upgrade',
            title: `Subir ${activeWeapon.name}`,
            description: '+14% dano, +10% empuje, +5% alcance, -6% cooldown',
            weaponId: activeWeapon.id
        };

        const drinkPool = getPermanentDrinkChoices();
        const drinkChoices = [];

        while (drinkChoices.length < 2 && drinkPool.length > 0) {
            const index = Math.floor(Math.random() * drinkPool.length);
            const [choice] = drinkPool.splice(index, 1);
            drinkChoices.push({
                ...choice,
                kind: 'drink_perk'
            });
        }

        return [weaponChoice, ...drinkChoices];
    }

    spawnBarDrink() {
        const activePickups = [...this.simulation.entities.values()].filter((entity) => entity.pickupType === 'drink');
        if (activePickups.length >= this.maxDrinkPickups) return;

        const occupiedSlots = activePickups.map((pickup) => `${pickup.x}:${pickup.y}`);
        const availableSlots = BAR_DRINK_SLOTS.filter((slot) => !occupiedSlots.includes(`${slot.x}:${slot.y}`));
        if (availableSlots.length === 0) return;

        const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        const drink = pickRandomDrink();
        const pickup = new PickupEntity(`pickup_drink_${this.pickupCounter++}`, slot.x, slot.y, 'drink', drink);

        this.simulation.entities.set(pickup.id, pickup);
        EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.NORMAL, {
            object1: pickup,
            string1: 'Pickup',
            senderId: pickup.id,
            float1: pickup.x,
            float2: pickup.y
        });
    }

    buildKillReward(enemy) {
        const typeScore = SCORE_BY_TYPE[enemy.type] || 100;
        const weaponMultiplier = SCORE_BY_WEAPON[enemy.weaponId] || 1;
        const scoreValue = Math.round(typeScore * weaponMultiplier * (enemy.scoreScale || 1));
        const xpValue = Math.max(6, Math.round((typeScore / 18) * (enemy.scoreScale || 1)));

        return {
            kind: 'enemy',
            enemyType: enemy.type,
            weaponId: enemy.weaponId,
            scoreValue,
            xpValue
        };
    }

    emitEnemyKilled(enemy) {
        EventBus.enqueueEvent(EVENTS.ENTITY_KILLED, MessagePriority.HIGH, {
            senderId: enemy.id,
            object1: this.buildKillReward(enemy)
        });
    }

    emitSnapshot(player, force = false) {
        const snapshot = {
            runTimeSeconds: Math.floor(this.runTimeMs / 1000),
            score: this.score,
            kills: this.kills,
            killsByType: { ...this.killsByType },
            level: this.level,
            xp: this.xp,
            nextLevelXp: this.nextLevelXp,
            activeBuffs: player.activeBuffs.map((buff) => ({
                id: buff.id,
                name: buff.name,
                remainingMs: quantizeMs(buff.remainingMs, 250),
                color: buff.color
            })),
            dashState: {
                ready: player.dashCooldownRemainingMs <= 0 && player.dashRemainingMs <= 0,
                cooldownMs: quantizeMs(player.dashCooldownRemainingMs),
                activeMs: quantizeMs(player.dashRemainingMs, 50)
            }
        };

        const snapshotKey = JSON.stringify(snapshot);
        if (!force && snapshotKey === this.lastSnapshotKey) {
            return;
        }

        this.lastSnapshotKey = snapshotKey;

        EventBus.enqueueEvent(EVENTS.RUN_STATS_UPDATED, MessagePriority.NORMAL, {
            senderId: player.id,
            object1: snapshot
        });
    }

    getPrimaryPlayer() {
        for (const [id, entity] of this.simulation.entities.entries()) {
            if (id.startsWith('player_')) {
                return entity;
            }
        }

        return null;
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.ENTITY_KILLED, this.handleEntityKilled, this);
        EventBus.unsubscribe(EVENTS.PICKUP_COLLECTED, this.handlePickupCollected, this);
        EventBus.unsubscribe(EVENTS.LEVEL_UP_CHOICE_REQUEST, this.handleLevelChoiceRequest, this);
        this.simulation = null;
    }
}
