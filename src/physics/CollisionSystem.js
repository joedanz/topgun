// src/physics/CollisionSystem.js
// Implements collision detection, callbacks, and filtering for aircraft simulation

/**
 * CollisionSystem manages collision groups, masks, and callbacks for Ammo.js
 * Usage:
 *   const cs = new CollisionSystem(Ammo, world);
 *   cs.addCollisionGroup('AIRCRAFT');
 *   cs.setCollisionMask('AIRCRAFT', ['GROUND', 'OBSTACLE']);
 *   cs.registerCallback('AIRCRAFT', 'GROUND', (event) => { ... });
 *   cs.processCollisions(); // Call after each physics step
 */
export class CollisionSystem {
  constructor(Ammo, world) {
    this.Ammo = Ammo;
    this.world = world;
    this.collisionGroups = {};
    this.collisionMasks = {};
    this.callbacks = {};
    this.groupCounter = 1;
  }

  addCollisionGroup(name) {
    if (!(name in this.collisionGroups)) {
      this.collisionGroups[name] = 1 << this.groupCounter++;
    }
    return this.collisionGroups[name];
  }

  setCollisionMask(groupName, maskNames) {
    this.collisionMasks[groupName] = maskNames.map(n => this.collisionGroups[n] || 0).reduce((a, b) => a | b, 0);
  }

  registerCallback(groupA, groupB, callback) {
    const key = `${groupA}|${groupB}`;
    this.callbacks[key] = callback;
  }

  // Call after each physics step
  processCollisions() {
    const numManifolds = this.world.getDispatcher().getNumManifolds();
    for (let i = 0; i < numManifolds; i++) {
      const manifold = this.world.getDispatcher().getManifoldByIndexInternal(i);
      const body0 = manifold.getBody0();
      const body1 = manifold.getBody1();
      const groupA = body0.collisionGroupName;
      const groupB = body1.collisionGroupName;
      const keyAB = `${groupA}|${groupB}`;
      const keyBA = `${groupB}|${groupA}`;
      if ((keyAB in this.callbacks) || (keyBA in this.callbacks)) {
        const numContacts = manifold.getNumContacts();
        for (let j = 0; j < numContacts; j++) {
          const pt = manifold.getContactPoint(j);
          if (pt.getDistance() < 0) { // Contact!
            const event = {
              bodyA: body0,
              bodyB: body1,
              point: pt.getPositionWorldOnB(),
              normal: pt.getNormalWorldOnB(),
              distance: pt.getDistance(),
            };
            if (keyAB in this.callbacks) this.callbacks[keyAB](event);
            if (keyBA in this.callbacks) this.callbacks[keyBA](event);
          }
        }
      }
    }
  }
}
