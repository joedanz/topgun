// DamageSystem.js
// Centralized system for applying and handling damage, effects, and feedback in the game.
// Integrates with weapons, projectiles, and aircraft.

/**
 * Apply damage to a target (e.g., Aircraft).
 * Handles state transitions (damaged/destroyed), triggers effects, and returns result.
 * @param {object} target - The object to damage (must have health/state fields)
 * @param {number} amount - Amount of damage to apply
 * @param {object} [options] - Extra info (e.g., source, hit location)
 * @returns {object} - { destroyed: boolean, remaining: number }
 */
/**
 * Apply damage to a target with advanced calculation: hit location, distance, armor.
 * @param {object} target - The object to damage (must have health/state fields)
 * @param {number} baseAmount - Base damage
 * @param {object} [options] - { source, hitLocation, distance, armor, projectile }
 * @returns {object} - { destroyed: boolean, remaining: number, finalDamage: number, crit: boolean }
 */
export function applyDamage(target, baseAmount, options = {}) {
  if (typeof target.health !== 'number') return { destroyed: false, remaining: 0, finalDamage: 0 };
  if (target.state === 'destroyed') return { destroyed: true, remaining: 0, finalDamage: 0 };

  // --- Advanced damage calculation ---
  let damage = baseAmount;
  let crit = false;

  // Hit location multiplier
  if (options.hitLocation) {
    // Example: cockpit/engine = 2x, wings = 1.25x, body = 1x
    const loc = options.hitLocation;
    if (loc === 'cockpit' || loc === 'engine') {
      damage *= 2.0;
      crit = true;
    } else if (loc === 'wing') {
      damage *= 1.25;
    } // else body/other = 1x
  }

  // Distance-based falloff (linear for demo)
  if (typeof options.distance === 'number' && options.distance > 50) {
    // Falloff starts at 50 units, 0.5x at 500 units+
    const d = Math.max(0, Math.min(1, (options.distance - 50) / 450));
    damage *= (1 - 0.5 * d); // 1.0 to 0.5 multiplier
  }

  // Armor reduction
  if (typeof options.armor === 'number' && options.armor > 0) {
    // Simple: flat reduction, min 10% damage
    damage = Math.max(damage - options.armor, damage * 0.1);
  }

  damage = Math.max(0, Math.round(damage));
  target.health = Math.max(0, target.health - damage);

  if (target.health === 0) {
    target.state = 'destroyed';
    if (typeof target.onDestroyed === 'function') target.onDestroyed(options);
    return { destroyed: true, remaining: 0, finalDamage: damage, crit };
  } else if (target.health < 40 && target.state !== 'damaged') {
    target.state = 'damaged';
    if (typeof target.onDamaged === 'function') target.onDamaged(options);
  }
  return { destroyed: false, remaining: target.health, finalDamage: damage, crit };
}


/**
 * Utility to reset health/state for respawn or testing.
 */
export function resetHealth(target, full = 100) {
  target.health = full;
  target.state = 'normal';
}
