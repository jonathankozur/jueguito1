import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

export default class CombatSystem {
    constructor(simulation) {
        this.simulation = simulation;
        
        // Listen for all attacks requested by entities
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, this.handleAttack, this);
    }

    handleAttack(msg) {
        const attackerId = msg.senderId;
        const originX = msg.float1;
        const originY = msg.float2;
        const angle = msg.float3;
        const damage = msg.float4;

        // [MULTIPLAYER] Detect dynamically whether attacker is a player or enemy
        const isPlayerAttacking = attackerId.startsWith('player_');
        
        // Attack shapes
        const attackRange = isPlayerAttacking ? 100 : 40; 
        const attackAngleSpread = Math.PI / 4;
        
        // Loop through all entities to see who is within Range
        for (const [targetId, entity] of this.simulation.entities.entries()) {
            if (targetId === attackerId) continue; // Don't hit yourself

            // [MULTIPLAYER] PvP enabled: players CAN hit other players.
            // Enemies still can't hit other enemies.
            const targetIsPlayer = targetId.startsWith('player_');
            if (!isPlayerAttacking && !targetIsPlayer) continue; // enemy vs enemy: skip
            
            // Only hit entities with Stats (can take damage)
            if (!entity.stats || entity.stats.isDead) continue;

            const dx = entity.x - originX;
            const dy = entity.y - originY;
            const centerDistance = Math.sqrt(dx * dx + dy * dy);
            
            // approximate collision radius for a 32x32 entity is 16
            const actualDistance = Math.max(0, centerDistance - 16);

            if (actualDistance <= attackRange) {
                // Calculate angle from attacker to target
                const angleToTarget = Math.atan2(dy, dx);
                
                // Calculate the shortest angular difference
                let angleDiff = angleToTarget - angle;
                
                // Normalize angle difference to be within -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Check if target is within the forward cone slice
                if (Math.abs(angleDiff) <= attackAngleSpread) {
                    // Delegate damage to the entity itself.
                    // The entity is responsible for updating its internal stats
                    // AND emitting the appropriate state change event (HP_CHANGED, PLAYER_DIED, etc.)
                    const isDead = entity.receiveDamage(damage);

                    if (isDead) {
                        if (targetIsPlayer) {
                            // Player emits PLAYER_DIED from within receiveDamage()
                        } else {
                            this.killEntity(targetId, entity);
                        }
                    }
                }
            }
        }
    }

    killEntity(entityId, entity) {
        // Remove from Logical Simulation
        this.simulation.entities.delete(entityId);
        
        // Let other systems (like UI) know it died
        EventBus.enqueueEvent(EVENTS.ENTITY_DESTROYED, MessagePriority.CRITICAL, {
            senderId: entityId
        });
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.ATTACK_PERFORMED, this.handleAttack, this);
        this.simulation = null;
    }
}
