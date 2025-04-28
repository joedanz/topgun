// src/weapons/hitDetection.js
import * as THREE from 'three';
import { createExplosion } from './weaponEffects';

/**
 * Checks for collisions between projectiles and targets (enemies/objects).
 * @param {Array} projectiles
 * @param {Array} targets - Each must have {position: THREE.Vector3, radius, health, resistances}
 * @param {THREE.Scene} scene
 * @returns {Array} hits - [{ projectile, target, damage }]
 */
export function checkProjectileHits(projectiles, targets, scene) {
  const hits = [];
  for (const proj of projectiles) {
    if (!proj.alive) continue;
    for (const target of targets) {
      const dist = proj.position.distanceTo(target.position);
      const hitRadius = (proj.type === 'bomb') ? (target.radius + 6) : (target.radius + 2);
      if (dist < hitRadius) {
        // Calculate damage
        let damage = proj.damage;
        // Apply resistances (optional)
        if (target.resistances && target.resistances[proj.type]) {
          damage *= (1 - target.resistances[proj.type]);
        }
        // Apply hit location modifier (optional)
        // e.g., if (target.isCriticalHit(proj.position)) damage *= 2;
        hits.push({ projectile: proj, target, damage });
        proj.destroy();
        // Visual feedback
        createExplosion(scene, proj.position);
        break;
      }
    }
  }
  return hits;
}

/**
 * Applies damage to a target and returns if destroyed.
 * @param {object} target
 * @param {number} damage
 * @returns {boolean} true if destroyed
 */
export function applyDamage(target, damage) {
  target.health -= damage;
  return target.health <= 0;
}
