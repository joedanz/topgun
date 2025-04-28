// src/weapons/targeting.js
import * as THREE from 'three';

/**
 * Finds the closest lockable enemy target within a given angle and range.
 * @param {THREE.Vector3} playerPos
 * @param {THREE.Vector3} playerDir (normalized)
 * @param {Array<{position: THREE.Vector3, lockable: boolean}>} enemies
 * @param {number} maxRange
 * @param {number} maxAngle (radians)
 * @returns {object|null} Target object or null if none found
 */
export function findLockOnTarget(playerPos, playerDir, enemies, maxRange = 800, maxAngle = Math.PI/6) {
  let best = null;
  let bestScore = Infinity;
  for (const enemy of enemies) {
    if (!enemy.lockable) continue;
    const toEnemy = enemy.position.clone().sub(playerPos);
    const dist = toEnemy.length();
    if (dist > maxRange) continue;
    const dir = toEnemy.clone().normalize();
    const angle = playerDir.angleTo(dir);
    if (angle > maxAngle) continue;
    // Score: prioritize closer & more centered
    const score = dist + angle * 300;
    if (score < bestScore) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Draws a 2D lock-on reticle on a canvas overlay at the projected screen position.
 * @param {THREE.Vector3} worldPos
 * @param {THREE.Camera} camera
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} locked
 */
export function drawLockOnReticle(worldPos, camera, canvas, locked = false) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const width = canvas.width, height = canvas.height;
  // Project world position to screen
  const pos = worldPos.clone().project(camera);
  const x = (pos.x * 0.5 + 0.5) * width;
  const y = (-pos.y * 0.5 + 0.5) * height;
  ctx.save();
  ctx.strokeStyle = locked ? '#ff3333' : '#ffff00';
  ctx.lineWidth = locked ? 4 : 2;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(x, y, locked ? 32 : 26, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, locked ? 20 : 16, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

/**
 * Plays a lock-on audio cue (stub; integrate with audio system).
 */
export function playLockOnSound(locked) {
  // TODO: Integrate with your audio system
  if (locked) {
    // play locked-on sound
  } else {
    // play lock-on searching sound
  }
}
