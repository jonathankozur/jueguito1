import Phaser from 'phaser';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import InputController from '../controllers/InputController';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        // Diccionario para vincular IDs Lógicas con Sprites visuales
        this.uiSprites = {};
        this.inputController = null;
    }

    preload() {
        // Player placeholder (Cyan)
        const gPlayer = this.add.graphics();
        gPlayer.fillStyle(0x00e5ff, 1);
        gPlayer.fillRect(-16, -16, 32, 32); // Centered
        gPlayer.generateTexture('player_placeholder', 32, 32);
        gPlayer.destroy();

        // Enemy Fodder placeholder (Red)
        const gEnemy = this.add.graphics();
        gEnemy.fillStyle(0xff003c, 1); // Neon Red/Pink
        gEnemy.fillRect(-12, -12, 24, 24); // Centered, slightly smaller
        gEnemy.generateTexture('enemy_fodder', 24, 24);
        gEnemy.destroy();
    }

    create() {
        // Cero lógicas de borde físico en Phaser. Lo calcula GameSimulation.
        this.cameras.main.setBackgroundColor('#1a1a24');
        this.add.rectangle(800, 800, 1600, 1600).setStrokeStyle(4, 0xff007f);
        this.input.setDefaultCursor('crosshair');

        // 1. Suscribir la Escena (Renderer UI) al mundo
        EventBus.subscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
        EventBus.subscribe(EVENTS.ENTITY_DESTROYED, this.onEntityDestroyed, this);
        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, this.onEntityStateUpdated, this);
        
        // Listeners visuales secundarios (FX de Ataque, Barras de HP)
        EventBus.subscribe(EVENTS.ENTITY_HP_CHANGED, this.onEntityHpChanged, this);
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, this.onAttackPerformed, this);

        // 2. Configurar Controller de Hardware
        this.inputController = new InputController(this);

        // 3. Avisar al Engine Lógico que la UI (Phaser) ya está leyendo eventos
        EventBus.enqueueCommand(EVENTS.UI_READY, MessagePriority.CRITICAL);
    }

    update() {
        // 3. Delegate input checking to the InputController
        if (this.inputController) {
            this.inputController.update();
        }
    }

    // --- MÉTODOS EXCLUSIVOS DE RENDERIZACIÓN ---

    onEntityCreated(msg) {
        if (msg.string1 === 'Player') {
            const sprite = this.add.sprite(0, 0, 'player_placeholder');
            
            // Container para agrupar Sprite + UI Elements de la Entidad
            const container = this.add.container(msg.float1, msg.float2, [sprite]);

            this.uiSprites[msg.senderId] = {
                container: container,
                sprite: sprite,
                type: 'Player'
            };

            this.cameras.main.startFollow(container, true, 0.1, 0.1);
            this.cameras.main.setZoom(1.5);
            
        } else if (msg.string1 === 'Enemy') {
            const sprite = this.add.sprite(0, 0, 'enemy_fodder');
            
            // Health Bar Background (Black)
            const hpBg = this.add.graphics();
            hpBg.fillStyle(0x000000, 1);
            hpBg.fillRect(-15, -20, 30, 4);
            
            // Health Bar Fill (Green)
            const hpFill = this.add.graphics();
            hpFill.fillStyle(0x00ff00, 1);
            hpFill.fillRect(-15, -20, 30, 4);

            const container = this.add.container(msg.float1, msg.float2, [sprite, hpBg, hpFill]);

            this.uiSprites[msg.senderId] = {
                container: container,
                sprite: sprite,
                hpFill: hpFill,
                type: 'Enemy',
                maxHp: msg.object1.stats.maxHp // We passed the enemy object in object1
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
        // Recibe el mensaje "Adiviná, el ID player1 cambió de estado"
        const entityData = this.uiSprites[msg.senderId];
        if (entityData) {
            if (msg.string1 === 'moved') {
                entityData.container.setPosition(msg.float1, msg.float2);
                entityData.sprite.setRotation(msg.float5);
            }
        }
    }

    onEntityHpChanged(msg) {
        // msg.senderId is the enemy ID, msg.float1 is currentHp, msg.float2 is maxHp
        // This is sent by EnemyEntity.receiveDamage() — the entity owns its own state.
        const entityData = this.uiSprites[msg.senderId];
        if (entityData && entityData.hpFill) {
            const ratio = Math.max(0, msg.float1 / msg.float2);
            entityData.hpFill.clear();
            // Color changes from green to red as HP drops
            const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffaa00 : 0xff0000;
            entityData.hpFill.fillStyle(color, 1);
            entityData.hpFill.fillRect(-15, -20, 30 * ratio, 4);
        }
    }

    onAttackPerformed(msg) {
        const originX = msg.float1;
        const originY = msg.float2;
        const angle = msg.float3; // Middle angle

        if (msg.senderId === 'player1') {
            // These exact values must match CombatSystem.js (Player)
            const length = 100; 
            const spread = Math.PI / 4; // 45 degrees left and right (90 total)

            // Draw a conical "slash" using Graphics
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffaa00, 0.4); // Amber, semi-transparent
            
            // Draw slice: moveTo origin, arc, then closePath
            graphics.beginPath();
            graphics.moveTo(originX, originY);
            graphics.arc(
                originX, 
                originY, 
                length, 
                angle - spread, 
                angle + spread, 
                false
            );
            graphics.closePath();
            graphics.fillPath();

            // Animate fade out and scale slightly for impact feel
            this.tweens.add({
                targets: graphics,
                alpha: 0,
                scaleX: 1.1,
                scaleY: 1.1,
                x: originX * -0.1, // Offset compensation for scale
                y: originY * -0.1,
                duration: 150,
                onComplete: () => graphics.destroy()
            });
        } else {
            // ENEMY ATTACK VISUALIZATION (Fodders)
            // They have a smaller, melee range (30) and we paint them red
            const length = 30; 
            const spread = Math.PI / 4;

            const graphics = this.add.graphics();
            graphics.fillStyle(0xff0000, 0.4); // Pure Red, semi-transparent
            
            graphics.beginPath();
            graphics.moveTo(originX, originY);
            graphics.arc(
                originX, 
                originY, 
                length, 
                angle - spread, 
                angle + spread, 
                false
            );
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
