import Phaser from 'phaser';
import EventBus, { EVENTS, MessagePriority } from '../events/EventBus';
import InputController from '../controllers/InputController';

const PLAYER_COLORS = [
    0x00e5ff,
    0x39ff14,
    0xff6ec7,
    0xffae00
];

const ENEMY_STYLE = {
    fodder: { key: 'enemy_fodder', color: 0xff003c, size: 24 },
    bouncer: { key: 'enemy_bouncer', color: 0xff9f1c, size: 32 }
};

const DEFAULT_THROW_SPEED = 0.78;
const DEFAULT_BULLET_SPEED = 5.4;

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.uiSprites = {};
        this.inputController = null;
        this.localPlayerId = null;
        this.inputMode = 'local';
        this.networkClient = null;
    }

    preload() {
        Object.values(ENEMY_STYLE).forEach(({ key, color, size }) => {
            if (this.textures.exists(key)) return;
            const graphics = this.add.graphics();
            graphics.fillStyle(color, 1);
            graphics.fillRect(-(size / 2), -(size / 2), size, size);
            graphics.generateTexture(key, size, size);
            graphics.destroy();
        });
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a24');
        this.add.rectangle(800, 800, 1600, 1600).setStrokeStyle(4, 0xff007f);
        this.input.setDefaultCursor('crosshair');

        this.localPlayerId = this.game.registry.get('localPlayerId') ?? 'player_1';
        this.inputMode = this.game.registry.get('inputMode') ?? 'local';
        this.networkClient = this.game.registry.get('networkClient') ?? null;

        EventBus.subscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
        EventBus.subscribe(EVENTS.ENTITY_DESTROYED, this.onEntityDestroyed, this);
        EventBus.subscribe(EVENTS.PLAYER_STATE_UPDATED, this.onEntityStateUpdated, this);
        EventBus.subscribe(EVENTS.ENTITY_HP_CHANGED, this.onEntityHpChanged, this);
        EventBus.subscribe(EVENTS.ATTACK_PERFORMED, this.onAttackPerformed, this);
        EventBus.subscribe(EVENTS.PROJECTILE_IMPACT, this.onProjectileImpact, this);

        this.projectileTweens = new Map();

        this.inputController = new InputController(
            this,
            this.localPlayerId,
            this.inputMode,
            this.networkClient
        );

        EventBus.enqueueCommand(EVENTS.UI_READY, MessagePriority.CRITICAL);
    }

    update() {
        if (this.game.registry.get('isPaused')) return;

        if (this.inputController) {
            this.inputController.update();
        }

        this._updateGroupCamera();
    }

    onEntityCreated(msg) {
        if (msg.string1 === 'Player') {
            const slotIndex = this._getPlayerSlot(msg.senderId);
            const color = PLAYER_COLORS[slotIndex] ?? 0xffffff;
            const texKey = `player_${slotIndex}`;

            if (!this.textures.exists(texKey)) {
                const graphics = this.add.graphics();
                graphics.fillStyle(color, 1);
                graphics.fillRect(-16, -16, 32, 32);
                graphics.generateTexture(texKey, 32, 32);
                graphics.destroy();
            }

            const sprite = this.add.sprite(0, 0, texKey);
            const container = this.add.container(msg.float1, msg.float2, [sprite]);
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

            if (msg.senderId === this.localPlayerId || (!this.localPlayerId && slotIndex === 0)) {
                this.cameras.main.startFollow(container, true, 0.1, 0.1);
                this.cameras.main.setZoom(1.5);
            }
        } else if (msg.string1 === 'Enemy') {
            const enemyType = msg.object1?.type || 'fodder';
            const enemyStyle = ENEMY_STYLE[enemyType] || ENEMY_STYLE.fodder;
            const sprite = this.add.sprite(0, 0, enemyStyle.key);

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
                enemyType,
                maxHp: msg.object1?.stats?.maxHp || 100
            };
        } else if (msg.string1 === 'Obstacle') {
            const obstacle = msg.object1;
            const graphics = this.add.graphics();

            let color = 0x888888;
            if (obstacle.material === 'soft') color = 0xdeb887;
            else if (obstacle.material === 'medium') color = 0xb22222;

            graphics.fillStyle(color, 1);
            graphics.fillRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
            graphics.lineStyle(2, 0x000000);
            graphics.strokeRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);

            const container = this.add.container(msg.float1, msg.float2, [graphics]);
            if (obstacle.heightLevel === 'low') graphics.setAlpha(0.7);

            this.uiSprites[msg.senderId] = {
                container,
                type: 'Obstacle'
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
        if (!entityData || msg.string1 !== 'moved') return;

        entityData.container.setPosition(msg.float1, msg.float2);
        if (entityData.sprite) {
            entityData.sprite.setRotation(msg.float5);
        }
    }

    onEntityHpChanged(msg) {
        const entityData = this.uiSprites[msg.senderId];
        if (!entityData || !entityData.hpFill) return;

        const ratio = Math.max(0, msg.float1 / msg.float2);
        entityData.hpFill.clear();
        const color = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffaa00 : 0xff0000;
        entityData.hpFill.fillStyle(color, 1);
        entityData.hpFill.fillRect(-15, -20, 30 * ratio, 4);
    }

    onAttackPerformed(msg) {
        const originX = msg.float1;
        const originY = msg.float2;
        const angle = msg.float3;
        const attack = msg.object1 || {
            attackShape: msg.string1,
            reach: msg.int1,
            projectileRadius: 4,
            projectileSpeed: msg.string1 === 'distance' ? DEFAULT_BULLET_SPEED : DEFAULT_THROW_SPEED
        };

        const attackShape = attack.attackShape || msg.string1;
        const isPlayer = msg.senderId.startsWith('player_');
        const color = isPlayer ? 0xffaa00 : 0xff0000;

        if (attackShape === 'melee_circular') {
            const graphics = this.add.graphics();
            graphics.fillStyle(color, 0.35);
            graphics.fillCircle(originX, originY, attack.reach);
            this.tweens.add({
                targets: graphics,
                alpha: 0,
                scale: 1.2,
                duration: 180,
                onComplete: () => graphics.destroy()
            });
            return;
        }

        if (attackShape === 'melee_frontal' || attackShape === 'melee_sweep') {
            this.drawAttackArc(originX, originY, angle, attack, color);
            return;
        }

        if (attackShape === 'distance' || attackShape === 'throwable') {
            this.launchProjectile(msg.senderId, originX, originY, angle, attack, color);
        }
    }

    drawAttackArc(originX, originY, facingAngle, attack, color) {
        const graphics = this.add.graphics();
        const defaultHalfAngle = ((attack.sweepAngle || 60) * Math.PI) / 360;
        const startAngle = attack.startAngle ?? (facingAngle - defaultHalfAngle);
        const endAngle = attack.endAngle ?? (facingAngle + defaultHalfAngle);

        graphics.fillStyle(color, attack.attackShape === 'melee_sweep' ? 0.42 : 0.3);
        graphics.beginPath();
        graphics.moveTo(originX, originY);
        graphics.arc(originX, originY, attack.reach, startAngle, endAngle, startAngle > endAngle);
        graphics.closePath();
        graphics.fillPath();

        this.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: attack.attackShape === 'melee_sweep' ? 120 : 150,
            onComplete: () => graphics.destroy()
        });
    }

    launchProjectile(senderId, originX, originY, angle, attack, color) {
        const projectileRadius = attack.projectileRadius || (attack.attackShape === 'throwable' ? 6 : 4);
        const projectile = this.add.circle(originX, originY, projectileRadius, color);
        const destX = originX + (Math.cos(angle) * attack.reach);
        const destY = originY + (Math.sin(angle) * attack.reach);
        const distance = Phaser.Math.Distance.Between(originX, originY, destX, destY);
        const speed = attack.projectileSpeed || (attack.attackShape === 'distance' ? DEFAULT_BULLET_SPEED : DEFAULT_THROW_SPEED);
        const duration = Math.max(attack.attackShape === 'distance' ? 30 : 120, distance / speed);
        const key = this.buildProjectileKey(senderId);

        if (this.projectileTweens.has(key)) {
            const existing = this.projectileTweens.get(key);
            existing.tween.stop();
            existing.projectile.destroy();
            this.projectileTweens.delete(key);
        }

        const tween = this.tweens.add({
            targets: projectile,
            x: destX,
            y: destY,
            duration,
            ease: attack.attackShape === 'distance' ? 'Linear' : 'Cubic.easeOut',
            onComplete: () => {
                if (attack.attackShape === 'throwable') {
                    this.createExplosion(destX, destY, attack.aoeRadius || 70, color);
                }
                projectile.destroy();
                this.projectileTweens.delete(key);
            }
        });

        this.projectileTweens.set(key, {
            projectile,
            tween,
            destX,
            destY,
            attackShape: attack.attackShape,
            impactRadius: attack.aoeRadius || 70,
            color,
            speed
        });
    }

    onProjectileImpact(msg) {
        const key = this.buildProjectileKey(msg.senderId);
        const data = this.projectileTweens.get(key);
        if (!data) return;

        const impactX = msg.float1;
        const impactY = msg.float2;
        const remainingDist = Phaser.Math.Distance.Between(data.projectile.x, data.projectile.y, impactX, impactY);
        const remainingTime = Math.max(data.attackShape === 'distance' ? 10 : 50, remainingDist / (data.speed || DEFAULT_THROW_SPEED));

        data.tween.stop();
        data.tween = this.tweens.add({
            targets: data.projectile,
            x: impactX,
            y: impactY,
            duration: remainingTime,
            ease: data.attackShape === 'distance' ? 'Linear' : 'Cubic.easeOut',
            onComplete: () => {
                if (data.attackShape === 'throwable') {
                    this.createExplosion(impactX, impactY, data.impactRadius, data.color);
                } else {
                    this.createImpactSpark(impactX, impactY, data.color);
                }
                data.projectile.destroy();
                this.projectileTweens.delete(key);
            }
        });
    }

    createExplosion(x, y, radius, color) {
        const explosion = this.add.circle(x, y, radius, color, 0.5);
        this.tweens.add({
            targets: explosion,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => explosion.destroy()
        });
    }

    createImpactSpark(x, y, color) {
        const spark = this.add.circle(x, y, 10, color, 0.8);
        this.tweens.add({
            targets: spark,
            scale: 1.8,
            alpha: 0,
            duration: 120,
            onComplete: () => spark.destroy()
        });
    }

    buildProjectileKey(senderId) {
        return senderId;
    }

    _updateGroupCamera() {
        const playerEntries = Object.entries(this.uiSprites)
            .filter(([, data]) => data.type === 'Player');

        if (playerEntries.length <= 1) return;

        this.cameras.main.stopFollow();

        let sumX = 0;
        let sumY = 0;
        for (const [, data] of playerEntries) {
            sumX += data.container.x;
            sumY += data.container.y;
        }

        const centroidX = sumX / playerEntries.length;
        const centroidY = sumY / playerEntries.length;
        const cam = this.cameras.main;
        const lerpFactor = 0.08;
        const scrollX = centroidX - (cam.width / (2 * cam.zoom));
        const scrollY = centroidY - (cam.height / (2 * cam.zoom));

        cam.scrollX += (scrollX - cam.scrollX) * lerpFactor;
        cam.scrollY += (scrollY - cam.scrollY) * lerpFactor;
    }

    _getPlayerSlot(playerId) {
        const parts = playerId.split('_');
        const num = parseInt(parts[parts.length - 1], 10);
        return Number.isNaN(num) ? 0 : num - 1;
    }

    shutdown() {
        EventBus.unsubscribe(EVENTS.ENTITY_CREATED, this.onEntityCreated, this);
        EventBus.unsubscribe(EVENTS.ENTITY_DESTROYED, this.onEntityDestroyed, this);
        EventBus.unsubscribe(EVENTS.PLAYER_STATE_UPDATED, this.onEntityStateUpdated, this);
        EventBus.unsubscribe(EVENTS.ENTITY_HP_CHANGED, this.onEntityHpChanged, this);
        EventBus.unsubscribe(EVENTS.ATTACK_PERFORMED, this.onAttackPerformed, this);
        EventBus.unsubscribe(EVENTS.PROJECTILE_IMPACT, this.onProjectileImpact, this);

        if (this.inputController) {
            this.inputController.destroy();
            this.inputController = null;
        }
    }
}
