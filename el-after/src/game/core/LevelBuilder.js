import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import PlayerEntity from '../entities/Player';

export default class LevelBuilder {
    /**
     * "CreadorInicial": Se encarga de instanciar todas las entidades requeridas 
     * y advertir vía mensajes que deben empezar a existir en la simulación y dibujarse.
     */
    buildLevel1() {
        // 1. Crear el jugador virtualmente en el centro del boliche
        const player = new PlayerEntity('player1', 800, 800);

        // 2. Avisamos transversalmente a TODO el mundo (Simulación y UI) que un jugador existe
        EventBus.enqueueEvent(EVENTS.ENTITY_CREATED, MessagePriority.NORMAL, {
            object1: player,
            string1: 'Player',
            senderId: player.id,
            float1: 800,
            float2: 800
        });

        // A futuro aquí emitiremos eventos de ENTITY_CREATED para las Paredes, el DJ, los consumibles, etc.
    }
}
