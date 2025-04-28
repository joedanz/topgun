// src/graphics/cameraControls.js
import * as THREE from 'three';

/**
 * Camera controls that follow a target (e.g., aircraft) with smooth interpolation.
 * @param {THREE.Camera} camera
 * @param {THREE.Object3D} target
 * @param {Object} options - { distance, height, lerp }
 */
export function followTarget(camera, target, options = {}) {
  const {
    distance = 40,
    height = 12,
    lerp = 0.1,
  } = options;

  // Calculate desired camera position behind and above the target
  const targetWorldPos = new THREE.Vector3();
  target.getWorldPosition(targetWorldPos);

  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(target.quaternion);
  const desiredPos = targetWorldPos.clone()
    .add(forward.clone().multiplyScalar(-distance))
    .add(new THREE.Vector3(0, height, 0));

  // Smoothly interpolate camera position
  camera.position.lerp(desiredPos, lerp);
  camera.lookAt(targetWorldPos);
}

/**
 * Detects device capabilities and returns a quality profile.
 * @returns {Object} - { isMobile, maxTextureSize, antialias, shadowQuality }
 */
export function detectDeviceCapabilities() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const maxTextureSize = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 2048;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  return {
    isMobile,
    maxTextureSize,
    antialias: !isMobile,
    shadowQuality: isMobile ? 'low' : 'high',
  };
}
