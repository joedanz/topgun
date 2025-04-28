// src/weapons/baseWeapon.js
/**
 * Base class for all weapons.
 */
export class BaseWeapon {
  constructor({ name, fireRate, damage, ammo, projectileType }) {
    this.name = name;
    this.fireRate = fireRate; // rounds/sec
    this.damage = damage;
    this.ammo = ammo;
    this.projectileType = projectileType;
    this.lastFired = 0;
  }

  canFire(now) {
    return (now - this.lastFired) > (1000 / this.fireRate) && this.ammo > 0;
  }

  fire(now) {
    if (!this.canFire(now)) return false;
    this.lastFired = now;
    this.ammo--;
    return true;
  }
}

// src/weapons/machineGun.js
import { BaseWeapon } from './baseWeapon';

export class MachineGun extends BaseWeapon {
  constructor() {
    super({
      name: 'Machine Gun',
      fireRate: 12, // rounds/sec
      damage: 8,
      ammo: 500,
      projectileType: 'bullet',
    });
    this.burst = 1;
  }
}

// src/weapons/missileLauncher.js
import { BaseWeapon } from './baseWeapon';

export class MissileLauncher extends BaseWeapon {
  constructor() {
    super({
      name: 'Missile Launcher',
      fireRate: 0.7, // launches/sec
      damage: 90,
      ammo: 4,
      projectileType: 'missile',
    });
    this.lockOnRequired = true;
  }
}

// src/weapons/bombBay.js
import { BaseWeapon } from './baseWeapon';

export class BombBay extends BaseWeapon {
  constructor() {
    super({
      name: 'Bomb Bay',
      fireRate: 0.5, // drops/sec
      damage: 120,
      ammo: 2,
      projectileType: 'bomb',
    });
    this.areaOfEffect = 18;
  }
}
