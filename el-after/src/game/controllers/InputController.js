import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';

/**
 * InputController
 *
 * Lee el hardware (teclado + mouse) desde Phaser y emite INPUT_MOVE / INPUT_AIM.
 *
 * [MULTIPLAYER] Modes:
 *  - mode 'local': Emite al EventBus local (host/solo — la simulación está en este mismo browser)
 *  - mode 'remote': Envía al NetworkClient para que lo reenvíe al host por WebSocket
 *
 * @param {Phaser.Scene} scene
 * @param {string} playerId - The local player's ID (e.g. 'player_1')
 * @param {'local'|'remote'} inputMode
 * @param {NetworkClient|null} networkClient - Required when inputMode === 'remote'
 */
export default class InputController {
    constructor(scene, playerId = 'player_1', inputMode = 'local', networkClient = null) {
        this.scene = scene;
        this.playerId = playerId;
        this.inputMode = inputMode;
        this.networkClient = networkClient;

        this.lastInputMove = { x: null, y: null };
        this.lastInputAim = { x: null, y: null };

        this.cursors = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
            slot1: Phaser.Input.Keyboard.KeyCodes.ONE,
            slot2: Phaser.Input.Keyboard.KeyCodes.TWO,
            slot3: Phaser.Input.Keyboard.KeyCodes.THREE,
            slot4: Phaser.Input.Keyboard.KeyCodes.FOUR,
            slot5: Phaser.Input.Keyboard.KeyCodes.FIVE
        });

        // Mouse Wheel for inventory
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this._sendInventoryChange(deltaY > 0 ? 1 : -1, 'wheel');
        });
    }

    update() {
        let dirX = 0;
        let dirY = 0;

        if (this.cursors.left.isDown) dirX = -1;
        else if (this.cursors.right.isDown) dirX = 1;

        if (this.cursors.up.isDown) dirY = -1;
        else if (this.cursors.down.isDown) dirY = 1;

        if (this.lastInputMove.x !== dirX || this.lastInputMove.y !== dirY) {
            this.lastInputMove.x = dirX;
            this.lastInputMove.y = dirY;
            this._sendMoveInput(dirX, dirY);
        }

        const pointer = this.scene.input.activePointer;
        if (pointer) {
            const aimX = Math.round(pointer.worldX);
            const aimY = Math.round(pointer.worldY);

            if (this.lastInputAim.x !== aimX || this.lastInputAim.y !== aimY) {
                this.lastInputAim.x = aimX;
                this.lastInputAim.y = aimY;
                this._sendAimInput(aimX, aimY);
            }

            // Click/hold for attack
            if (pointer.isDown && !this.wasPointerDown) {
                this._sendAttackStartInput();
            } else if (!pointer.isDown && this.wasPointerDown) {
                this._sendAttackReleaseInput();
            }
            this.wasPointerDown = pointer.isDown;
        }

        // Keys 1-5 for inventory
        for (let i = 1; i <= 5; i++) {
            if (Phaser.Input.Keyboard.JustDown(this.cursors[`slot${i}`])) {
                this._sendInventoryChange(i, 'key');
            }
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.dash)) {
            this._sendDashInput();
        }
    }

    _sendAttackStartInput() {
        if (this.inputMode === 'remote' && this.networkClient) {
            this.networkClient.sendAttackStartInput();
        } else {
            EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_START, MessagePriority.HIGH, {
                targetId: this.playerId
            });
        }
    }

    _sendAttackReleaseInput() {
        if (this.inputMode === 'remote' && this.networkClient) {
            this.networkClient.sendAttackReleaseInput();
        } else {
            EventBus.enqueueCommand(EVENTS.INPUT_ATTACK_RELEASE, MessagePriority.HIGH, {
                targetId: this.playerId
            });
        }
    }

    _sendDashInput() {
        if (this.inputMode === 'remote' && this.networkClient) {
            this.networkClient.sendDashInput();
        } else {
            EventBus.enqueueCommand(EVENTS.INPUT_DASH, MessagePriority.HIGH, {
                targetId: this.playerId
            });
        }
    }

    _sendInventoryChange(value, mode) {
        if (this.inputMode === 'remote' && this.networkClient) {
            this.networkClient.sendInventoryChange(value, mode);
        } else {
            EventBus.enqueueCommand(EVENTS.INPUT_INVENTORY_CHANGE, MessagePriority.NORMAL, {
                targetId: this.playerId,
                int1: value,
                string1: mode // 'wheel' or 'key'
            });
        }
    }

    _sendMoveInput(dirX, dirY) {
        if (this.inputMode === 'remote' && this.networkClient) {
            // Client: send to host via WebSocket
            this.networkClient.sendMoveInput(dirX, dirY);
        } else {
            // Host/Solo: inject directly into local EventBus with targetId
            EventBus.enqueueCommand(EVENTS.INPUT_MOVE, MessagePriority.NORMAL, {
                targetId: this.playerId,
                float1: dirX,
                float2: dirY
            });
        }
    }

    _sendAimInput(aimX, aimY) {
        if (this.inputMode === 'remote' && this.networkClient) {
            this.networkClient.sendAimInput(aimX, aimY);
        } else {
            EventBus.enqueueCommand(EVENTS.INPUT_AIM, MessagePriority.NORMAL, {
                targetId: this.playerId,
                float1: aimX,
                float2: aimY
            });
        }
    }

    destroy() {
        this.scene = null;
        this.networkClient = null;
    }
}
