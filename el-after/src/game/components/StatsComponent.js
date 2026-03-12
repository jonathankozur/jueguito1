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
        
        // Attack rate in milliseconds
        this.attackRate = config.attackRate || 1000; 
        
        // Internal state
        this.isDead = this.currentHp <= 0;
    }

    takeDamage(amount) {
        if (this.isDead) return 0; // Already pure logic

        const actualDamage = Math.min(this.currentHp, amount);
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
        return this.baseSpeed;
    }
}
