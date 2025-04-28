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
