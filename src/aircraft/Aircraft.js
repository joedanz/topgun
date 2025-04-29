// src/aircraft/Aircraft.js
// Core Aircraft class for flight simulation
import * as THREE from 'three';

/**
 * Aircraft base class
 * Manages position, rotation, velocity, acceleration, mass, and aircraft type
 * Includes basic update method for simulation
 */
export default class Aircraft {
  /**
   * @param {Object} config
   * @param {string} config.type - Aircraft type name
   * @param {number} config.mass - Aircraft mass (kg)
   * @param {THREE.Vector3} [config.position]
   * @param {THREE.Quaternion} [config.rotation]
   * @param {THREE.Vector3} [config.velocity]
   * @param {THREE.Vector3} [config.acceleration]
   */
  constructor({ type, mass, position, rotation, velocity, acceleration }) {
    this.type = type;
    this.mass = mass;
    this.position = position ? position.clone() : new THREE.Vector3();
    this.rotation = rotation ? rotation.clone() : new THREE.Quaternion();
    this.velocity = velocity ? velocity.clone() : new THREE.Vector3();
    this.acceleration = acceleration ? acceleration.clone() : new THREE.Vector3();
    // State: normal, damaged, destroyed
    this.state = 'normal';
  }

  // --- Getters & Setters ---
  getPosition() { return this.position.clone(); }
  setPosition(v) { this.position.copy(v); }

  getRotation() { return this.rotation.clone(); }
  setRotation(q) { this.rotation.copy(q); }

  getVelocity() { return this.velocity.clone(); }
  setVelocity(v) { this.velocity.copy(v); }

  getAcceleration() { return this.acceleration.clone(); }
  setAcceleration(a) { this.acceleration.copy(a); }

  getMass() { return this.mass; }
  setMass(m) { this.mass = m; }

  getType() { return this.type; }
  setType(t) { this.type = t; }

  getState() { return this.state; }
  setState(s) { this.state = s; }

  /**
   * Apply thrust along the aircraft's forward direction.
   * @param {number} amount - Thrust force (N)
   */
  applyThrust(amount) {
    if (this.state !== 'normal') return;
    // Forward direction in local space (Z negative in Three.js)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation);
    // F = ma => a = F/m
    const accel = forward.multiplyScalar(amount / this.mass);
    this.acceleration.add(accel);
  }

  /**
   * Apply roll (rotation around forward axis)
   * @param {number} amount - Roll rate (radians/sec)
   */
  applyRoll(amount) {
    if (this.state !== 'normal') return;
    // Roll: rotate around local Z axis
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0, 0, -1), amount);
    this.rotation.multiply(q);
  }

  /**
   * Apply pitch (rotation around right axis)
   * @param {number} amount - Pitch rate (radians/sec)
   */
  applyPitch(amount) {
    if (this.state !== 'normal') return;
    // Pitch: rotate around local X axis
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), amount);
    this.rotation.multiply(q);
  }

  /**
   * Apply yaw (rotation around up axis)
   * @param {number} amount - Yaw rate (radians/sec)
   */
  applyYaw(amount) {
    if (this.state !== 'normal') return;
    // Yaw: rotate around local Y axis
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), amount);
    this.rotation.multiply(q);
  }

  /**
   * Example: apply control surface (e.g., flaps, rudder)
   * @param {string} surface - Name of control surface
   * @param {number} value - Effect magnitude
   */
  applyControlSurface(surface, value) {
    // Extend for flaps, rudder, ailerons, etc.
    // For now, just log (to be implemented in subclasses)
    // console.log(`Control surface ${surface}: ${value}`);
  }

  /**
   * Basic update method (to be called each frame)
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Simple physics integration (Euler)
    this.velocity.addScaledVector(this.acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);
    // Reset acceleration (forces applied externally)
    this.acceleration.set(0, 0, 0);
  }
}

