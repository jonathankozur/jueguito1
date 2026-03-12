import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import StatsComponent from '../components/StatsComponent';

export default class PlayerEntity {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.velX = 0;
        this.velY = 0;
        this.angle = 0;
        this.timeSinceLastAttack = 0;

        // Atributos de Vida y Daño Base
        this.stats = new StatsComponent({
            maxHp: 100,
            baseSpeed: 200,
            damage: 10,
            attackRate: 500
        });

        // [MULTIPLAYER] Each PlayerEntity subscribes to INPUT events
        // but only processes them if msg.targetId matches its own id.
        // This allows multiple PlayerEntities to coexist in the same EventBus.
        // For 'player_1' (the local host player), targetId will be undefined or 'player_1'
        // so we also accept messages without a targetId (backwards compatibility with InputController).
        EventBus.subscribe(EVENTS.INPUT_MOVE, this.handleInputMove, this);
        EventBus.subscribe(EVENTS.INPUT_AIM, this.handleInputAim, this);
    }

    handleInputMove(msg) {
        // Filter: only process if this message is meant for this player
        // (or if it's a legacy broadcast with no targetId)
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;

        const dirX = msg.float1;
        const dirY = msg.float2;
        const prevVelX = this.velX;
        const prevVelY = this.velY;

        if (dirX === 0 && dirY === 0) {
            this.velX = 0;
            this.velY = 0;
        } else {
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            const currentSpeed = this.stats.getSpeed();
            this.velX = (dirX / length) * currentSpeed;
            this.velY = (dirY / length) * currentSpeed;
        }

        if (this.velX !== prevVelX || this.velY !== prevVelY) {
            this._dirty = true;
        }
    }

    handleInputAim(msg) {
        // Filter by targetId
        const isForMe = !msg.targetId || msg.targetId === this.id;
        if (!isForMe) return;

        const targetX = msg.float1;
        const targetY = msg.float2;
        const prevAngle = this.angle;
        this.angle = Math.atan2(targetY - this.y, targetX - this.x);

        if (this.angle !== prevAngle) {
            this._dirty = true;
        }
    }

    // Llamado por el GameSimulation N veces por segundo
    update(deltaMs) {
        const prevX = this.x;
        const prevY = this.y;

        this.x += this.velX * (deltaMs / 1000);
        this.y += this.velY * (deltaMs / 1000);

        if (this.x !== prevX || this.y !== prevY) {
            this._dirty = true;
        }

        // Combat Logic: Auto-Attack
        this.timeSinceLastAttack += deltaMs;
        if (this.timeSinceLastAttack >= this.stats.attackRate) {
            this.timeSinceLastAttack = 0;
            
            EventBus.enqueueCommand(EVENTS.ATTACK_PERFORMED, MessagePriority.HIGH, {
                senderId: this.id,
                float1: this.x,
                float2: this.y,
                float3: this.angle,
                float4: this.stats.damage
            });
        }

        if (this._dirty || this.velX !== 0 || this.velY !== 0) {
            EventBus.enqueueEvent(EVENTS.PLAYER_STATE_UPDATED, MessagePriority.NORMAL, {
                string1: 'moved',
                senderId: this.id,
                float1: this.x,
                float2: this.y,
                float3: this.velX,
                float4: this.velY,
                float5: this.angle
            });
            this._dirty = false;
        }
    }

    destroy() {
        EventBus.unsubscribe(EVENTS.INPUT_MOVE, this.handleInputMove, this);
        EventBus.unsubscribe(EVENTS.INPUT_AIM, this.handleInputAim, this);
    }

    /**
     * Called by CombatSystem when this entity is hit.
     * @returns {boolean} true if the player died from this hit
     */
    receiveDamage(amount) {
        this.stats.takeDamage(amount);
        
        EventBus.enqueueEvent(EVENTS.PLAYER_HP_CHANGED, MessagePriority.HIGH, {
            senderId: this.id,
            float1: this.stats.currentHp,
            float2: this.stats.maxHp
        });

        if (this.stats.isDead) {
            EventBus.enqueueEvent(EVENTS.PLAYER_DIED, MessagePriority.CRITICAL, {
                senderId: this.id
            });
            return true;
        }
        return false;
    }
}
