// CelestialBody.js - Simple sun or moon mesh for sky rendering
import * as THREE from 'three';

export default class CelestialBody {
  constructor({
    radius = 80,
    color = 0xffffcc,
    intensity = 1.0,
    distance = 4800,
    opacity = 1.0
  } = {}) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    // If color is moon blue, use a shader for phases
    if (color === 0xbbccff) {
      const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      const fragmentShader = `
        varying vec2 vUv;
        uniform float phase; // 0=new, 0.5=full, 1=new
        uniform vec3 color;
        uniform float opacity;
        void main() {
          float angle = (vUv.x - 0.5) * 3.14159;
          float mask = 0.5 + 0.5 * cos(angle - 3.14159 * (phase));
          float d = distance(vUv, vec2(0.5));
          float alpha = smoothstep(0.5, 0.48, d) * mask * opacity;
          gl_FragColor = vec4(color, alpha);
        }
      `;
      const material = new THREE.ShaderMaterial({
        uniforms: {
          phase: { value: 0.5 }, // full moon by default
          color: { value: new THREE.Color(color) },
          opacity: { value: opacity }
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false
      });
      this.mesh = new THREE.Mesh(geometry, material);
      this._isMoon = true;
    } else {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false
      });
      this.mesh = new THREE.Mesh(geometry, material);
      this._isMoon = false;
    }
    this.mesh.frustumCulled = false;
    this.distance = distance;
    this.intensity = intensity;
  }

  // Position body in sky dome based on azimuth/elevation
  setPosition(camera, azimuth, elevation) {
    // azimuth: 0 = north, PI/2 = east, PI = south, 3PI/2 = west
    // elevation: 0 = horizon, PI/2 = zenith
    const r = this.distance;
    const x = r * Math.cos(elevation) * Math.sin(azimuth);
    const y = r * Math.sin(elevation);
    const z = r * Math.cos(elevation) * Math.cos(azimuth);
    this.mesh.position.copy(camera.position).add(new THREE.Vector3(x, y, z));
  }

  setOpacity(opacity) {
    this.mesh.material.opacity = opacity;
  }

  getMesh() {
    return this.mesh;
  }
}
