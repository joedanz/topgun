// ProjectileEffects.js
// Utility functions for visual and audio projectile effects (muzzle flashes, trails, impacts)
import * as THREE from 'three';

/**
 * Spawns a muzzle flash at the given position and direction.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} position
 * @param {THREE.Vector3} direction
 * @param {string} type - 'bullet' | 'shell' | 'missile' | 'rocket'
 */
/**
 * Spawns a muzzle flash at the given position and direction, using muzzle_flash.png if available.
 * Plays firing sound.
 */
export function spawnMuzzleFlash(scene, position, direction, type = 'bullet') {
  // Use texture if available
  const loader = new THREE.TextureLoader();
  loader.load('/textures/muzzle_flash.png', texture => {
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff, transparent: true, opacity: 0.92 });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(0.7, 0.7, 0.7);
    scene.add(sprite);
    setTimeout(() => scene.remove(sprite), 80);
  }, undefined, () => {
    // Fallback: colored cone
    const color = type === 'missile' ? 0xffe066 : 0xfff2b2;
    const geometry = new THREE.ConeGeometry(0.12, 0.4, 12);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
    const flash = new THREE.Mesh(geometry, material);
    flash.position.copy(position);
    flash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    scene.add(flash);
    setTimeout(() => scene.remove(flash), 80);
  });

  // Play firing sound
  let sound;
  switch(type) {
    case 'missile': sound = '/sounds/missile_launch.mp3'; break;
    case 'rocket': sound = '/sounds/rocket_fire.mp3'; break;
    case 'shell': sound = '/sounds/cannon_fire.mp3'; break;
    case 'bullet': default: sound = '/sounds/gun_fire.mp3'; break;
  }
  if (sound) {
    const audio = new Audio(sound);
    audio.volume = 0.6;
    audio.play();
  }
}

/**
 * Creates a simple smoke/tracer trail for a projectile.
 * @param {THREE.Scene} scene
 * @param {THREE.Mesh} mesh - projectile mesh
 * @param {string} type
 */
export function attachProjectileTrail(scene, mesh, type = 'bullet') {
  const color = type === 'missile' ? 0xffffff : 0xcccccc;
  const geometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 });
  const trail = new THREE.Mesh(geometry, material);
  trail.position.copy(mesh.position);
  scene.add(trail);
  // Animate trail fade and follow
  let alive = true;
  function animateTrail() {
    if (!alive) return;
    trail.position.copy(mesh.position);
    material.opacity *= 0.93;
    if (material.opacity < 0.03) {
      scene.remove(trail);
      alive = false;
      return;
    }
    requestAnimationFrame(animateTrail);
  }
  animateTrail();
  // Remove on projectile destroy
  mesh.onDestroy = () => { alive = false; scene.remove(trail); };

  // Play projectile flight sound (missile/rocket only)
  let sound;
  switch(type) {
    case 'missile': sound = '/sounds/missile_flight.mp3'; break;
    case 'rocket': sound = '/sounds/rocket_flight.mp3'; break;
    // Bullets: optional whiz
    case 'bullet': sound = '/sounds/bullet_whiz.mp3'; break;
  }
  if (sound) {
    const audio = new Audio(sound);
    audio.volume = 0.45;
    audio.play();
  }
}

/**
 * Spawns an impact effect (explosion/sparks) at the given position.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} position
 * @param {string} type
 */
export function spawnImpactEffect(scene, position, type = 'bullet') {
  // Simple: sphere for explosion, small for sparks
  const color = type === 'missile' ? 0xff6600 : 0xffee88;
  const geometry = new THREE.SphereGeometry(type === 'missile' ? 0.7 : 0.2, 10, 10);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const effect = new THREE.Mesh(geometry, material);
  effect.position.copy(position);
  scene.add(effect);
  // Animate fade/expand
  let scale = 1;
  function animate() {
    scale *= 1.13;
    effect.scale.set(scale, scale, scale);
    material.opacity *= 0.85;
    if (material.opacity < 0.05) {
      scene.remove(effect);
      return;
    }
    requestAnimationFrame(animate);
  }
  animate();

  // Play impact sound
  let sound;
  switch(type) {
    case 'missile': sound = '/sounds/explosion_large.mp3'; break;
    case 'rocket': sound = '/sounds/explosion_small.mp3'; break;
    case 'shell': sound = '/sounds/bullet_impact.mp3'; break;
    case 'bullet': default: sound = '/sounds/bullet_impact.mp3'; break;
  }
  if (sound) {
    const audio = new Audio(sound);
    audio.volume = 0.6;
    audio.play();
  }
}
