import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventBus, { EVENTS, MessagePriority } from './EventBus';

describe('EventBus Zero-Allocation / Deferred', () => {

    beforeEach(() => {
        // Cerciorarse de que no haya listeners residuales de otros tests
        EventBus.resetAll();
    });

    it('5.1 Debe encolar 5000 eventos recurrentes y no asignar más memoria (Zero-Allocation)', () => {
        const poolSizeBefore = EventBus.pool.getAvailableSize();
        
        // Simular pico de carga de 5000 eventos en un frame
        for (let i = 0; i < 5000; i++) {
            EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.NORMAL, { float1: i });
        }
        
        const poolSizeMid = EventBus.pool.getAvailableSize();
        expect(poolSizeMid).toBe(poolSizeBefore - 5000); // 5000 mensajes consumidos del pool
        
        // Despachamos para que se reciclen
        EventBus.dispatchEvents();
        
        const poolSizeAfter = EventBus.pool.getAvailableSize();
        // El pool debe haber retornado exactamente a su tamaño original
        expect(poolSizeAfter).toBe(poolSizeBefore);
    });

    it('5.2 Debe utilizar Cola Diferida (Deferred Dispatching) previniendo loops infinitos', () => {
        const spyCallback = vi.fn();

        // Creamos un listener recursivo peligroso:
        // Cada vez que recibe un INPUT_MOVE, emite OTRO INPUT_MOVE.
        // En un EventBus síncrono esto trancaría la pestaña del navegador inmediatamente.
        const hazardousListener = (msg) => {
            spyCallback();
            // Evitamos loop infinito real en el test si fallamos, pero la regla general dice que esto 
            // iría a la cola del PRÓXIMO dispatchCommand.
            if (spyCallback.mock.calls.length < 5) { 
                EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, {});
            }
        };

        EventBus.subscribe(EVENTS.INPUT_MOVE, hazardousListener);
        EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, {});

        // Antes del dispatch, no ha ocurrido NADA.
        expect(spyCallback).toHaveBeenCalledTimes(0);

        // Disparamos el PRIMER frame. Procesará el primer mensaje encolado.
        // Al procesarlo, el listener encolará un SEGUNDO mensaje. 
        // ¡Pero ese segundo mensaje DEBE QUEDAR PENDIENTE para el próximo frame, para evitar el stack overflow!
        EventBus.dispatchCommands();

        // Solo se ejecutó 1 vez por este frame. La recursividad se cortó limpiamente.
        expect(spyCallback).toHaveBeenCalledTimes(1);

        // Disparamos el SEGUNDO frame.
        EventBus.dispatchCommands();
        expect(spyCallback).toHaveBeenCalledTimes(2);
    });
    
    it('Debe respetar el orden de prioridad', () => {
        const orderArray = [];
        const listener = (msg) => orderArray.push(msg.priority);
        
        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, listener);
        
        // Encolamos en desorden intencionalmente
        EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.LOW, {});
        EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.CRITICAL, {});
        EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.NORMAL, {});
        EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.HIGH, {});
        
        EventBus.dispatchEvents();
        
        // El despachador debe ejecutar CRITICAL (0), HIGH (1), NORMAL (2), LOW (3) orgánicamente.
        expect(orderArray).toEqual([MessagePriority.CRITICAL, MessagePriority.HIGH, MessagePriority.NORMAL, MessagePriority.LOW]);
    });
});
