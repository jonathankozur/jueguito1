import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

export default class InputController {
    constructor(scene) {
        this.scene = scene; // Reference to the Phaser Scene to read hardware state

        // Cache state to prevent spamming the MessageBus
        this.lastInputMove = { x: null, y: null };
        this.lastInputAim = { x: null, y: null };
        
        this.cursors = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
    }

    // Called every frame by the Phaser Scene's update loop
    update() {
        let dirX = 0;
        let dirY = 0;

        if (this.cursors.left.isDown) dirX = -1;
        else if (this.cursors.right.isDown) dirX = 1;

        if (this.cursors.up.isDown) dirY = -1;
        else if (this.cursors.down.isDown) dirY = 1;

        if (this.lastInputMove.x !== dirX || this.lastInputMove.y !== dirY) {
            EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, { float1: dirX, float2: dirY });
            this.lastInputMove.x = dirX;
            this.lastInputMove.y = dirY;
        }

        const pointer = this.scene.input.activePointer;
        if (pointer) {
            // Optimization: round coordinates to prevent micro-movements from filling the bus
            const aimX = Math.round(pointer.worldX); 
            const aimY = Math.round(pointer.worldY);
            
            if (this.lastInputAim.x !== aimX || this.lastInputAim.y !== aimY) {
                EventBus.enqueueCommand(EVENTS.INPUT_AIM, MessagePriority.NORMAL, { float1: aimX, float2: aimY });
                this.lastInputAim.x = aimX;
                this.lastInputAim.y = aimY;
            }
        }
    }

    destroy() {
        // Cleanup if needed when the controller is destroyed
        this.scene = null;
    }
}
