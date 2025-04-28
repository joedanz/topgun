// src/physics/collisionUtils.js
import * as Ammo from 'ammo.js';
import { getPhysicsWorld } from './physicsWorld';

/**
 * Polls for collisions between all rigid bodies in the world.
 * Calls onCollision callback with (bodyA, bodyB) if a collision is detected.
 */
export function pollCollisions(onCollision) {
  const world = getPhysicsWorld();
  const numManifolds = world.getDispatcher().getNumManifolds();
  for (let i = 0; i < numManifolds; i++) {
    const contactManifold = world.getDispatcher().getManifoldByIndexInternal(i);
    const numContacts = contactManifold.getNumContacts();
    if (numContacts > 0) {
      const bodyA = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
      const bodyB = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);
      onCollision(bodyA, bodyB, contactManifold);
    }
  }
}

/**
 * Example usage:
 * pollCollisions((bodyA, bodyB, manifold) => {
 *   // handle collision response or damage here
 * });
 */
