import { beforeEach, describe, expect, it } from 'vitest';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import RunDirectorSystem from './RunDirectorSystem';
import PlayerEntity from '../entities/Player';

describe('RunDirectorSystem', () => {
    beforeEach(() => {
        EventBus.resetAll();
    });

    it('acumula score y xp por bajas y abre una eleccion de nivel', () => {
        const simulation = {
            entities: new Map()
        };
        const player = new PlayerEntity('player_1', 800, 800);
        const director = new RunDirectorSystem(simulation);
        let latestSnapshot = null;
        let levelReady = null;
        let levelResolved = null;

        simulation.entities.set(player.id, player);

        EventBus.subscribe(EVENTS.RUN_STATS_UPDATED, (msg) => {
            latestSnapshot = { ...msg.object1 };
        });
        EventBus.subscribe(EVENTS.LEVEL_UP_READY, (msg) => {
            levelReady = {
                level: msg.int1,
                choices: [...msg.object1.choices]
            };
        });
        EventBus.subscribe(EVENTS.LEVEL_UP_RESOLVED, (msg) => {
            levelResolved = { ...msg.object1 };
        });

        EventBus.enqueueEvent(EVENTS.ENTITY_KILLED, MessagePriority.HIGH, {
            senderId: 'enemy_1',
            object1: {
                kind: 'enemy',
                enemyType: 'bouncer',
                weaponId: 'knife',
                scoreValue: 264,
                xpValue: 95
            }
        });
        EventBus.dispatchEvents();

        director.update(16, player);
        EventBus.dispatchEvents();

        expect(latestSnapshot.kills).toBe(1);
        expect(latestSnapshot.score).toBe(264);
        expect(latestSnapshot.level).toBe(2);
        expect(latestSnapshot.xp).toBe(15);
        expect(levelReady.choices).toHaveLength(3);

        const initialWeaponLevel = player.getActiveWeapon().level || 1;
        EventBus.enqueueCommand(EVENTS.LEVEL_UP_CHOICE_REQUEST, MessagePriority.CRITICAL, {
            senderId: player.id,
            string1: levelReady.choices[0].id
        });
        EventBus.dispatchCommands();

        director.update(0, player);
        EventBus.dispatchEvents();

        expect(levelResolved.choiceId).toBe(levelReady.choices[0].id);
        expect(player.getActiveWeapon().level).toBe(initialWeaponLevel + 1);

        director.destroy();
        player.destroy();
    });

    it('genera bebidas en la barra cuando avanza el tiempo de la run', () => {
        const simulation = {
            entities: new Map()
        };
        const player = new PlayerEntity('player_1', 800, 800);
        const director = new RunDirectorSystem(simulation);

        simulation.entities.set(player.id, player);

        director.update(7000, player);
        EventBus.dispatchEvents();

        const pickups = [...simulation.entities.values()].filter((entity) => entity.pickupType === 'drink');
        expect(pickups.length).toBe(1);
        expect(pickups[0].name).toBeTruthy();

        director.destroy();
        player.destroy();
    });
});
