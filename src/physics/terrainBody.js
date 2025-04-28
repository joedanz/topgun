// src/physics/terrainBody.js
import * as Ammo from 'ammo.js';
import { getPhysicsWorld } from './physicsWorld';

export class TerrainBody {
  constructor({ width = 1000, length = 1000, height = 10, position = { x: 0, y: 0, z: 0 } }) {
    this.width = width;
    this.length = length;
    this.height = height;
    this.position = position;
    this.body = null;
    this.createRigidBody();
  }

  createRigidBody() {
    // Simple box for flat terrain
    const shape = new Ammo.btBoxShape(new Ammo.btVector3(this.length / 2, this.height / 2, this.width / 2));
    const startTransform = new Ammo.btTransform();
    startTransform.setIdentity();
    startTransform.setOrigin(new Ammo.btVector3(this.position.x, this.position.y - this.height / 2, this.position.z));
    const motionState = new Ammo.btDefaultMotionState(startTransform);
    // Mass = 0 for static body
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, new Ammo.btVector3(0, 0, 0));
    this.body = new Ammo.btRigidBody(rbInfo);
    getPhysicsWorld().addRigidBody(this.body);
  }

  getAmmoBody() {
    return this.body;
  }

  dispose() {
    if (this.body) {
      getPhysicsWorld().removeRigidBody(this.body);
      Ammo.destroy(this.body);
      this.body = null;
    }
  }
}
