/**
 * Core Enums for Message Routing
 */
export const MessagePriority = {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3
};

export const MessageCategory = {
    COMMAND: 0,
    EVENT: 1,
    RENDER: 2
};

export const MessageType = {
    INPUT_MOVE: 1,
    INPUT_AIM: 2,
    PLAYER_STATE_UPDATED: 3,
    ENTITY_CREATED: 4,
    // Add more numeric IDs as needed
    DAMAGE_DEALT: 5,
    ENTITY_DESTROYED: 6,
    UI_READY: 7,
    ATTACK_PERFORMED: 8,
    PLAYER_DIED: 9,
    GAME_OVER: 10,
    PLAYER_HP_CHANGED: 11,
    ENTITY_HP_CHANGED: 12,
    // --- [MULTIPLAYER] Network Events ---
    REMOTE_PLAYER_JOINED: 13, // A remote player connected to the room
    REMOTE_PLAYER_LEFT: 14,   // A remote player disconnected
    PLAYERS_SYNCED: 15,       // Client received the full player list from host
    GAME_START: 16,           // Host signals all clients to start the game
    PLAYER_WON: 17,           // Last player alive wins the match
    INPUT_ATTACK: 18,         // Triggered by click/key
    INPUT_INVENTORY_CHANGE: 19, // Triggered by 1-5 or mouse wheel
    ATTACK_IMPACT: 20,
    PLAYER_WEAPON_CHANGED: 21,
    WAVE_CHANGED: 22,
    INPUT_ATTACK_START: 23,
    INPUT_ATTACK_RELEASE: 24,
    PROJECTILE_IMPACT: 25,
    ATTACK_CHARGE_UPDATED: 26,
    INPUT_DASH: 27,
    PLAYER_DASH_STATE_CHANGED: 28,
    ENTITY_KILLED: 29,
    RUN_STATS_UPDATED: 30,
    PICKUP_COLLECTED: 31,
    LEVEL_UP_READY: 32,
    LEVEL_UP_CHOICE_REQUEST: 33,
    LEVEL_UP_RESOLVED: 34
};

/**
 * Flat object structure designed for zero-allocation.
 * Resides in the MessagePool.
 */
export class Message {
    constructor() {
        this.id = 0;              // Auto-incremental ID
        this.frameNumber = 0;     // Frame when generated
        this.category = 0;        // MessageCategory
        this.type = 0;            // MessageType Enum
        this.priority = 2;        // MessagePriority
        this.senderId = 0;        // EntityID
        this.targetId = 0;        // Target EntityID (for commands)
        
        // Generic Payload
        this.float1 = 0.0;
        this.float2 = 0.0;
        this.int1 = 0;
        this.int2 = 0;
        this.string1 = null;      // For backward compatibility (like action='moved')
        this.object1 = null;      // For passing entity references (like ENTITY_CREATED)
        this.flags = 0;           // Bitmask
    }

    /**
     * Resets the message data for recycling.
     */
    reset() {
        this.id = 0;
        this.frameNumber = 0;
        this.category = 0;
        this.type = 0;
        this.priority = 2;
        this.senderId = 0;
        this.targetId = 0;
        this.float1 = 0.0;
        this.float2 = 0.0;
        this.float3 = 0.0;
        this.float4 = 0.0;
        this.float5 = 0.0;
        this.int1 = 0;
        this.int2 = 0;
        this.string1 = null;
        this.object1 = null;
        this.flags = 0;
    }
}

/**
 * Pre-allocates Message objects to avoid Garbage Collection inside the Game Loop.
 */
export class MessagePool {
    constructor(initialSize = 10000) {
        this.pool = new Array(initialSize);
        // Initialize pool objects
        for (let i = 0; i < initialSize; i++) {
            this.pool[i] = new Message();
        }
        this.nextAvailableIndex = initialSize - 1;
        this.messageCounter = 1;
    }

    /**
     * Obtains a free message from the pool.
     */
    obtain() {
        if (this.nextAvailableIndex >= 0) {
            const msg = this.pool[this.nextAvailableIndex];
            this.nextAvailableIndex--;
            msg.id = this.messageCounter++;
            return msg;
        }
        // Fallback: If pool is exhausted, trace warning and allocate.
        console.warn("MessagePool exhausted! Allocating new Message (Warning: GC spike possible). Increase initial pool size.");
        const msg = new Message();
        msg.id = this.messageCounter++;
        return msg;
    }

    /**
     * Recycles a message back into the pool.
     */
    recycle(message) {
        message.reset();
        this.nextAvailableIndex++;
        
        // Safeguard to ensure we don't overflow the pool array if something dynamically allocated is recycled
        if (this.nextAvailableIndex >= this.pool.length) {
             this.pool.push(message); 
        } else {
             this.pool[this.nextAvailableIndex] = message;
        }
    }
    
    getAvailableSize() {
        return this.nextAvailableIndex + 1;
    }
}

/**
 * The MessageBus manages Phase Queues and Deferred Dispatching.
 */
class MessageBusSystem {
    constructor() {
        this.pool = new MessagePool(10000);
        
        // Subscriptions: Indexed by MessageType (Array of Arrays)
        // [MessageType] -> [ { listener, context } ]
        this.listeners = [];
        
        // Queues: this.queues[Category][Priority] -> Array of Messages
        // Initializing the 3x4 Matrix of queues
        this.queues = [
            [ [], [], [], [] ], // COMMAND queues (Critical, High, Normal, Low)
            [ [], [], [], [] ], // EVENT queues
            [ [], [], [], [] ]  // RENDER queues
        ];
        
        this.currentFrame = 0;

        // --- DEBUG TOOLS ---
        this.debugMode = false;
        this.debugHistory = []; // Cyclic buffer for visualization
        this.maxDebugHistory = 50;
    }

    setDebugMode(isEnabled) {
        this.debugMode = isEnabled;
        if (!isEnabled) this.debugHistory = [];
    }

    logToDebugHistory(msg, wasDispatched = true) {
        if (!this.debugMode) return;
        
        // Push a plain JSON copy since the real msg will be recycled
        this.debugHistory.push({
            id: msg.id,
            timestamp: Date.now(),
            frame: msg.frameNumber,
            category: msg.category,
            type: msg.type,
            priority: msg.priority,
            senderId: msg.senderId,
            string1: msg.string1,
            dispatched: wasDispatched
        });

        if (this.debugHistory.length > this.maxDebugHistory) {
            this.debugHistory.shift();
        }
    }

    getDebugHistory() {
        return this.debugHistory;
    }

    getDebugQueue() {
        if (!this.debugMode) return [];
        
        let pending = [];
        // Flatten the multi-dimensional queue structure (Category -> Priority -> Array)
        for (let c = 0; c < this.queues.length; c++) {
            for (let p = 0; p < this.queues[c].length; p++) {
                const q = this.queues[c][p];
                for (let i = 0; i < q.length; i++) {
                    const msg = q[i];
                    pending.push({
                        id: msg.id,
                        frame: msg.frameNumber,
                        category: msg.category,
                        type: msg.type,
                        priority: msg.priority,
                        senderId: msg.senderId,
                        string1: msg.string1,
                        targetId: msg.targetId,
                        dispatched: false
                    });
                }
            }
        }
        return pending;
    }

    getPoolSize() {
        return this.pool.getAvailableSize();
    }

    setFrame(frame) {
        this.currentFrame = frame;
    }

    /**
     * Subscribe to a specific MessageType
     * @param {number} type - MessageType Enum
     */
    subscribe(type, listener, context = null) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push({ listener, context });
    }

    /**
     * Unsubscribe from a message
     */
    unsubscribe(type, listener, context = null) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter(
            (l) => l.listener !== listener || (context && l.context !== context)
        );
    }

    /**
     * Enqueues a message for deferred execution in its corresponding phase.
     */
    enqueue(category, type, priority = MessagePriority.NORMAL, params = {}) {
        const msg = this.pool.obtain();
        
        msg.frameNumber = this.currentFrame;
        msg.category = category;
        msg.type = type;
        msg.priority = priority;
        
        // Populate payload
        if (params.senderId !== undefined) msg.senderId = params.senderId;
        if (params.targetId !== undefined) msg.targetId = params.targetId;
        if (params.float1 !== undefined) msg.float1 = params.float1;
        if (params.float2 !== undefined) msg.float2 = params.float2;
        if (params.float3 !== undefined) msg.float3 = params.float3;
        if (params.float4 !== undefined) msg.float4 = params.float4;
        if (params.float5 !== undefined) msg.float5 = params.float5;
        if (params.int1 !== undefined) msg.int1 = params.int1;
        if (params.int2 !== undefined) msg.int2 = params.int2;
        if (params.string1 !== undefined) msg.string1 = params.string1;
        if (params.object1 !== undefined) msg.object1 = params.object1;
        if (params.flags !== undefined) msg.flags = params.flags;

        // Place in appropriate queue based on matrix routing
        this.queues[category][priority].push(msg);
        return msg.id;
    }

    /**
     * Helper methods for cleaner API usage
     */
    enqueueCommand(type, priority = MessagePriority.NORMAL, params = {}) {
        return this.enqueue(MessageCategory.COMMAND, type, priority, params);
    }
    
    enqueueEvent(type, priority = MessagePriority.NORMAL, params = {}) {
        return this.enqueue(MessageCategory.EVENT, type, priority, params);
    }

    enqueueRender(type, priority = MessagePriority.NORMAL, params = {}) {
        return this.enqueue(MessageCategory.RENDER, type, priority, params);
    }

    /**
     * Dispatches all enqueued messages for a specific category, respecting priority order.
     * Messages processed are recycled back into the pool.
     */
    dispatchCategory(category) {
        const categoryQueues = this.queues[category];
        
        // Loop through priorities: 0 (Critical) to 3 (Low)
        for (let p = 0; p < categoryQueues.length; p++) {
            const queue = categoryQueues[p];
            // Process all messages currently in this priority queue
            // We use a while loop because dispatching might theoretically add more messages?
            // Actually, we want deferred dispatching per frame.
            // If an event triggers another event of the SAME category, it should go to the NEXT frame queue to avoid loops.
            // To be safe, we capture the current length and only process those.
            
            const numMessages = queue.length;
            for (let i = 0; i < numMessages; i++) {
                const msg = queue[i]; // Peek
                
                // Route to listeners
                const listenersForType = this.listeners[msg.type];
                if (listenersForType) {
                    for (let l = 0; l < listenersForType.length; l++) {
                        const { listener, context } = listenersForType[l];
                        // Execute listener exactly once per subscriber
                        listener.call(context, msg);
                    }
                }
                
                this.logToDebugHistory(msg);
                
                // Recycle the message object
                this.pool.recycle(msg);
            }
            
            // Clear the queue for the items we just processed.
            // Items added *during* dispatch will be left for the next phase/frame.
            queue.splice(0, numMessages);
        }
    }

    // Phase Dispatchers for the Game Loop
    dispatchCommands() {
        this.dispatchCategory(MessageCategory.COMMAND);
    }

    dispatchEvents() {
        this.dispatchCategory(MessageCategory.EVENT);
    }

    dispatchRender() {
        this.dispatchCategory(MessageCategory.RENDER);
    }
    
    resetAll() {
        this.listeners = [];
        this.queues = [
            [ [], [], [], [] ],
            [ [], [], [], [] ],
            [ [], [], [], [] ]
        ];
        // Note: we don't reset the pool contents, just empty the queues.
    }
}

const EventBus = new MessageBusSystem();

// Para retrocompatibilidad temporal, re-exportamos EVENTS como MessageType
export const EVENTS = MessageType;
export default EventBus;
