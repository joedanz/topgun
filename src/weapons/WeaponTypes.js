// MachineGun.js
import BaseWeapon from './BaseWeapon.js';
import WeaponConfigs from './WeaponConfig.js';
import BaseProjectile from './Projectile.js';
import * as THREE from 'three';

class MachineGun extends BaseWeapon {
    constructor(options) {
        super(WeaponConfigs.MachineGun);
        this.scene = options.scene;
        this.ammoWorld = options.ammoWorld;
    }

    /**
     * Fire a bullet with slight random spread.
     * @param {THREE.Vector3} position
     * @param {THREE.Vector3} direction
     */
    Fire(position, direction) {
        if (!this.canFire()) return null;
        this.lastFired = performance.now() / 1000;
        this.ammoCount--;
        // --- Heat/Overheat logic ---
        if (this.maxHeat > 0) {
            this.heat += this.heatPerShot;
            if (this.heat >= this.maxHeat) {
                this.overheated = true;
            }
        }
        // Add random spread
        const spread = 0.01;
        const dir = direction.clone();
        dir.x += (Math.random() - 0.5) * spread;
        dir.y += (Math.random() - 0.5) * spread;
        dir.z += (Math.random() - 0.5) * spread;
        dir.normalize();
        const projectile = new BaseProjectile({
            type: 'bullet',
            position: position.clone(),
            direction: dir,
            speed: 300,
            damage: this.damageAmount,
            scene: this.scene,
            ammoWorld: this.ammoWorld,
        });
        return projectile;
    }

    Reload() {
        // Simple reload logic
        this.ammoCount = WeaponConfigs.MachineGun.ammoCount;
    }
}

export default MachineGun;

// Cannon.js
import BaseWeapon from './BaseWeapon.js';
import WeaponConfigs from './WeaponConfig.js';
import BaseProjectile from './Projectile.js';
import * as THREE from 'three';

class Cannon extends BaseWeapon {
    constructor(options) {
        super(WeaponConfigs.Cannon);
        this.scene = options.scene;
        this.ammoWorld = options.ammoWorld;
    }

    /**
     * Fire a shell with a slight arc (ballistic trajectory).
     * @param {THREE.Vector3} position
     * @param {THREE.Vector3} direction
     */
    Fire(position, direction) {
        if (!this.canFire()) return null;
        this.lastFired = performance.now() / 1000;
        this.ammoCount--;
        // --- Heat/Overheat logic ---
        if (this.maxHeat > 0) {
            this.heat += this.heatPerShot;
            if (this.heat >= this.maxHeat) {
                this.overheated = true;
            }
        }
        // Add a slight upward arc
        const dir = direction.clone();
        dir.y += 0.05;
        dir.normalize();
        const projectile = new BaseProjectile({
            type: 'shell',
            position: position.clone(),
            direction: dir,
            speed: 180,
            damage: this.damageAmount,
            scene: this.scene,
            ammoWorld: this.ammoWorld,
        });
        return projectile;
    }

    Reload() {
        this.ammoCount = WeaponConfigs.Cannon.ammoCount;
    }
}

export default Cannon;

// IRMissile and RadarMissile from Missile.js
import { IRMissile, RadarMissile } from './Missile.js';
// No default export for Missile; use IRMissile and RadarMissile instead.

// RocketPod.js
import BaseWeapon from './BaseWeapon.js';
import WeaponConfigs from './WeaponConfig.js';
import BaseProjectile from './Projectile.js';
import * as THREE from 'three';

class RocketPod extends BaseWeapon {
    constructor(options) {
        super(WeaponConfigs.RocketPod);
        this.scene = options.scene;
        this.ammoWorld = options.ammoWorld;
    }

    /**
     * Fire multiple unguided rockets in a spread pattern.
     * @param {THREE.Vector3} position
     * @param {THREE.Vector3} direction
     */
    Fire(position, direction) {
        if (!this.canFire()) return [];
        this.lastFired = performance.now() / 1000;
        this.ammoCount--;
        // Fire 3 rockets with spread
        const projectiles = [];
        for (let i = -1; i <= 1; i++) {
            const dir = direction.clone();
            dir.x += i * 0.03;
            dir.normalize();
            projectiles.push(new BaseProjectile({
                type: 'rocket',
                position: position.clone(),
                direction: dir,
                speed: 200,
                damage: this.damageAmount,
                scene: this.scene,
                ammoWorld: this.ammoWorld,
            }));
        }
        return projectiles;
    }

    Reload() {
        this.ammoCount = WeaponConfigs.RocketPod.ammoCount;
    }
}

export default RocketPod;
