import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus, { EVENTS } from '../events/EventBus';
import EnemyEntity from './Enemy';

describe('Enemy Entity', () => {
    beforeEach(() => {
        EventBus.resetAll();
    });

    it('emite un ataque frontal con el mismo rango que usa para contacto', () => {
        const enemy = new EnemyEntity('enemy_1', 0, 0);
        enemy.timeSinceLastAttack = enemy.stats.attackRate;

        let attackMsg = null;
        const attackSpy = vi.fn((msg) => {
            attackMsg = { ...msg, object1: { ...msg.object1 } };
        });
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, attackSpy);

        enemy.update(16, { x: enemy.attackRange - 1, y: 0 });
        EventBus.dispatchCommands();

        expect(attackSpy).toHaveBeenCalledTimes(1);
        expect(attackMsg).toMatchObject({
            senderId: 'enemy_1',
            int1: enemy.attackRange,
            string1: 'melee_frontal'
        });
        expect(attackMsg.object1.reach).toBe(enemy.attackRange);
    });

    it('bouncer tiene stats y tamano superiores al fodder', () => {
        const fodder = new EnemyEntity('enemy_f', 0, 0, 'fodder');
        const bouncer = new EnemyEntity('enemy_b', 0, 0, 'bouncer');

        expect(bouncer.stats.maxHp).toBeGreaterThan(fodder.stats.maxHp);
        expect(bouncer.radius).toBeGreaterThan(fodder.radius);
        expect(bouncer.attackRange).toBeGreaterThan(fodder.attackRange);
    });

    it('no persigue mientras esta en knockback y retoma al terminar', () => {
        const enemy = new EnemyEntity('enemy_1', 100, 0);

        enemy.applyImpulse({
            angle: 0,
            speed: 200,
            durationMs: 200,
            hitstunMs: 200
        });

        enemy.update(50, { x: 0, y: 0 });
        expect(enemy.velX).toBeGreaterThan(0);

        for (let i = 0; i < 6; i += 1) {
            enemy.update(50, { x: 0, y: 0 });
        }

        enemy.update(16, { x: 0, y: 0 });
        expect(enemy.knockbackRemainingMs).toBe(0);
        expect(enemy.hitstunRemainingMs).toBe(0);
        expect(enemy.velX).toBeLessThan(0);
    });
});
