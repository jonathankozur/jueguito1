import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import PlayerEntity from './Player';

describe('Player Entity', () => {
    beforeEach(() => {
        EventBus.resetAll();
    });

    it('emite movimiento despues de procesar input de direccion', () => {
        const player = new PlayerEntity('p1', 0, 0);
        let capturedMsg = null;
        const spy = vi.fn((msg) => {
            capturedMsg = { ...msg };
        });

        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, spy);

        EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, { targetId: 'p1', float1: 1, float2: 0 });
        EventBus.dispatchCommands();
        player.update(1000);
        EventBus.dispatchEvents();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(capturedMsg).toMatchObject({
            string1: 'moved',
            senderId: 'p1',
            float1: 200,
            float2: 0,
            float3: 200,
            float4: 0
        });
    });

    it('normaliza velocidad diagonal', () => {
        const player = new PlayerEntity('p1', 0, 0);
        let capturedMsg = null;
        const spy = vi.fn((msg) => {
            capturedMsg = { ...msg };
        });

        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, spy);

        EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, { targetId: 'p1', float1: 1, float2: 1 });
        EventBus.dispatchCommands();
        player.update(1000);
        EventBus.dispatchEvents();

        expect(Math.round(capturedMsg.float3)).toBe(141);
        expect(Math.round(capturedMsg.float4)).toBe(141);
    });

    it('calcula el angulo exacto al apuntar', () => {
        const player = new PlayerEntity('p1', 100, 100);
        let capturedMsg = null;
        const spy = vi.fn((msg) => {
            capturedMsg = { ...msg };
        });

        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, spy);

        EventBus.enqueueCommand(EVENTS.INPUT_AIM, MessagePriority.NORMAL, { targetId: 'p1', float1: 100, float2: 200 });
        EventBus.dispatchCommands();
        player.update(16);
        EventBus.dispatchEvents();

        expect(capturedMsg.float5).toBe(Math.PI / 2);
    });

    it('bloquea el slot 5 y la rueda lo saltea', () => {
        const player = new PlayerEntity('p1', 0, 0);

        EventBus.enqueueCommand(EVENTS.INPUT_INVENTORY_CHANGE, MessagePriority.NORMAL, {
            targetId: 'p1',
            int1: 5,
            string1: 'key'
        });
        EventBus.dispatchCommands();

        expect(player.selectedSlot).toBe(0);

        EventBus.enqueueCommand(EVENTS.INPUT_INVENTORY_CHANGE, MessagePriority.NORMAL, {
            targetId: 'p1',
            int1: -1,
            string1: 'wheel'
        });
        EventBus.dispatchCommands();

        expect(player.getActiveWeapon().id).toBe('bottle');
    });

    it('emite PLAYER_WEAPON_CHANGED con el arma nueva', () => {
        const player = new PlayerEntity('p1', 0, 0);
        const captured = [];
        const spy = vi.fn((msg) => {
            captured.push({ ...msg });
        });

        EventBus.subscribe(EVENTS.PLAYER_WEAPON_CHANGED, spy);

        EventBus.enqueueCommand(EVENTS.INPUT_INVENTORY_CHANGE, MessagePriority.NORMAL, {
            targetId: 'p1',
            int1: 2,
            string1: 'key'
        });
        EventBus.dispatchCommands();
        EventBus.dispatchEvents();

        expect(spy).toHaveBeenCalledTimes(2);
        expect(captured.at(-1)).toMatchObject({
            senderId: 'p1',
            int1: 2,
            string1: 'Cuchillo'
        });
        expect(captured.at(-1).object1.level).toBe(1);
    });

    it('incluye el level actualizado cuando se sube el arma', () => {
        const player = new PlayerEntity('p1', 0, 0);
        const events = [];
        EventBus.subscribe(EVENTS.PLAYER_WEAPON_CHANGED, (msg) => {
            events.push({ ...msg, object1: { ...msg.object1 } });
        });

        player.upgradeWeapon('fists');
        EventBus.dispatchEvents();

        const latest = events.at(-1);
        expect(latest).toBeTruthy();
        expect(latest.object1.level).toBe(player.getActiveWeapon().level);
    });

    it('hace combo de punos en tres pasos', () => {
        const player = new PlayerEntity('p1', 0, 0);
        const attacks = [];
        const spy = vi.fn((msg) => {
            attacks.push({ ...msg.object1 });
        });

        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, spy);

        player.update(300);
        EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_START, MessagePriority.HIGH, { targetId: 'p1' });
        EventBus.dispatchCommands();
        EventBus.dispatchCommands();

        player.update(250);
        EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_START, MessagePriority.HIGH, { targetId: 'p1' });
        EventBus.dispatchCommands();
        EventBus.dispatchCommands();

        player.update(400);
        EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_START, MessagePriority.HIGH, { targetId: 'p1' });
        EventBus.dispatchCommands();
        EventBus.dispatchCommands();

        expect(attacks.map((attack) => attack.comboIndex)).toEqual([1, 2, 3]);
        expect(attacks[2].attackShape).toBe('melee_circular');
    });

    it('alterna el barrido del cuchillo', () => {
        const player = new PlayerEntity('p1', 0, 0);
        const attacks = [];
        const spy = vi.fn((msg) => {
            attacks.push({ ...msg.object1 });
        });

        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, spy);

        EventBus.enqueueCommand(EVENTS.INPUT_INVENTORY_CHANGE, MessagePriority.NORMAL, {
            targetId: 'p1',
            int1: 2,
            string1: 'key'
        });
        EventBus.dispatchCommands();

        player.update(400);
        EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_START, MessagePriority.HIGH, { targetId: 'p1' });
        EventBus.dispatchCommands();
        EventBus.dispatchCommands();

        player.update(400);
        EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_START, MessagePriority.HIGH, { targetId: 'p1' });
        EventBus.dispatchCommands();
        EventBus.dispatchCommands();

        expect(attacks).toHaveLength(2);
        expect(attacks[0].startAngle).not.toBe(attacks[1].startAngle);
        expect(attacks[0].endAngle).not.toBe(attacks[1].endAngle);
    });

    it('la botella cargada emite progreso y escala su alcance al soltar', () => {
        const player = new PlayerEntity('p1', 0, 0);
        const chargeEvents = [];
        let attackMsg = null;

        EventBus.subscribe(EVENTS.ATTACK_CHARGE_UPDATED, (msg) => {
            chargeEvents.push({ ...msg });
        });
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, (msg) => {
            attackMsg = { ...msg, object1: { ...msg.object1 } };
        });

        EventBus.enqueueCommand(EVENTS.INPUT_INVENTORY_CHANGE, MessagePriority.NORMAL, {
            targetId: 'p1',
            int1: 4,
            string1: 'key'
        });
        EventBus.dispatchCommands();

        player.update(1000);
        EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_START, MessagePriority.HIGH, { targetId: 'p1' });
        EventBus.dispatchCommands();
        EventBus.dispatchEvents();

        player.update(500);
        EventBus.dispatchEvents();

        EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_RELEASE, MessagePriority.HIGH, { targetId: 'p1' });
        EventBus.dispatchCommands();
        EventBus.dispatchCommands();
        EventBus.dispatchEvents();

        expect(chargeEvents.some((msg) => msg.string1 === 'charging')).toBe(true);
        expect(attackMsg.object1.attackShape).toBe('throwable');
        expect(attackMsg.object1.chargeRatio).toBeGreaterThan(0.5);
        expect(attackMsg.object1.reach).toBeGreaterThan(180);
        expect(chargeEvents.at(-1).string1).toBe('idle');
    });

    it('el dash vuelve invulnerable al jugador por una ventana corta', () => {
        const player = new PlayerEntity('p1', 0, 0);
        const initialHp = player.stats.currentHp;

        EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, {
            targetId: 'p1',
            float1: 1,
            float2: 0
        });
        EventBus.dispatchCommands();

        EventBus.enqueueCommand(EVENTS.INPUT_DASH, MessagePriority.HIGH, {
            targetId: 'p1'
        });
        EventBus.dispatchCommands();

        player.update(60);

        expect(player.isInvulnerable()).toBe(true);
        expect(player.x).toBeGreaterThan(30);
        expect(player.receiveDamage(10)).toBe(false);
        expect(player.stats.currentHp).toBe(initialHp);

        player.update(250);

        expect(player.isInvulnerable()).toBe(false);
        player.receiveDamage(10);
        expect(player.stats.currentHp).toBeLessThan(initialHp);
    });
});
