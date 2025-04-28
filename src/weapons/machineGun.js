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
