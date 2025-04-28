// src/weapons/weaponEffects.js
import * as THREE from 'three';

/**
 * Creates a muzzle flash effect at the given position.
 */
export function createMuzzleFlash(scene, position) {
  const geometry = new THREE.ConeGeometry(1.5, 5, 10);
  const material = new THREE.MeshBasicMaterial({ color: 0xffee88 });
  const flash = new THREE.Mesh(geometry, material);
  flash.position.copy(position);
  flash.rotation.x = Math.PI / 2;
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 80);
}

/**
 * Creates an explosion effect at the given position.
 */
export function createExplosion(scene, position) {
  const geometry = new THREE.SphereGeometry(4, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff9933, transparent: true, opacity: 0.7 });
  const explosion = new THREE.Mesh(geometry, material);
  explosion.position.copy(position);
  scene.add(explosion);
  // Animate fade out
  let t = 0;
  function animate() {
    t += 0.06;
    explosion.scale.setScalar(1 + t * 2);
    explosion.material.opacity = 0.7 * (1 - t * 0.7);
    if (t < 1) requestAnimationFrame(animate);
    else scene.remove(explosion);
  }
  animate();
}

/**
 * Plays weapon audio cues (stub; integrate with audio system).
 */
export function playWeaponSound(type) {
  // TODO: Integrate with your audio system
  // type: 'machinegun', 'missile', 'bomb', 'explosion'
}
