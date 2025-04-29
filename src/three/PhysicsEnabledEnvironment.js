// src/three/PhysicsEnabledEnvironment.js
// Extends ThreeEnvironment to synchronize physics and rendering
import ThreeEnvironment from './ThreeEnvironment';
import { PhysicsLoop } from '../physics/PhysicsLoop';

export default class PhysicsEnabledEnvironment extends ThreeEnvironment {
  constructor(container) {
    super(container);
    this.physicsLoop = new PhysicsLoop();
    this.physicsReady = false;
    this._physicsInitPromise = this.physicsLoop.init().then(() => {
      this.physicsReady = true;
    });
  }

  /**
   * Register a mesh and its Ammo.js rigidBody for physics sync
   */
  registerPhysicsBody(mesh, rigidBody) {
    if (!this.physicsReady) {
      this._physicsInitPromise.then(() => {
        this.physicsLoop.registerBody(mesh, rigidBody);
      });
    } else {
      this.physicsLoop.registerBody(mesh, rigidBody);
    }
    this.scene.add(mesh);
  }

  /**
   * Start both render and physics loops
   */
  start() {
    this.startAnimation();
    this.physicsLoop.start();
  }

  /**
   * Stop both render and physics loops
   */
  stop() {
    this.stopAnimation();
    this.physicsLoop.stop();
  }

  /**
   * Dispose of all resources
   */
  dispose() {
    super.dispose();
    this.physicsLoop.stop();
    // TODO: Remove rigid bodies from Ammo world if needed
  }
}
