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
