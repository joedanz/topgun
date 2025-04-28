// src/graphics/environment.js
import * as THREE from 'three';

export function addBasicEnvironment(scene) {
  // Skybox (simple color or gradient)
  scene.background = new THREE.Color(0x87ceeb); // Sky blue

  // Ground plane
  const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
  const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22, side: THREE.DoubleSide });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Optional: simple directional light for better visuals
  const light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(100, 200, 100);
  scene.add(light);

  // Optional: ambient light
  const ambient = new THREE.AmbientLight(0xcccccc, 0.6);
  scene.add(ambient);
}
