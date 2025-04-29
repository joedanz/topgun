// src/three/FollowCamera.js
// Camera system that follows an Aircraft with offsets and smoothing
import * as THREE from 'three';

export default class FollowCamera {
  /**
   * @param {THREE.Camera} camera - The Three.js camera to control
   * @param {Aircraft} target - The aircraft instance to follow
   * @param {Object} [options]
   *   options.offset: THREE.Vector3 (default: (0, 5, 15))
   *   options.smooth: number (0-1, default: 0.1)
   */
  constructor(camera, target, options = {}) {
    this.camera = camera;
    this.target = target;
    this.offset = options.offset ? options.offset.clone() : new THREE.Vector3(0, 5, 15);
    this.smooth = typeof options.smooth === 'number' ? options.smooth : 0.1;
    this.desiredPosition = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();
  }

  /**
   * Call this once per frame to update camera position
   */
  update() {
    // Calculate offset in aircraft's local space
    this.tmpQuat.copy(this.target.getRotation());
    const localOffset = this.offset.clone().applyQuaternion(this.tmpQuat);
    this.desiredPosition.copy(this.target.getPosition()).add(localOffset);
    // Smoothly interpolate camera position
    this.camera.position.lerp(this.desiredPosition, this.smooth);
    // Look at the aircraft
    this.camera.lookAt(this.target.getPosition());
  }

  /**
   * Optionally set a new offset
   */
  setOffset(offset) {
    this.offset.copy(offset);
  }

  /**
   * Optionally set smoothing factor
   */
  setSmooth(smooth) {
    this.smooth = smooth;
  }
}
