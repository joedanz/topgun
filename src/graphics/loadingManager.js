// src/graphics/loadingManager.js
import * as THREE from 'three';

/**
 * Sets up a Three.js LoadingManager and displays progress in the DOM.
 * @param {function} onLoad - Called when all assets are loaded.
 * @returns {THREE.LoadingManager}
 */
export function createLoadingManager(onLoad) {
  const loadingElement = document.createElement('div');
  loadingElement.id = 'loading-progress';
  loadingElement.style.position = 'fixed';
  loadingElement.style.top = '50%';
  loadingElement.style.left = '50%';
  loadingElement.style.transform = 'translate(-50%, -50%)';
  loadingElement.style.background = 'rgba(0,0,0,0.8)';
  loadingElement.style.color = '#fff';
  loadingElement.style.padding = '20px 40px';
  loadingElement.style.borderRadius = '8px';
  loadingElement.style.fontSize = '1.2em';
  loadingElement.style.zIndex = '1000';
  loadingElement.innerText = 'Loading: 0%';
  document.body.appendChild(loadingElement);

  const manager = new THREE.LoadingManager();
  manager.onProgress = function (url, loaded, total) {
    loadingElement.innerText = `Loading: ${Math.round((loaded / total) * 100)}%`;
  };
  manager.onLoad = function () {
    loadingElement.innerText = 'Loading complete!';
    setTimeout(() => loadingElement.remove(), 600);
    if (onLoad) onLoad();
  };
  manager.onError = function (url) {
    loadingElement.innerText = `Error loading: ${url}`;
    loadingElement.style.background = 'rgba(128,0,0,0.8)';
  };
  return manager;
}

/**
 * Adds simple placeholder objects to the scene for early testing.
 */
export function addPlaceholderObjects(scene) {
  // Placeholder aircraft (red cube)
  const aircraft = new THREE.Mesh(
    new THREE.BoxGeometry(10, 3, 15),
    new THREE.MeshPhongMaterial({ color: 0xff3333 })
  );
  aircraft.position.set(0, 10, 0);
  scene.add(aircraft);

  // Placeholder enemy (blue sphere)
  const enemy = new THREE.Mesh(
    new THREE.SphereGeometry(5, 24, 24),
    new THREE.MeshPhongMaterial({ color: 0x3366ff })
  );
  enemy.position.set(30, 12, -40);
  scene.add(enemy);

  // Placeholder checkpoint (green torus)
  const checkpoint = new THREE.Mesh(
    new THREE.TorusGeometry(8, 1, 16, 100),
    new THREE.MeshPhongMaterial({ color: 0x33ff66 })
  );
  checkpoint.position.set(-40, 15, 60);
  scene.add(checkpoint);
}
