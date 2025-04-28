// src/physics/physicsWorld.js
import * as Ammo from 'ammo.js';

let ammoInitialized = false;
let physicsWorld = null;

export async function initPhysicsWorld() {
  if (!ammoInitialized) {
    await Ammo();
    ammoInitialized = true;
  }

  // Collision configuration contains default setup for memory, collision setup. Advanced users can create their own configuration.
  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const overlappingPairCache = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();
  
  physicsWorld = new Ammo.btDiscreteDynamicsWorld(
    dispatcher,
    overlappingPairCache,
    solver,
    collisionConfiguration
  );

  // Standard Earth gravity
  physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));

  return physicsWorld;
}

export function getPhysicsWorld() {
  return physicsWorld;
}

// Utility for converting between Ammo.js and game world coordinates
export function ammoVectorToThree(v) {
  return { x: v.x(), y: v.y(), z: v.z() };
}

export function disposeAmmoObject(obj) {
  if (obj) {
    Ammo.destroy(obj);
  }
}
