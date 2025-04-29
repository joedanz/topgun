// src/three/CameraController.js
// Advanced camera controller for aircraft, supporting multiple view modes and effects
import * as THREE from 'three';

export default class CameraController {
  /**
   * @param {THREE.Camera} camera
   * @param {Aircraft} target
   * @param {Object} [options]
   *   options.offsets: { [mode: string]: THREE.Vector3 }
   *   options.smooth: number (0-1, default: 0.1)
   */
  constructor(camera, target, options = {}) {
    this.camera = camera;
    this.target = target;
    this.offsets = options.offsets || {
      chase: new THREE.Vector3(0, 5, 15),
      cockpit: new THREE.Vector3(0, 2, 0.5),
      external: new THREE.Vector3(20, 15, 30),
    };
    this.smooth = typeof options.smooth === 'number' ? options.smooth : 0.1;
    this.mode = 'chase';
    this.desiredPosition = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();
    this.shakeIntensity = 0;
    this.shakeDecay = 0.95;
  }

  /**
   * Set camera mode (chase, cockpit, external, etc.)
   */
  setMode(mode) {
    if (this.offsets[mode]) this.mode = mode;
  }

  /**
   * Add camera shake (e.g., on damage or high-G)
   * @param {number} intensity
   */
  addShake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  /**
   * Call each frame to update camera position and effects
   */
  update() {
    // Calculate offset in aircraft's local space
    this.tmpQuat.copy(this.target.getRotation());
    const offset = this.offsets[this.mode] || this.offsets['chase'];
    const localOffset = offset.clone().applyQuaternion(this.tmpQuat);
    this.desiredPosition.copy(this.target.getPosition()).add(localOffset);
    // Camera shake
    let shake = new THREE.Vector3();
    if (this.shakeIntensity > 0.001) {
      shake.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
      this.shakeIntensity *= this.shakeDecay;
    }
    // Smoothly interpolate camera position
    this.camera.position.lerp(this.desiredPosition.clone().add(shake), this.smooth);
    // Look at the aircraft
    this.camera.lookAt(this.target.getPosition());
  }

  /**
   * Set offset for a specific mode
   */
  setOffset(mode, offset) {
    this.offsets[mode] = offset.clone();
  }

  /**
   * Set smoothing factor
   */
  setSmooth(smooth) {
    this.smooth = smooth;
  }
}
