import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventBus, { EVENTS } from '../events/EventBus';
import EnemySpawnerSystem from './EnemySpawnerSystem';

describe('EnemySpawnerSystem', () => {
    beforeEach(() => {
        EventBus.resetAll();
    });

    it('emite la ola inicial y avanza de ola al pasar el tiempo configurado', () => {
        const simulation = {
            entities: new Map(),
            isCircleBlocked: () => false
        };
        const spawner = new EnemySpawnerSystem(simulation);
        const capturedWaves = [];
        const waveSpy = vi.fn((msg) => {
            capturedWaves.push(msg.int1);
        });
        EventBus.subscribe(EVENTS.WAVE_CHANGED, waveSpy);

        spawner.startSoloRun();
        EventBus.dispatchEvents();

        spawner.update(30000, { x: 800, y: 800 });
        EventBus.dispatchEvents();

        expect(capturedWaves).toEqual([1, 2]);
        expect(spawner.currentWave).toBe(2);
        expect(spawner.currentSpawnDelay).toBeLessThan(spawner.baseSpawnDelay);
    });
});
