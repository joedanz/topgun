// src/aircraft/AircraftPhysics.js
// Connects Aircraft class with Ammo.js physics for realistic simulation
import * as THREE from 'three';
import { threeVectorToAmmo, threeQuatToAmmo, ammoVectorToThree, ammoQuatToThree } from '../physics/PhysicsUtils';

/**
 * AircraftPhysics binds an Aircraft instance to its Ammo.js rigid body
 * Handles force/torque application and bidirectional sync
 */
export default class AircraftPhysics {
  /**
   * @param {Aircraft} aircraft
   * @param {Ammo} AmmoLib
   * @param {Ammo.btDiscreteDynamicsWorld} world
   * @param {Object} [options]
   *   options.shape: Ammo.btCollisionShape (default: box)
   *   options.initialPosition: THREE.Vector3
   *   options.initialRotation: THREE.Quaternion
   *   options.mass: number (kg)
   */
  constructor(aircraft, AmmoLib, world, options = {}) {
    this.aircraft = aircraft;
    this.Ammo = AmmoLib;
    this.world = world;
    this.mass = options.mass || aircraft.getMass();
    this.shape = options.shape || new AmmoLib.btBoxShape(new AmmoLib.btVector3(5, 1, 5)); // default box

    // Initial transform
    const pos = options.initialPosition || aircraft.getPosition();
    const rot = options.initialRotation || aircraft.getRotation();
    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin(threeVectorToAmmo(pos, AmmoLib));
    transform.setRotation(threeQuatToAmmo(rot, AmmoLib));

    // Motion state and inertia
    const motionState = new AmmoLib.btDefaultMotionState(transform);
    const localInertia = new AmmoLib.btVector3(0, 0, 0);
    this.shape.calculateLocalInertia(this.mass, localInertia);

    // Rigid body construction
    const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(this.mass, motionState, this.shape, localInertia);
    this.rigidBody = new AmmoLib.btRigidBody(rbInfo);
    this.rigidBody.setActivationState(4); // Disable deactivation

    // Add to world
    world.addRigidBody(this.rigidBody);
  }

  /** Syncs Aircraft properties from Ammo.js rigid body (after physics step) */
  syncFromPhysics() {
    const ms = this.rigidBody.getMotionState();
    if (ms) {
      const tmpTrans = new this.Ammo.btTransform();
      ms.getWorldTransform(tmpTrans);
      const pos = ammoVectorToThree(tmpTrans.getOrigin());
      const rot = ammoQuatToThree(tmpTrans.getRotation());
      this.aircraft.setPosition(pos);
      this.aircraft.setRotation(rot);
      this.Ammo.destroy(tmpTrans);
    }
    // Velocity
    const lv = this.rigidBody.getLinearVelocity();
    const av = this.rigidBody.getAngularVelocity();
    this.aircraft.setVelocity(ammoVectorToThree(lv));
    // Optionally: store angular velocity if needed
  }

  /** Syncs Aircraft properties to Ammo.js rigid body (before physics step) */
  syncToPhysics() {
    const ms = this.rigidBody.getMotionState();
    if (ms) {
      const tmpTrans = new this.Ammo.btTransform();
      ms.getWorldTransform(tmpTrans);
      tmpTrans.setOrigin(threeVectorToAmmo(this.aircraft.getPosition(), this.Ammo));
      tmpTrans.setRotation(threeQuatToAmmo(this.aircraft.getRotation(), this.Ammo));
      ms.setWorldTransform(tmpTrans);
      this.rigidBody.setMotionState(ms);
      this.Ammo.destroy(tmpTrans);
    }
    // Set velocity
    this.rigidBody.setLinearVelocity(threeVectorToAmmo(this.aircraft.getVelocity(), this.Ammo));
    // Optionally: set angular velocity if needed
  }

  /**
   * Apply forces/torques from aircraft control to the rigid body
   * Call this after Aircraft control methods are used
   */
  applyForcesAndTorques() {
    // Example: apply thrust as force
    // (Extend to include lift, drag, etc.)
    const thrust = this.aircraft.acceleration.clone().multiplyScalar(this.mass); // F = ma
    this.rigidBody.applyCentralForce(threeVectorToAmmo(thrust, this.Ammo));
    // Reset aircraft acceleration after applying
    this.aircraft.setAcceleration(new THREE.Vector3(0, 0, 0));
  }

  /** Remove rigid body from world and clean up */
  dispose() {
    this.world.removeRigidBody(this.rigidBody);
    this.Ammo.destroy(this.rigidBody);
    if (this.shape) this.Ammo.destroy(this.shape);
  }
}
