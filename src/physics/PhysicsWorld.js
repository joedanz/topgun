// src/physics/PhysicsWorld.js
import Ammo from 'ammo.js';

let physicsWorldSingleton = null;
let ammoPromise = null;

/**
 * Initializes Ammo.js and the physics world singleton for flight simulation.
 * @returns {Promise<{ world: Ammo.btDiscreteDynamicsWorld, Ammo: any }>}
 */
export function getPhysicsWorld() {
  if (physicsWorldSingleton) {
    return Promise.resolve(physicsWorldSingleton);
  }
  if (!ammoPromise) {
    ammoPromise = Ammo();
  }

  return ammoPromise.then((AmmoLib) => {
    // Collision configuration contains default setup for memory, collision setup
    const collisionConfiguration = new AmmoLib.btDefaultCollisionConfiguration();
    const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new AmmoLib.btDbvtBroadphase();
    const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
    const softBodySolver = new AmmoLib.btDefaultSoftBodySolver();

    // Create the world with lower gravity for flight simulation
    const dynamicsWorld = new AmmoLib.btSoftRigidDynamicsWorld(
      dispatcher,
      broadphase,
      solver,
      collisionConfiguration,
      softBodySolver
    );
    // Lower gravity than Earth for flight (e.g., -4.9 m/s^2)
    dynamicsWorld.setGravity(new AmmoLib.btVector3(0, -4.9, 0));

    physicsWorldSingleton = { world: dynamicsWorld, Ammo: AmmoLib };
    return physicsWorldSingleton;
  });
}
