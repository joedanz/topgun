// src/weapons/weaponManager.js
import { MachineGun } from './machineGun';
import { MissileLauncher } from './missileLauncher';
import { BombBay } from './bombBay';

/**
 * Handles weapon firing, cooldowns, and ammo tracking for the player.
 */
export class WeaponManager {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.weapons = [new MachineGun(), new MissileLauncher(), new BombBay()];
    this.activeIndex = 0;
    this.projectiles = [];
  }

  get activeWeapon() {
    return this.weapons[this.activeIndex];
  }

  switchWeapon(index) {
    if (index >= 0 && index < this.weapons.length) {
      this.activeIndex = index;
    }
  }

  fire(now, opts = {}) {
    const weapon = this.activeWeapon;
    if (!weapon.canFire(now)) return null;
    weapon.fire(now);
    // Create projectile based on weapon type
    let projectile = null;
    if (weapon.projectileType === 'bullet') {
      const { Bullet } = require('./projectile');
      projectile = new Bullet({
        position: opts.position,
        velocity: opts.velocity,
        damage: weapon.damage,
        owner: this.owner,
        scene: this.scene,
      });
    } else if (weapon.projectileType === 'missile') {
      const { Missile } = require('./projectile');
      projectile = new Missile({
        position: opts.position,
        velocity: opts.velocity,
        damage: weapon.damage,
        owner: this.owner,
        scene: this.scene,
        target: opts.target,
      });
    } else if (weapon.projectileType === 'bomb') {
      const { Bomb } = require('./projectile');
      projectile = new Bomb({
        position: opts.position,
        velocity: opts.velocity,
        damage: weapon.damage,
        owner: this.owner,
        scene: this.scene,
      });
    }
    if (projectile) this.projectiles.push(projectile);
    return projectile;
  }

  update(dt) {
    // Update all projectiles
    this.projectiles = this.projectiles.filter(p => {
      if (p.alive) p.update(dt);
      return p.alive;
    });
  }

  getAmmo() {
    return this.activeWeapon.ammo;
  }

  getCooldown(now) {
    const weapon = this.activeWeapon;
    return Math.max(0, (1000 / weapon.fireRate) - (now - weapon.lastFired));
  }
}
