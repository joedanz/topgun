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
  constructor({ type, mass, position, rotation, velocity, acceleration, weapons = [], health = 100 }) {
    this.type = type;
    this.mass = mass;
    this.position = position ? position.clone() : new THREE.Vector3();
    this.rotation = rotation ? rotation.clone() : new THREE.Quaternion();
    this.velocity = velocity ? velocity.clone() : new THREE.Vector3();
    this.acceleration = acceleration ? acceleration.clone() : new THREE.Vector3();
    // State: normal, damaged, destroyed
    this.state = 'normal';
    this.health = health;
    // --- Weapon System ---
    this.weapons = [];
    this.currentWeaponIndex = 0;
    if (weapons.length > 0) this.equipWeapons(weapons);
  }

  /**
   * Take damage and update state using DamageSystem
   * @param {number} amount
   * @param {object} [options]
   * @returns {object} result { destroyed, remaining }
   */
  takeDamage(amount, options = {}) {
    const { applyDamage } = require('../systems/DamageSystem');
    return applyDamage(this, amount, options);
  }

  /**
   * Reset health/state for respawn or testing
   * @param {number} [full]
   */
  resetHealth(full = 100) {
    const { resetHealth } = require('../systems/DamageSystem');
    resetHealth(this, full);
  }

  /**
   * Optional: called when damaged (not destroyed)
   */
  onDamaged(options) {
    // Add smoke effect (simple Three.js sphere with opacity animation)
    if (this.scene && this.position) {
      const smokeGeo = new (require('three').SphereGeometry)(1, 8, 8);
      const smokeMat = new (require('three').MeshBasicMaterial)({ color: 0x555555, transparent: true, opacity: 0.6 });
      const smoke = new (require('three').Mesh)(smokeGeo, smokeMat);
      smoke.position.copy(this.position);
      this.scene.add(smoke);
      // Fade out and remove after 2s
      setTimeout(() => { this.scene.remove(smoke); }, 2000);
    }
    // Play damage sound
    const audio = new Audio('/sounds/damage.mp3');
    audio.volume = 0.5;
    audio.play();
    // Trigger HUD overlay and camera shake if this is the player
    if (typeof window !== 'undefined' && window.playerAircraft === this && typeof window.triggerPlayerDamageFlash === 'function') {
      window.triggerPlayerDamageFlash();
      // Controller vibration
      import('../utils/GamepadVibration').then(({ vibrateGamepads }) => {
        vibrateGamepads(180, 0.85, 0.5);
      });
    }
  }

  /**
   * Optional: called when destroyed
   */
  onDestroyed(options) {
    // Add explosion effect (Three.js sphere burst)
    if (this.scene && this.position) {
      const expGeo = new (require('three').SphereGeometry)(2, 12, 12);
      const expMat = new (require('three').MeshBasicMaterial)({ color: 0xffaa00, transparent: true, opacity: 0.8 });
      const explosion = new (require('three').Mesh)(expGeo, expMat);
      explosion.position.copy(this.position);
      this.scene.add(explosion);
      setTimeout(() => { this.scene.remove(explosion); }, 1000);
    }
    // Play explosion sound
    const audio = new Audio('/sounds/explosion.mp3');
    audio.volume = 0.9;
    audio.play();
    // Optionally, disable controls or trigger game over logic here
  }

  /**
   * Equip a list of weapon instances.
   * @param {Array} weaponList
   */
  equipWeapons(weaponList) {
    this.weapons = weaponList;
    this.currentWeaponIndex = 0;
  }

  /**
   * Switch weapon by index or by direction (+1/-1 for next/prev)
   * @param {number} [indexOrDelta]
   */
  switchWeapon(indexOrDelta) {
    if (this.weapons.length === 0) return;
    if (typeof indexOrDelta === 'number') {
      if (Number.isInteger(indexOrDelta) && Math.abs(indexOrDelta) === 1) {
        // Delta: next/prev
        this.currentWeaponIndex = (this.currentWeaponIndex + indexOrDelta + this.weapons.length) % this.weapons.length;
      } else if (indexOrDelta >= 0 && indexOrDelta < this.weapons.length) {
        // Direct index
        this.currentWeaponIndex = indexOrDelta;
      }
    }
  }

  /**
   * Fire the current weapon. Returns projectile(s) or null if cannot fire.
   */
  fireWeapon() {
    if (this.weapons.length === 0) return null;
    const weapon = this.weapons[this.currentWeaponIndex];
    // Aircraft's forward direction (Z negative in Three.js)
    const position = this.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation).normalize();
    // Some weapons (e.g., missile) may require a target; handle externally if needed
    return weapon.Fire(position, forward);
  }

  /**
   * Reload the current weapon.
   */
  reloadWeapon() {
    if (this.weapons.length === 0) return;
    const weapon = this.weapons[this.currentWeaponIndex];
    weapon.Reload();
  }

  /**
   * Get the current weapon instance.
   */
  getCurrentWeapon() {
    if (this.weapons.length === 0) return null;
    return this.weapons[this.currentWeaponIndex];
  }

  /**
   * Get current weapon's ammo count.
   */
  getCurrentWeaponAmmo() {
    const weapon = this.getCurrentWeapon();
    return weapon ? weapon.ammoCount : 0;
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

