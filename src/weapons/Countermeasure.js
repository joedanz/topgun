// Countermeasure.js
// Defines Countermeasure class for flares and chaff
import * as THREE from 'three';

/**
 * Countermeasure (Flare or Chaff)
 * @param {Object} options
 * @param {string} options.type - 'flare' | 'chaff'
 * @param {THREE.Vector3} options.position - World position
 * @param {THREE.Vector3} [options.velocity] - Ejection velocity
 * @param {number} [options.lifetime] - Duration in seconds
 * @param {Aircraft} [options.owner] - Aircraft that deployed this
 */
export default class Countermeasure {
  constructor({ type, position, velocity = new THREE.Vector3(), lifetime = 3.0, owner = null }) {
    this.type = type; // 'flare' or 'chaff'
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.lifetime = lifetime;
    this.age = 0;
    this.active = true;
    this.owner = owner;
    // Visual representation (optional)
    this.mesh = this._createMesh();
    if (this.mesh) this.mesh.position.copy(this.position);
  }

  _createMesh() {
    // Simple sphere for flare, box for chaff
    if (this.type === 'flare') {
      return new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, emissive: 0xff6600, transparent: true, opacity: 0.9 })
      );
    } else if (this.type === 'chaff') {
      return new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.15, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.7 })
      );
    }
    return null;
  }

  /**
   * Update position and age. Call every frame.
   * @param {number} dt
   */
  update(dt) {
    if (!this.active) return;
    this.position.addScaledVector(this.velocity, dt);
    if (this.mesh) this.mesh.position.copy(this.position);
    this.age += dt;
    if (this.age >= this.lifetime) {
      this.active = false;
      if (this.mesh && this.mesh.parent) {
        this.mesh.parent.remove(this.mesh);
      }
    }
  }
}
