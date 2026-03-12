import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import PlayerEntity from './Player';

describe('Player Entity (Lógica Pura Ciega)', () => {

    beforeEach(() => {
        EventBus.resetAll();
    });

    it('Debe emitir su propio cambio de velocidad (moved) tras el Tick, al escuchar un teclado', () => {
        const player = new PlayerEntity('p1', 0, 0);
        let capturedMsg = null;
        const spyCallback = vi.fn((msg) => { capturedMsg = { ...msg }; });
        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, spyCallback);

        EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, { float1: 1, float2: 0 }); // Apretamos D
        EventBus.dispatchCommands(); // Ejecutar comandos encolados

        // Al ser una simulación puramente lógica desacoplada, 
        // tenemos que simular el paso del tiempo 1000ms (1 segundo) artificialmente
        player.update(1000);

        // El player emitirá un Evento internamente. Hay que despachar lo encolado para que llegue al spy.
        EventBus.dispatchEvents();

        expect(spyCallback).toHaveBeenCalledTimes(1);
        expect(capturedMsg).toMatchObject({
            string1: 'moved',
            senderId: 'p1',
            float1: 200, // Speed base de 200 * 1 segundo = movió 200 pixeles
            float2: 0,
            float3: 200,
            float4: 0,
            float5: 0
        });
    });

    it('Debe normalizar su velocidad en movimientos diagonales (Pitágoras)', () => {
        const player = new PlayerEntity('p1', 0, 0);
        let capturedMsg = null;
        const spyCallback = vi.fn((msg) => { capturedMsg = { ...msg }; });
        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, spyCallback);

        // Diagonal perfecta (Abajo-Derecha simultáneos)
        EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, { float1: 1, float2: 1 });
        EventBus.dispatchCommands(); 
        
        player.update(1000); // Avanzamos 1 segundo
        EventBus.dispatchEvents();

        // Pitágoras: la velocidad en componentes no debe superar el hipotenusa 200
        expect(capturedMsg.string1).toBe('moved');
        expect(Math.round(capturedMsg.float3)).toBe(141); // float3 es velX
        expect(Math.round(capturedMsg.float4)).toBe(141); // float4 es velY
    });

    it('Debe calcular su propio ángulo de rotación exacto al apuntar', () => {
        const player = new PlayerEntity('p1', 100, 100);
        let capturedMsg = null;
        const spyCallback = vi.fn((msg) => { capturedMsg = { ...msg }; });
        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, spyCallback);

        // Apuntamos justo abajo del jugador
        EventBus.enqueueCommand(EVENTS.INPUT_AIM, MessagePriority.NORMAL, { float1: 100, float2: 200 });
        EventBus.dispatchCommands();
        
        player.update(16); // Avanzamos 1 frame
        EventBus.dispatchEvents();

        expect(spyCallback).toHaveBeenCalledTimes(1);
        expect(capturedMsg).toMatchObject({
            string1: 'moved', // Cambié por moved porque el update de Personaje emite moved/aimed juntos
            senderId: 'p1',
            float1: 100,
            float2: 100,
            float3: 0,
            float4: 0,
            float5: Math.PI / 2
        });
    });
});
