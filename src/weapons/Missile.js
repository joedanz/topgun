// Missile.js
// Guided missile base class and IR/Radar variants
import BaseWeapon from './BaseWeapon.js';
import WeaponConfigs from './WeaponConfig.js';
import BaseProjectile from './Projectile.js';
import * as THREE from 'three';
import Countermeasure from './Countermeasure';

export class BaseMissile extends BaseWeapon {
  constructor(options) {
    super(WeaponConfigs.Missile);
    this.scene = options.scene;
    this.ammoWorld = options.ammoWorld;
    this.target = null;
    this.guidanceType = 'dumb'; // 'ir', 'radar', or 'dumb'
    this.locked = false;
    this.turnRate = 1.2; // radians/sec
    this.speed = 220; // m/s
  }

  acquireTarget(target) {
    this.target = target;
    this.locked = !!target;
  }

  hasLock() {
    return this.locked && this.target;
  }

  Fire(position, direction) {
    if (!this.canFire()) return null;
    this.lastFired = performance.now() / 1000;
    this.ammoCount--;
    // Spawn missile projectile
    const projectile = new MissileProjectile({
      type: 'missile',
      position: position.clone(),
      direction: direction.clone(),
      speed: this.speed,
      damage: this.damageAmount,
      scene: this.scene,
      ammoWorld: this.ammoWorld,
      target: this.target,
      guidanceType: this.guidanceType,
      turnRate: this.turnRate,
    });
    return projectile;
  }
}

export class IRMissile extends BaseMissile {
  constructor(options) {
    super(options);
    this.guidanceType = 'ir';
    this.name = 'IR Missile';
  }
}

export class RadarMissile extends BaseMissile {
  constructor(options) {
    super(options);
    this.guidanceType = 'radar';
    this.name = 'Radar Missile';
  }
}

// MissileProjectile handles in-flight guidance
export class MissileProjectile extends BaseProjectile {
  constructor(options) {
    super(options);
    this.target = options.target;
    this.guidanceType = options.guidanceType;
    this.turnRate = options.turnRate;
    this.seekerCone = Math.PI / 3; // 60 deg
    this.locked = !!this.target;
  }

  /**
   * Update missile guidance, check for countermeasures
   * @param {number} deltaTime
   * @param {Array} potentialTargets - Aircraft and/or countermeasures in scene
   */
  update(deltaTime, potentialTargets = []) {
    if (!this.alive) return;
    // --- Countermeasure detection ---
    // Find best countermeasure in range/cone
    let distracted = false;
    let bestCM = null;
    let bestCMScore = 0;
    for (const obj of potentialTargets) {
      if (!(obj instanceof Countermeasure)) continue;
      if (!obj.active) continue;
      // Match type: IR missiles -> flare, radar -> chaff
      if ((this.guidanceType === 'ir' && obj.type !== 'flare') ||
          (this.guidanceType === 'radar' && obj.type !== 'chaff')) continue;
      // Check range (e.g., 20m) and cone (e.g., 45deg)
      const toCM = obj.position.clone().sub(this.position);
      const dist = toCM.length();
      if (dist > 20) continue;
      const angle = toCM.normalize().angleTo(this.direction);
      if (angle > Math.PI / 4) continue;
      // Score: closer and more centered is better
      const score = (20 - dist) + (Math.PI / 4 - angle) * 10;
      if (score > bestCMScore) {
        bestCM = obj;
        bestCMScore = score;
      }
    }
    if (bestCM && Math.random() < 0.85) { // 85% chance to be distracted
      // Retarget to countermeasure
      this.target = bestCM;
      this.locked = true;
      distracted = true;
    }

    // Guidance logic
    if (this.target && this.locked) {
      const toTarget = this.target.getPosition().clone().sub(this.position);
      const distance = toTarget.length();
      toTarget.normalize();
      // Check if target is within seeker cone
      const angle = toTarget.angleTo(this.direction);
      if (angle < this.seekerCone) {
        // Steer towards target
        const maxTurn = this.turnRate * deltaTime;
        this.direction.lerp(toTarget, Math.min(1, maxTurn / angle));
        this.direction.normalize();
      } else {
        // Lost lock
        this.locked = false;
      }
    }
    // Move
    const move = this.direction.clone().multiplyScalar(this.speed * deltaTime);
    this.position.add(move);
    this.mesh.position.copy(this.position);
    // TODO: Proximity fuse, detonation, countermeasure logic
  }
}

export default { BaseMissile, IRMissile, RadarMissile, MissileProjectile };
