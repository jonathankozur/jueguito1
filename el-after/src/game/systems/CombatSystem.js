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
        const angle = msg.float3; // The direction of the attack
        const damage = msg.float4;

        // Is this a player or an enemy attacking?
        const isPlayerAttacking = attackerId === 'player1';
        
        // Attack shapes
        const attackRange = isPlayerAttacking ? 100 : 40; 
        const attackAngleSpread = Math.PI / 4; // 45 degrees spread (cone)
        
        // Loop through all entities to see who is within Range
        for (const [targetId, entity] of this.simulation.entities.entries()) {
            if (targetId === attackerId) continue; // Don't hit yourself

            // Players can only hit Enemies. Enemies can only hit Players. Ignore friendly fire.
            if (isPlayerAttacking && targetId === 'player1') continue; 
            if (!isPlayerAttacking && targetId !== 'player1') continue;
            
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

                    // Check death
                    if (isDead) {
                        if (targetId === 'player1') {
                            // Player emits PLAYER_DIED from within receiveDamage()
                            // so nothing to do here
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
