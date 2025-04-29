// BaseWeapon.js
// Abstract base class for all weapons. Implements common functionality and enforces IWeapon structure.

/**
 * @typedef {Object} WeaponConfig
 * @property {string} name
 * @property {number} ammoCount
 * @property {number} cooldownTime
 * @property {number} damageAmount
 * @property {number} [reloadTime]
 * @property {string} [projectileType]
 */

class BaseWeapon {
    /**
     * @param {WeaponConfig} config
     */
    constructor(config) {
        this.name = config.name;
        this.ammoCount = config.ammoCount;
        this.cooldownTime = config.cooldownTime;
        this.damageAmount = config.damageAmount;
        this.reloadTime = config.reloadTime || 1.5;
        this.projectileType = config.projectileType || null;
        this.lastFired = 0;
        // --- Heat/Overheat ---
        this.heat = 0;
        this.maxHeat = config.maxHeat || 0; // 0 = no heat system
        this.heatPerShot = config.heatPerShot || 0;
        this.coolRate = config.coolRate || 0.6;
        this.overheated = false;
    }

    /**
     * Attempt to fire the weapon at a target.
     * @param {Object} target
     */
    Fire(target) {
        throw new Error('Fire() must be implemented by subclasses');
    }

    /**
     * Reload the weapon.
     */
    Reload() {
        throw new Error('Reload() must be implemented by subclasses');
    }

    /**
     * Check if the weapon can fire now (based on cooldown).
     * @returns {boolean}
     */
    /**
     * Update weapon heat (call per frame or after firing).
     * @param {number} dt - Delta time in seconds
     */
    updateHeat(dt) {
        if (this.maxHeat > 0) {
            this.heat = Math.max(0, this.heat - this.coolRate * dt);
            if (this.overheated && this.heat <= this.maxHeat * 0.4) {
                this.overheated = false;
            }
        }
    }

    /**
     * Returns true if weapon is overheated.
     */
    isOverheated() {
        return this.maxHeat > 0 && this.overheated;
    }

    canFire() {
        const now = performance.now() / 1000;
        if (this.maxHeat > 0 && this.overheated) return false;
        return (now - this.lastFired) >= this.cooldownTime && this.ammoCount > 0;
    }
}

export default BaseWeapon;
