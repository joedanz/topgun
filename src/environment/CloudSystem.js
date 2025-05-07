// CloudSystem.js - Billboard cloud and weather system
import * as THREE from 'three';

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default class CloudSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.clouds = [];
    this.numClouds = options.numClouds || 24;
    this.cloudMeshes = [];
    this.cloudTexture = options.cloudTexture || null; // Optionally provide a texture
    this.cloudColor = options.cloudColor || 0xffffff;
    this.cloudOpacity = options.cloudOpacity || 0.7;
    this.cloudHeight = options.cloudHeight || 600;
    this.cloudSpread = options.cloudSpread || 2200;
    this.cloudScale = options.cloudScale || [180, 320];
    this.windSpeed = options.windSpeed || 30;
    this._createClouds();
  }

  _createClouds() {
    const geometry = new THREE.PlaneGeometry(1, 1);
    let material;
    if (this.cloudTexture) {
      material = new THREE.MeshLambertMaterial({
        map: this.cloudTexture,
        color: this.cloudColor,
        transparent: true,
        opacity: this.cloudOpacity,
        depthWrite: false
      });
    } else {
      material = new THREE.MeshLambertMaterial({
        color: this.cloudColor,
        transparent: true,
        opacity: this.cloudOpacity,
        depthWrite: false
      });
    }
    for (let i = 0; i < this.numClouds; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      const x = randomBetween(-this.cloudSpread, this.cloudSpread);
      const z = randomBetween(-this.cloudSpread, this.cloudSpread);
      const y = this.cloudHeight + randomBetween(-80, 80);
      mesh.position.set(x, y, z);
      const scale = randomBetween(this.cloudScale[0], this.cloudScale[1]);
      mesh.scale.set(scale, scale * randomBetween(0.4, 0.7), 1);
      mesh.rotation.y = randomBetween(0, Math.PI * 2);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.cloudMeshes.push(mesh);
    }
  }

  animateClouds(delta, windDir = 1) {
    for (const mesh of this.cloudMeshes) {
      mesh.position.x += delta * this.windSpeed * windDir;
      // Wrap clouds around the scene
      if (mesh.position.x > this.cloudSpread) mesh.position.x = -this.cloudSpread;
      if (mesh.position.x < -this.cloudSpread) mesh.position.x = this.cloudSpread;
    }
  }

  setOpacity(opacity) {
    for (const mesh of this.cloudMeshes) {
      mesh.material.opacity = opacity;
    }
  }

  setColor(color) {
    for (const mesh of this.cloudMeshes) {
      mesh.material.color.set(color);
    }
  }

  // For weather: fade in/out, change color, density, etc.
  setWeather({ density = 1, color = null, opacity = null } = {}) {
    this.setOpacity(opacity !== null ? opacity : this.cloudOpacity * density);
    if (color) this.setColor(color);
  }
}
