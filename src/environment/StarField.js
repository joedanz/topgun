// StarField.js - Procedural star field for night sky
import * as THREE from 'three';

export default class StarField {
  constructor({
    radius = 6000,
    numStars = 1500,
    color = 0xffffff,
    size = 1.2
  } = {}) {
    // Generate random star positions on a sphere
    const positions = new Float32Array(numStars * 3);
    for (let i = 0; i < numStars; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.0, // Fade in at night
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = -2; // Behind skydome
  }

  updatePosition(camera) {
    this.points.position.copy(camera.position);
  }

  setOpacity(opacity) {
    this.points.material.opacity = opacity;
  }

  getMesh() {
    return this.points;
  }
}
