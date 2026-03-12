import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import StatsComponent from '../components/StatsComponent';

export default class EnemyEntity {
    constructor(id, x, y, type = 'fodder') {
        this.id = id;
        this.x = x;
        this.y = y;
        this.velX = 0;
        this.velY = 0;
        this.angle = 0;
        this.type = type;
        this.attackRange = 30; // Closer range, lets them touch the player (r:16 + r:12 approx)
        // Add random starting offset to prevent 10 enemies attacking on the exact same frame
        this.timeSinceLastAttack = Math.random() * 500; 

        // Fodder is weak but numerous
        this.stats = new StatsComponent({
            maxHp: 50,
            baseSpeed: 100, // Slower than player (200)
            damage: 5,
            attackRate: 1000
        });

        this._dirty = true; // Force first render
        
        // Listen for damage dealt to this specific enemy
        // We will implement this later when CombatSystem is ready
    }

    // AI logic: Chase the player
    // The GameSimulation passes the player's current coordinates to all enemies
    update(deltaMs, playerTarget) {
        if (this.stats.isDead) return;

        const prevX = this.x;
        const prevY = this.y;

        if (playerTarget) {
            // 1. Calculate direction vector towards player
            const dx = playerTarget.x - this.x;
            const dy = playerTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 2. ALWAYS face the target, even if stopped
            if (distance > 0) {
                this.angle = Math.atan2(dy, dx);
            }

            // 3. Normalize and apply speed only if outside attack range
            if (distance > this.attackRange) {
                const speed = this.stats.getSpeed();
                this.velX = (dx / distance) * speed;
                this.velY = (dy / distance) * speed;
            } else {
                this.velX = 0;
                this.velY = 0;
            }
        } else {
            // Idle if no target
            this.velX = 0;
            this.velY = 0;
        }

        // 3. Move
        this.x += this.velX * (deltaMs / 1000);
        this.y += this.velY * (deltaMs / 1000);

        if (this.x !== prevX || this.y !== prevY) {
            this._dirty = true;
        }

        // 4. Combat Logic: Attack if in range
        if (playerTarget) {
            // Verify if we are stopped because we reached the target distance
            // Math.sqrt could be expensive to run twice, so we just check if velocity is 0
            // but we only attack if we actually have a target
            if (this.velX === 0 && this.velY === 0) {
                this.timeSinceLastAttack += deltaMs;
                if (this.timeSinceLastAttack >= this.stats.attackRate) {
                    this.timeSinceLastAttack = 0;
                    
                    // Attack vector: from me to where I'm looking (angle)
                    EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
                        senderId: this.id,
                        float1: this.x,
                        float2: this.y,
                        float3: this.angle,
                        float4: this.stats.damage
                    });
                }
            } else {
                // Reset timer if we are moving so we don't instantly bite upon arriving
                this.timeSinceLastAttack = 0;
            }
        }

        // 5. Emit State for Renderer
        // Queremos emitir siempre que haya un re-cálculo para que el UI rote al enemigo correctamente
        // y actualice su ángulo incluso si está frenado.
        if (this._dirty || playerTarget) {
            EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.NORMAL, {
                string1: 'moved',
                senderId: this.id, // e.g., 'enemy_1'
                float1: this.x,
                float2: this.y,
                float3: this.velX,
                float4: this.velY,
                float5: this.angle // Manda la "mirada" actualizada
            });
            this._dirty = false;
        }
    }

    destroy() {
        // Cleanup subscriptions if any
    }

    /**
     * Called by CombatSystem when this entity is hit.
     * Owns the responsibility of updating stats and broadcasting the state change.
     * @returns {boolean} true if the enemy died from this hit
     */
    receiveDamage(amount) {
        this.stats.takeDamage(amount);
        
        // Notify the View layer (MainScene HP bars)
        EventBus.enqueueEvent(EVENTS.ENTITY_HP_CHANGED, MessagePriority.HIGH, {
            senderId: this.id,
            float1: this.stats.currentHp,
            float2: this.stats.maxHp
        });

        return this.stats.isDead;
    }
}
