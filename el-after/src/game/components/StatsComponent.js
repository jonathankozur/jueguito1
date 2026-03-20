/**
 * StatsComponent
 * Centralized data container for all combat math (Player and Enemies).
 * Modifying these values directly avoids coupling logic to the physical Engine.
 */
export default class StatsComponent {
    constructor(config = {}) {
        this.maxHp = config.maxHp || 100;
        this.currentHp = config.currentHp !== undefined ? config.currentHp : this.maxHp;
        this.baseSpeed = config.baseSpeed || 100;
        this.damage = config.damage || 10;
        
        this.attackRate = config.attackRate || 1000; 
        
        // Atributos de Empuje (Knockback)
        this.strength = config.strength || 10; // Fuerza del atacante
        this.endurance = config.endurance || 10; // Aguante del defensor (resistencia al empuje)

        this.speedMultiplier = config.speedMultiplier || 1;
        this.attackSpeedMultiplier = config.attackSpeedMultiplier || 1;
        this.damageMultiplier = config.damageMultiplier || 1;
        this.armor = config.armor || 0;
        this.regenPerSecond = config.regenPerSecond || 0;

        // Internal state
        this.isDead = this.currentHp <= 0;
    }

    takeDamage(amount) {
        if (this.isDead) return 0; // Already pure logic

        const mitigatedAmount = Math.max(0, amount * (1 - Math.min(0.75, this.armor)));
        const actualDamage = Math.min(this.currentHp, mitigatedAmount);
        this.currentHp -= actualDamage;

        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.isDead = true;
        }

        return actualDamage; // Return the exact amount of health removed
    }

    heal(amount) {
        if (this.isDead) return 0; // Can't heal dead entities (unless revived)

        const hpBefore = this.currentHp;
        this.currentHp += amount;

        if (this.currentHp > this.maxHp) {
            this.currentHp = this.maxHp;
        }

        return this.currentHp - hpBefore; // Return the exact amount healed
    }

    getSpeed() {
        // Here we could implement buffs/debuffs multipliers in the future
        return this.baseSpeed * this.speedMultiplier;
    }

    getAttackCooldown(baseCooldownMs = this.attackRate) {
        return Math.max(60, Math.round(baseCooldownMs / this.attackSpeedMultiplier));
    }

    getScaledDamage(baseDamage = this.damage) {
        return Math.max(1, Math.round(baseDamage * this.damageMultiplier));
    }
}
