// SkyDome.js - Basic procedural skydome with vertical gradient
import * as THREE from 'three';

const vertexShader = `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
varying vec3 vWorldPosition;
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;
void main() {
  float h = normalize(vWorldPosition + offset).y;
  float t = pow(max(h, 0.0), exponent);
  gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
}`;

export default class SkyDome {
  constructor({
    radius = 4000,
    topColor = new THREE.Color(0x87ceeb), // Sky blue
    bottomColor = new THREE.Color(0xffffff), // Horizon
    offset = 400,
    exponent = 1.2
  } = {}) {
    const geometry = new THREE.SphereGeometry(5000, 40, 24); // Reduced radius for better visibility
    geometry.scale(1, 0.5, 1); // Flatten to dome
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        topColor: { value: topColor },
        bottomColor: { value: bottomColor },
        offset: { value: offset },
        exponent: { value: exponent }
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false // Always render behind
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1; // Render behind everything
  }
  updatePosition(camera) {
    this.mesh.position.copy(camera.position);
  }
  getMesh() {
    return this.mesh;
  }
}

