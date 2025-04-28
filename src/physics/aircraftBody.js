// src/physics/aircraftBody.js
import * as Ammo from 'ammo.js';
import { getPhysicsWorld } from './physicsWorld';

export class AircraftBody {
  constructor({ mass = 1000, width = 10, length = 15, height = 3, position = { x: 0, y: 100, z: 0 } }) {
    this.mass = mass;
    this.width = width;
    this.length = length;
    this.height = height;
    this.position = position;
    this.body = null;
    this.createRigidBody();
  }

  createRigidBody() {
    // Compound shape for fuselage (box) + wings (box)
    const compoundShape = new Ammo.btCompoundShape();
    // Fuselage
    const fuselageShape = new Ammo.btBoxShape(new Ammo.btVector3(this.length / 2, this.height / 2, this.width / 4));
    const fuselageTransform = new Ammo.btTransform();
    fuselageTransform.setIdentity();
    fuselageTransform.setOrigin(new Ammo.btVector3(0, 0, 0));
    compoundShape.addChildShape(fuselageTransform, fuselageShape);
    // Wings
    const wingShape = new Ammo.btBoxShape(new Ammo.btVector3(this.length / 4, this.height / 8, this.width / 2));
    const wingTransform = new Ammo.btTransform();
    wingTransform.setIdentity();
    wingTransform.setOrigin(new Ammo.btVector3(0, 0, 0));
    compoundShape.addChildShape(wingTransform, wingShape);

    // Calculate inertia
    const localInertia = new Ammo.btVector3(0, 0, 0);
    compoundShape.calculateLocalInertia(this.mass, localInertia);

    // Set initial transform
    const startTransform = new Ammo.btTransform();
    startTransform.setIdentity();
    startTransform.setOrigin(new Ammo.btVector3(this.position.x, this.position.y, this.position.z));

    // Motion state
    const motionState = new Ammo.btDefaultMotionState(startTransform);
    // Construction info
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(this.mass, motionState, compoundShape, localInertia);
    this.body = new Ammo.btRigidBody(rbInfo);
    // Add to physics world
    getPhysicsWorld().addRigidBody(this.body);
  }

  getAmmoBody() {
    return this.body;
  }

  // Clean up
  dispose() {
    if (this.body) {
      getPhysicsWorld().removeRigidBody(this.body);
      Ammo.destroy(this.body);
      this.body = null;
    }
  }
}
