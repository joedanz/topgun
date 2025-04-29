// src/physics/PhysicsLoop.js
// Implements a fixed timestep physics simulation loop and syncs Three.js objects
import { getPhysicsWorld } from './PhysicsWorld';
import { setThreeObjectFromAmmoTransform, setAmmoTransformFromThreeObject } from './PhysicsUtils';

/**
 * PhysicsLoop manages the Ammo.js simulation step and syncing Three.js meshes.
 * Usage:
 *   const loop = new PhysicsLoop();
 *   loop.registerBody(mesh, rigidBody);
 *   loop.start();
 *   // On dispose: loop.stop();
 */
export class PhysicsLoop {
  constructor({ timeStep = 1 / 60, maxSubSteps = 3 } = {}) {
    this.timeStep = timeStep;
    this.maxSubSteps = maxSubSteps;
    this.accumulator = 0;
    this.lastTime = null;
    this.running = false;
    this._animationId = null;
    this.bodies = []; // { mesh, rigidBody }
    this.world = null;
    this.Ammo = null;
  }

  async init() {
    const { world, Ammo } = await getPhysicsWorld();
    this.world = world;
    this.Ammo = Ammo;
  }

  registerBody(mesh, rigidBody) {
    this.bodies.push({ mesh, rigidBody });
    if (this.world) {
      this.world.addRigidBody(rigidBody);
    }
  }

  unregisterBody(rigidBody) {
    this.bodies = this.bodies.filter(b => b.rigidBody !== rigidBody);
    if (this.world) {
      this.world.removeRigidBody(rigidBody);
    }
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this._loop();
    }
  }

  stop() {
    this.running = false;
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  _loop = () => {
    if (!this.running) return;
    const now = performance.now();
    let delta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.accumulator += delta;
    if (this.accumulator > 1) this.accumulator = this.timeStep; // Clamp on pause
    if (this.world) {
      while (this.accumulator >= this.timeStep) {
        this.world.stepSimulation(this.timeStep, this.maxSubSteps);
        this.accumulator -= this.timeStep;
      }
      // Sync Three.js meshes with Ammo bodies
      for (const { mesh, rigidBody } of this.bodies) {
        const motionState = rigidBody.getMotionState();
        if (motionState) {
          const tmpTrans = new this.Ammo.btTransform();
          motionState.getWorldTransform(tmpTrans);
          setThreeObjectFromAmmoTransform(mesh, tmpTrans);
          this.Ammo.destroy(tmpTrans);
        }
      }
    }
    this._animationId = requestAnimationFrame(this._loop);
  }
}
