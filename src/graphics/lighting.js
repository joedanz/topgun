// src/graphics/lighting.js
import * as THREE from 'three';

/**
 * Adds advanced, configurable lighting to the scene.
 * @param {THREE.Scene} scene
 * @param {Object} options - { ambientIntensity, directionalIntensity, directionalColor, platform }
 * @returns {Object} - { ambient, directional, updateLighting }
 */
export function addLightingSystem(scene, options = {}) {
  const {
    ambientIntensity = 0.6,
    directionalIntensity = 1.0,
    directionalColor = 0xffffff,
    platform = 'desktop', // or 'mobile'
  } = options;

  // Ambient light
  const ambient = new THREE.AmbientLight(0xcccccc, ambientIntensity);
  scene.add(ambient);

  // Directional light (sun)
  const directional = new THREE.DirectionalLight(directionalColor, directionalIntensity);
  directional.position.set(100, 200, 100);
  directional.castShadow = platform === 'desktop';
  if (directional.castShadow) {
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 50;
    directional.shadow.camera.far = 500;
    directional.shadow.camera.left = -200;
    directional.shadow.camera.right = 200;
    directional.shadow.camera.top = 200;
    directional.shadow.camera.bottom = -200;
  }
  scene.add(directional);

  // Utility to update lighting parameters at runtime
  function updateLighting({ ambientIntensity, directionalIntensity, directionalColor }) {
    if (ambientIntensity !== undefined) ambient.intensity = ambientIntensity;
    if (directionalIntensity !== undefined) directional.intensity = directionalIntensity;
    if (directionalColor !== undefined) directional.color.set(directionalColor);
  }

  return { ambient, directional, updateLighting };
}
