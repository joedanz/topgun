// src/weapons/projectile.js
import * as THREE from 'three';

/**
 * Base projectile class. Extend for bullets, missiles, bombs.
 */
export class Projectile {
  constructor({ type, position, velocity, damage, owner, scene, mesh }) {
    this.type = type;
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.damage = damage;
    this.owner = owner;
    this.scene = scene;
    this.mesh = mesh || this.createMesh();
    this.alive = true;
    this.age = 0;
    if (scene && this.mesh) scene.add(this.mesh);
  }

  createMesh() {
    // Default: small sphere
    const geometry = new THREE.SphereGeometry(0.7, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffee00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.position);
    return mesh;
  }

  update(dt) {
    if (!this.alive) return;
    this.position.addScaledVector(this.velocity, dt);
    if (this.mesh) this.mesh.position.copy(this.position);
    this.age += dt;
  }

  destroy() {
    this.alive = false;
    if (this.scene && this.mesh) this.scene.remove(this.mesh);
  }
}

/**
 * Bullet: fast, linear trajectory
 */
export class Bullet extends Projectile {
  constructor(opts) {
    super({ ...opts, type: 'bullet' });
    if (this.mesh) this.mesh.material.color.set(0xffff66);
  }
  update(dt) {
    super.update(dt);
    // Optionally: add tracer, fade, or remove after max range
    if (this.age > 2.5) this.destroy();
  }
}

/**
 * Bomb: parabolic trajectory (gravity)
 */
export class Bomb extends Projectile {
  constructor(opts) {
    super({ ...opts, type: 'bomb' });
    if (this.mesh) this.mesh.material.color.set(0xff3333);
    this.gravity = new THREE.Vector3(0, -9.8, 0);
  }
  update(dt) {
    if (!this.alive) return;
    this.velocity.addScaledVector(this.gravity, dt);
    super.update(dt);
    if (this.position.y < 0) this.destroy(); // Hit ground
  }
}

/**
 * Missile: guided, seeks target
 */
export class Missile extends Projectile {
  constructor(opts) {
    super({ ...opts, type: 'missile' });
    if (this.mesh) this.mesh.material.color.set(0x33ccff);
    this.target = opts.target;
    this.turnRate = opts.turnRate || 2.5; // radians/sec
    this.speed = this.velocity.length();
  }
  update(dt) {
    if (!this.alive) return;
    if (this.target && this.target.position) {
      // Seek target
      const toTarget = this.target.position.clone().sub(this.position).normalize();
      const currentDir = this.velocity.clone().normalize();
      const angle = currentDir.angleTo(toTarget);
      if (angle > 0.01) {
        // Limit turn rate
        const axis = currentDir.clone().cross(toTarget).normalize();
        const maxTurn = this.turnRate * dt;
        const turn = Math.min(angle, maxTurn);
        const q = new THREE.Quaternion().setFromAxisAngle(axis, turn);
        this.velocity.applyQuaternion(q);
        this.velocity.setLength(this.speed);
      }
    }
    super.update(dt);
    if (this.age > 10) this.destroy();
  }
}
