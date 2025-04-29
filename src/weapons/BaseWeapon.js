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
    canFire() {
        const now = performance.now() / 1000;
        return (now - this.lastFired) >= this.cooldownTime && this.ammoCount > 0;
    }
}

export default BaseWeapon;
