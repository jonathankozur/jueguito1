import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import CombatSystem from './CombatSystem';
import EnemyEntity from '../entities/Enemy';
import StaticObstacleEntity from '../entities/StaticObstacleEntity';

describe('Combat System', () => {
    let combatSystem;
    let mockSimulation;

    beforeEach(() => {
        EventBus.resetAll();
        mockSimulation = {
            entities: new Map()
        };
        combatSystem = new CombatSystem(mockSimulation);
    });

    it('melee circular golpea enemigos dentro del radio', () => {
        const enemy = new EnemyEntity('e1', 50, 0);
        mockSimulation.entities.set('e1', enemy);
        const initialHp = enemy.stats.currentHp;

        EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
            senderId: 'player_1',
            float1: 0,
            float2: 0,
            float3: 0,
            float4: 10,
            float5: 10,
            int1: 60,
            string1: 'melee_circular'
        });
        EventBus.dispatchCommands();

        expect(enemy.stats.currentHp).toBeLessThan(initialHp);
    });

    it('melee frontal no golpea enemigos a espaldas', () => {
        const enemy = new EnemyEntity('e1', -50, 0);
        mockSimulation.entities.set('e1', enemy);
        const initialHp = enemy.stats.currentHp;

        EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
            senderId: 'player_1',
            float1: 0,
            float2: 0,
            float3: 0,
            float4: 10,
            float5: 10,
            int1: 60,
            string1: 'melee_frontal',
            object1: {
                attackShape: 'melee_frontal',
                damage: 10,
                impactForce: 10,
                reach: 60,
                sweepAngle: 60
            }
        });
        EventBus.dispatchCommands();

        expect(enemy.stats.currentHp).toBe(initialHp);
    });

    it('aplica knockback con control perdido y luego el enemigo retoma la persecucion', () => {
        const enemy = new EnemyEntity('e1', 30, 0);
        mockSimulation.entities.set('e1', enemy);

        EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
            senderId: 'player_1',
            float1: 0,
            float2: 0,
            float3: 0,
            float4: 8,
            float5: 80,
            int1: 100,
            string1: 'melee_circular',
            object1: {
                weaponId: 'push',
                attackShape: 'melee_circular',
                damage: 8,
                impactForce: 80,
                reach: 100,
                hitstunMs: 220
            }
        });
        EventBus.dispatchCommands();

        expect(enemy.knockbackRemainingMs).toBeGreaterThan(0);
        expect(enemy.hitstunRemainingMs).toBeGreaterThan(0);

        enemy.update(40, { x: 0, y: 0 });
        expect(enemy.velX).toBeGreaterThan(0);

        for (let i = 0; i < 12; i += 1) {
            enemy.update(40, { x: 0, y: 0 });
        }

        const recoveryStartX = enemy.x;
        enemy.update(16, { x: -300, y: 0 });
        expect(enemy.knockbackRemainingMs).toBe(0);
        expect(enemy.hitstunRemainingMs).toBe(0);
        expect(enemy.x).toBeLessThan(recoveryStartX);
    });

    it('el proyectil se frena en pared dura y emite impacto real', () => {
        const wall = new StaticObstacleEntity('w1', 50, 0, 20, 100, 'hard', 'high');
        const enemy = new EnemyEntity('e1', 100, 0);
        mockSimulation.entities.set('w1', wall);
        mockSimulation.entities.set('e1', enemy);

        let impactMsg = null;
        const impactSpy = vi.fn((msg) => {
            impactMsg = { ...msg, object1: { ...msg.object1 } };
        });
        EventBus.subscribe(EVENTS.PROJECTILE_IMPACT, impactSpy);

        EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
            senderId: 'player_1',
            float1: 0,
            float2: 0,
            float3: 0,
            float4: 10,
            float5: 44,
            int1: 200,
            string1: 'distance',
            object1: {
                weaponId: 'gun',
                attackShape: 'distance',
                damage: 10,
                impactForce: 44,
                reach: 200,
                hitstunMs: 90,
                materialLoss: {
                    soft: 10,
                    medium: 40,
                    hard: 'stop'
                }
            }
        });
        EventBus.dispatchCommands();
        EventBus.dispatchEvents();

        expect(impactSpy).toHaveBeenCalled();
        expect(impactMsg.float1).toBeLessThan(100);
        expect(impactMsg.object1.reason).toBe('wall');
        expect(enemy.stats.currentHp).toBe(enemy.stats.maxHp);
    });

    it('la arrojadiza explota en la pared alta y no daña al enemigo detras', () => {
        const wall = new StaticObstacleEntity('w1', 100, 0, 20, 100, 'hard', 'high');
        const enemy = new EnemyEntity('e1', 200, 0);
        mockSimulation.entities.set('w1', wall);
        mockSimulation.entities.set('e1', enemy);

        let impactMsg = null;
        const impactSpy = vi.fn((msg) => {
            impactMsg = { ...msg };
        });
        EventBus.subscribe(EVENTS.PROJECTILE_IMPACT, impactSpy);

        EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
            senderId: 'player_1',
            float1: 0,
            float2: 0,
            float3: 0,
            float4: 12,
            float5: 40,
            int1: 300,
            string1: 'throwable',
            object1: {
                weaponId: 'bottle',
                attackShape: 'throwable',
                damage: 12,
                impactForce: 40,
                reach: 300,
                hitstunMs: 220,
                aoeRadius: 60
            }
        });
        EventBus.dispatchCommands();
        EventBus.dispatchEvents();

        expect(impactSpy).toHaveBeenCalled();
        expect(impactMsg.float1).toBeLessThan(200);
        expect(enemy.stats.currentHp).toBe(enemy.stats.maxHp);
    });
});
