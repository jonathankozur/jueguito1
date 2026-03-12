import Phaser from 'phaser';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import InputController from '../controllers/InputController';

// [MULTIPLAYER] Colors per player slot for visual distinction
const PLAYER_COLORS = [
    0x00e5ff, // player_1: Cyan (host)
    0x39ff14, // player_2: Neon Green
    0xff6ec7, // player_3: Neon Pink
    0xffae00  // player_4: Amber
];

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.uiSprites = {};
        this.inputController = null;

        // [MULTIPLAYER] Set by GameComponent after Phaser game is ready:
        this.localPlayerId = null;  // e.g. 'player_1'
        this.inputMode = 'local';   // 'local' for host/solo, 'remote' for clients
        this.networkClient = null;  // NetworkClient instance (only for clients)
    }

    preload() {
        // We generate player textures dynamically per-color in onEntityCreated
        // Enemy Fodder placeholder (Red)
        const gEnemy = this.add.graphics();
        gEnemy.fillStyle(0xff003c, 1);
        gEnemy.fillRect(-12, -12, 24, 24);
        gEnemy.generateTexture('enemy_fodder', 24, 24);
        gEnemy.destroy();
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a24');
        this.add.rectangle(800, 800, 1600, 1600).setStrokeStyle(4, 0xff007f);
        this.input.setDefaultCursor('crosshair');

        // [FIX] Read session data from Phaser's global registry.
        // GameComponent sets these BEFORE Phaser creates the scene,
        // ensuring they're available at create() time.
        this.localPlayerId = this.game.registry.get('localPlayerId') ?? 'player_1';
        this.inputMode = this.game.registry.get('inputMode') ?? 'local';
        this.networkClient = this.game.registry.get('networkClient') ?? null;

        EventBus.subscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
        EventBus.subscribe(EVENTS.ENTITY_DESTROYED, this.onEntityDestroyed, this);
        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, this.onEntityStateUpdated, this);
        EventBus.subscribe(EVENTS.ENTITY_HP_CHANGED, this.onEntityHpChanged, this);
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, this.onAttackPerformed, this);

        // [MULTIPLAYER] Configure InputController based on mode.
        // 'local'  → host/solo: inject inputs into EventBus directly
        // 'remote' → client: send inputs to host via NetworkClient WebSocket
        this.inputController = new InputController(
            this,
            this.localPlayerId,
            this.inputMode,
            this.networkClient
        );

        EventBus.enqueueCommand(EVENTS.UI_READY, MessagePriority.CRITICAL);
    }


    update() {
        if (this.inputController) {
            this.inputController.update();
        }

        // [MULTIPLAYER] Dynamic group camera: center on all players
        this._updateGroupCamera();
    }

    // --- MÉTODOS EXCLUSIVOS DE RENDERIZACIÓN ---

    onEntityCreated(msg) {
        if (msg.string1 === 'Player') {
            // [MULTIPLAYER] Determine slot index from playerId (player_1 -> 0, player_2 -> 1...)
            const slotIndex = this._getPlayerSlot(msg.senderId);
            const color = PLAYER_COLORS[slotIndex] ?? 0xffffff;

            // Generate a unique texture per player color
            const texKey = `player_${slotIndex}`;
            if (!this.textures.exists(texKey)) {
                const g = this.add.graphics();
                g.fillStyle(color, 1);
                g.fillRect(-16, -16, 32, 32);
                g.generateTexture(texKey, 32, 32);
                g.destroy();
            }

            const sprite = this.add.sprite(0, 0, texKey);
            const container = this.add.container(msg.float1, msg.float2, [sprite]);

            // [MULTIPLAYER] Add name tag above player for clarity
            const nameTag = this.add.text(0, -28, msg.senderId, {
                fontSize: '10px',
                color: `#${color.toString(16).padStart(6, '0')}`,
                fontFamily: 'monospace'
            }).setOrigin(0.5);
            container.add(nameTag);

            this.uiSprites[msg.senderId] = {
                container,
                sprite,
                type: 'Player',
                slotIndex
            };

            // Camera follows local player individually on first join
            // Group camera logic is in _updateGroupCamera()
            if (msg.senderId === this.localPlayerId || 
                (!this.localPlayerId && slotIndex === 0)) {
                this.cameras.main.startFollow(container, true, 0.1, 0.1);
                this.cameras.main.setZoom(1.5);
            }

        } else if (msg.string1 === 'Enemy') {
            const sprite = this.add.sprite(0, 0, 'enemy_fodder');
            
            const hpBg = this.add.graphics();
            hpBg.fillStyle(0x000000, 1);
            hpBg.fillRect(-15, -20, 30, 4);
            
            const hpFill = this.add.graphics();
            hpFill.fillStyle(0x00ff00, 1);
            hpFill.fillRect(-15, -20, 30, 4);

            const container = this.add.container(msg.float1, msg.float2, [sprite, hpBg, hpFill]);

            this.uiSprites[msg.senderId] = {
                container,
                sprite,
                hpFill,
                type: 'Enemy',
                maxHp: msg.object1.stats.maxHp
            };
        }
    }

    onEntityDestroyed(msg) {
        const entityData = this.uiSprites[msg.senderId];
        if (entityData) {
            entityData.container.destroy();
            delete this.uiSprites[msg.senderId];
        }
    }

    onEntityStateUpdated(msg) {
        const entityData = this.uiSprites[msg.senderId];
        if (entityData) {
            if (msg.string1 === 'moved') {
                entityData.container.setPosition(msg.float1, msg.float2);
                entityData.sprite.setRotation(msg.float5);
            }
        }
    }

    onEntityHpChanged(msg) {
        const entityData = this.uiSprites[msg.senderId];
        if (entityData && entityData.hpFill) {
            const ratio = Math.max(0, msg.float1 / msg.float2);
            entityData.hpFill.clear();
            const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffaa00 : 0xff0000;
            entityData.hpFill.fillStyle(color, 1);
            entityData.hpFill.fillRect(-15, -20, 30 * ratio, 4);
        }
    }

    onAttackPerformed(msg) {
        const originX = msg.float1;
        const originY = msg.float2;
        const angle = msg.float3;

        // [MULTIPLAYER] Any player attack (not just player1) gets the amber cone
        const isPlayerAttack = msg.senderId.startsWith('player_');

        if (isPlayerAttack) {
            const length = 100;
            const spread = Math.PI / 4;

            const graphics = this.add.graphics();
            graphics.fillStyle(0xffaa00, 0.4);
            
            graphics.beginPath();
            graphics.moveTo(originX, originY);
            graphics.arc(originX, originY, length, angle - spread, angle + spread, false);
            graphics.closePath();
            graphics.fillPath();

            this.tweens.add({
                targets: graphics,
                alpha: 0,
                scaleX: 1.1,
                scaleY: 1.1,
                x: originX * -0.1,
                y: originY * -0.1,
                duration: 150,
                onComplete: () => graphics.destroy()
            });
        } else {
            const length = 30;
            const spread = Math.PI / 4;

            const graphics = this.add.graphics();
            graphics.fillStyle(0xff0000, 0.4);
            
            graphics.beginPath();
            graphics.moveTo(originX, originY);
            graphics.arc(originX, originY, length, angle - spread, angle + spread, false);
            graphics.closePath();
            graphics.fillPath();

            this.tweens.add({
                targets: graphics,
                alpha: 0,
                duration: 200,
                onComplete: () => graphics.destroy()
            });
        }
    }

    /**
     * [MULTIPLAYER] Keeps the camera centered on the centroid of all active players,
     * with dynamic zoom based on spread distance.
     */
    _updateGroupCamera() {
        const playerEntries = Object.entries(this.uiSprites)
            .filter(([, data]) => data.type === 'Player');

        if (playerEntries.length === 0) return;
        // If only 1 player, the startFollow() handles tracking — no need to override
        if (playerEntries.length === 1) return;

        // Stop the single-player follow target (we take manual control)
        this.cameras.main.stopFollow();

        let sumX = 0, sumY = 0;
        for (const [, data] of playerEntries) {
            sumX += data.container.x;
            sumY += data.container.y;
        }

        const centroidX = sumX / playerEntries.length;
        const centroidY = sumY / playerEntries.length;

        // Smooth pan towards centroid
        const cam = this.cameras.main;
        const lerpFactor = 0.08;
        const scrollX = centroidX - cam.width / (2 * cam.zoom);
        const scrollY = centroidY - cam.height / (2 * cam.zoom);

        cam.scrollX += (scrollX - cam.scrollX) * lerpFactor;
        cam.scrollY += (scrollY - cam.scrollY) * lerpFactor;
    }

    _getPlayerSlot(playerId) {
        const parts = playerId.split('_');
        const num = parseInt(parts[parts.length - 1], 10);
        return isNaN(num) ? 0 : num - 1;
    }

    shutdown() {
        EventBus.unsubscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
        EventBus.unsubscribe(EVENTS.ENTITY_DESTROYED, this.onEntityDestroyed, this);
        EventBus.unsubscribe(EVENTS.PLAYER_STATE_UPDATED, this.onEntityStateUpdated, this);
        EventBus.unsubscribe(EVENTS.ENTITY_HP_CHANGED, this.onEntityHpChanged, this);
        EventBus.unsubscribe(EVENTS.ATTACK_PERFORMED, this.onAttackPerformed, this);
        if (this.inputController) {
            this.inputController.destroy();
            this.inputController = null;
        }
    }
}
