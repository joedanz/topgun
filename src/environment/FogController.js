// FogController.js - Controls dynamic fog and atmospheric effects
import * as THREE from 'three';

export default class FogController {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.fogColor = options.fogColor || 0xc8e0ff;
    this.baseDensity = options.baseDensity || 0.003;
    this.heightFalloff = options.heightFalloff || 0.015;
    this.weatherDensity = 0; // Additional fog density from weather
    this.maxDistance = options.maxDistance || 4000;
    this.fog = new THREE.FogExp2(this.fogColor, this.baseDensity);
    this.scene.fog = this.fog;
    this.transitionTarget = this.baseDensity;
    this.transitionSpeed = 0.0005;
  }

  // Set fog density for weather changes (smooth transition)
  setFogDensity(targetDensity) {
    this.transitionTarget = targetDensity;
  }

  // Call every frame to update fog
  update(camera, weather = {}) {
    // Smooth transition to target density
    if (Math.abs(this.fog.density - this.transitionTarget) > 1e-5) {
      this.fog.density += Math.sign(this.transitionTarget - this.fog.density) * this.transitionSpeed;
    } else {
      this.fog.density = this.transitionTarget;
    }
    // Height-based falloff (less fog at higher altitudes)
    const camY = camera.position.y;
    let density = this.baseDensity * Math.exp(-this.heightFalloff * camY);
    density += this.weatherDensity;
    this.fog.density = density;
    // Change fog color for sunrise/sunset or weather
    if (weather.sunset) {
      this.fog.color.set(0xffb080);
    } else if (weather.storm) {
      this.fog.color.set(0x8899aa);
    } else {
      this.fog.color.set(this.fogColor);
    }
  }
}
