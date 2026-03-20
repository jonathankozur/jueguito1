import { beforeEach, describe, expect, it } from 'vitest';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import GameSimulation from './GameSimulation';
import PlayerEntity from '../entities/Player';
import EnemyEntity from '../entities/Enemy';
import StaticObstacleEntity from '../entities/StaticObstacleEntity';
import PickupEntity from '../entities/PickupEntity';

describe('GameSimulation collisions', () => {
    beforeEach(() => {
        EventBus.resetAll();
    });

    it('expulsa al jugador si nace dentro de un obstaculo', () => {
        const simulation = new GameSimulation();
        const player = new PlayerEntity('player_1', 800, 800);
        const obstacle = new StaticObstacleEntity('wall_1', 800, 800, 100, 100, 'hard', 'high');

        simulation.entities.set(player.id, player);
        simulation.entities.set(obstacle.id, obstacle);

        simulation.checkCollisions();

        expect(simulation.isCircleBlocked(player.x, player.y, player.radius)).toBe(false);
    });

    it('bloquea el knockback contra una pared alta durante la simulacion', () => {
        const simulation = new GameSimulation();
        const player = new PlayerEntity('player_1', 400, 800);
        const enemy = new EnemyEntity('enemy_1', 660, 800);
        const obstacle = new StaticObstacleEntity('wall_1', 750, 800, 80, 200, 'hard', 'high');

        simulation.entities.set(player.id, player);
        simulation.entities.set(enemy.id, enemy);
        simulation.entities.set(obstacle.id, obstacle);

        EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
            senderId: player.id,
            float1: player.x,
            float2: player.y,
            float3: 0,
            float4: 5,
            float5: 120,
            int1: 400,
            string1: 'melee_circular',
            object1: {
                weaponId: 'push',
                attackShape: 'melee_circular',
                damage: 5,
                impactForce: 120,
                reach: 400,
                hitstunMs: 220
            }
        });
        EventBus.dispatchCommands();

        simulation.update(120);
        simulation.checkCollisions();

        expect(enemy.x + enemy.radius).toBeLessThanOrEqual(710);
    });

    it('los enemigos mas pesados desplazan mas a los livianos al colisionar', () => {
        const simulation = new GameSimulation();
        const bouncer = new EnemyEntity('enemy_heavy', 100, 100, 'bouncer');
        const fodder = new EnemyEntity('enemy_light', 130, 100, 'fodder');

        simulation.entities.set(bouncer.id, bouncer);
        simulation.entities.set(fodder.id, fodder);

        simulation.checkCollisions();

        const heavyDisplacement = Math.abs(bouncer.x - 100);
        const lightDisplacement = Math.abs(fodder.x - 130);

        expect(lightDisplacement).toBeGreaterThan(heavyDisplacement);
        expect(fodder.x).toBeGreaterThan(130);
    });

    it('recoge bebidas al pasar por encima y elimina el pickup del mapa', () => {
        const simulation = new GameSimulation();
        const player = new PlayerEntity('player_1', 620, 230);
        const pickup = new PickupEntity('pickup_1', 628, 230, 'drink', {
            id: 'speedy',
            name: 'Speedy',
            color: 0x17d87f,
            effect: {
                speedMultiplier: 0.28
            }
        });
        const collected = [];

        EventBus.subscribe(EVENTS.PICKUP_COLLECTED, (msg) => {
            collected.push({ ...msg });
        });

        simulation.entities.set(player.id, player);
        simulation.entities.set(pickup.id, pickup);

        simulation.checkCollisions([player]);
        EventBus.dispatchEvents();

        expect(simulation.entities.has(pickup.id)).toBe(false);
        expect(collected).toHaveLength(1);
        expect(collected[0].senderId).toBe(player.id);
        expect(collected[0].targetId).toBe(pickup.id);
    });
});
