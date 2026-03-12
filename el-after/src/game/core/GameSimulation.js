import EventBus, { EVENTS } from '../events/EventBus';
import EnemySpawnerSystem from '../systems/EnemySpawnerSystem';
import CombatSystem from '../systems/CombatSystem';

export default class GameSimulation {
    constructor() {
        // Registro universal de todas las entidades en la simulación
        this.entities = new Map();
        
        // Sistemas de simulación
        this.enemySpawner = new EnemySpawnerSystem(this);
        this.combatSystem = new CombatSystem(this);

        // Escuchar cuando el Creador u otros sistemas instancian cosas
        EventBus.subscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
    }

    onEntityCreated(msg) {
        this.entities.set(msg.senderId, msg.object1);
    }

    // Motor central de avance en el tiempo (Tick)
    update(delta) {
        // Find player position for AI tracking
        let playerCoords = null;
        for (const [id, entity] of this.entities.entries()) {
            if (id === 'player1') { // Hardcoded for now based on LevelBuilder
                playerCoords = { x: entity.x, y: entity.y };
                break;
            }
        }

        // Run spawner
        this.enemySpawner.update(delta, playerCoords);

        // 1. Actualizar Lógicas y Velocidades (Movimientos matemáticos)
        this.entities.forEach(entity => {
            if (typeof entity.update === 'function') {
                // Pass player coordinates to entities that need it (like Enemy)
                entity.update(delta, playerCoords);
            }
        });

        // 2. Comprobar Colisiones del Mundo e Inter-entidad (Aquí calcularemos las cajas / grid futuro)
        this.checkCollisions();
    }

    checkCollisions() {
        // En las siguientes iteraciones montaremos la lógica cruda de AABB
        // Evita que los personajes crucen el borde del mundo (0 a 1600 de X e Y)
        this.entities.forEach(entity => {
            if (entity.x !== undefined && entity.y !== undefined) {
                if (entity.x < 0) entity.x = 0;
                if (entity.x > 1600) entity.x = 1600;
                if (entity.y < 0) entity.y = 0;
                if (entity.y > 1600) entity.y = 1600;
            }
        });
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
        if (this.enemySpawner) {
            this.enemySpawner.destroy();
            this.enemySpawner = null;
        }
        if (this.combatSystem) {
            this.combatSystem.destroy();
            this.combatSystem = null;
        }
    }
}
