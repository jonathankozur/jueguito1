import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus, { EVENTS } from '../events/EventBus';
import EnemyEntity from './Enemy';

describe('Enemy Entity', () => {
    beforeEach(() => {
        EventBus.resetAll();
    });

    it('usa el arma equipada al atacar', () => {
        const enemy = new EnemyEntity('enemy_1', 0, 0, 'fodder', 'knife');
        enemy.timeSinceLastAttack = enemy.equippedWeapon.cooldownMs;

        let attackMsg = null;
        const attackSpy = vi.fn((msg) => {
            attackMsg = { ...msg, object1: { ...msg.object1 } };
        });
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, attackSpy);

        enemy.update(16, { x: enemy.attackRange - 1, y: 0 });
        EventBus.dispatchCommands();

        expect(attackSpy).toHaveBeenCalledTimes(1);
        expect(attackMsg.string1).toBe('melee_sweep');
        expect(attackMsg.object1.weaponId).toBe('knife');
        expect(attackMsg.object1.reach).toBe(enemy.equippedWeapon.reach);
    });

    it('bouncer tiene stats y tamano superiores al fodder', () => {
        const fodder = new EnemyEntity('enemy_f', 0, 0, 'fodder', 'fists');
        const bouncer = new EnemyEntity('enemy_b', 0, 0, 'bouncer', 'fists');

        expect(bouncer.stats.maxHp).toBeGreaterThan(fodder.stats.maxHp);
        expect(bouncer.radius).toBeGreaterThan(fodder.radius);
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
