// src/aircraft/EnemyAircraft.js
// EnemyAircraft class extends Aircraft and integrates AI state machine
import Aircraft from './Aircraft';
import { StateMachine } from '../ai/StateMachine';
import { createEnemyAIStates } from '../ai/EnemyAIStates';
import * as THREE from 'three';

export default class EnemyAircraft extends Aircraft {
  constructor(config = {}) {
    super(config);
    this.isEnemy = true;
    this.stateDebug = 'patrol';
    this.patrolRoute = config.patrolRoute || [];
    this.currentWaypointIndex = 0;
    // --- Performance limits (AI fairness) ---
    this.maxSpeed = (config.maxSpeed !== undefined) ? config.maxSpeed : 1000; // units/sec
    this.maxAccel = (config.maxAccel !== undefined) ? config.maxAccel : 14000; // units/sec^2
    this.maxTurnRate = (config.maxTurnRate !== undefined) ? config.maxTurnRate : 90 * Math.PI / 180; // radians/sec
    // --- Detection parameters ---
    const aiCfg = config.aiConfig || {};
    this.detectionRange = aiCfg.detectionRange !== undefined ? aiCfg.detectionRange : 1400;
    this.fieldOfView = aiCfg.fieldOfView !== undefined ? aiCfg.fieldOfView : 80 * Math.PI / 180; // radians
    this.reactionTime = aiCfg.reactionTime !== undefined ? aiCfg.reactionTime : 0.6; // seconds
    this.detectionTimer = 0;
    this.detectingPlayer = false;
    // AI state machine
    this.stateMachine = new StateMachine(
      createEnemyAIStates(this, config.aiConfig || {}),
      'patrol',
      config.aiConfig || {}
    );
    // For evasion
    this.evasionActive = false;
    // --- Accuracy variation ---
    this.aimError = aiCfg.aimError !== undefined ? aiCfg.aimError : 0.05; // radians (default ~2.8 deg)
    // --- Predictive aiming parameters ---
    this.predictionAccuracy = aiCfg.predictionAccuracy !== undefined ? aiCfg.predictionAccuracy : 1.0; // 1.0 = perfect, 0 = max error
    this.aimSmoothing = aiCfg.aimSmoothing !== undefined ? aiCfg.aimSmoothing : 0.3; // 0 = no smoothing, 1 = very slow
    this._lastAimPoint = null;
  }

  update(dt, gameContext = {}) {
    // AI logic
    this.stateMachine.update(dt, gameContext);
    // Call base update for physics
    super.update(dt);
  }

  // --- AI Helper Methods (stubs, to be implemented or connected) ---
  setPatrolRoute(route, { randomize = false, perturb = false } = {}) {
    if (!route) {
      this.patrolRoute = [];
      this.currentWaypointIndex = 0;
      return;
    }
    let waypoints = route.map(wp => wp.clone());
    // Optional: randomize order
    if (randomize) {
      for (let i = waypoints.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [waypoints[i], waypoints[j]] = [waypoints[j], waypoints[i]];
      }
    }
    // Optional: perturb waypoints for unpredictability
    if (perturb) {
      waypoints = waypoints.map(wp => wp.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 120,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 120
      )));
    }
    this.patrolRoute = waypoints;
    this.currentWaypointIndex = 0;
  }

  getCurrentWaypoint() {
    if (!this.patrolRoute || this.patrolRoute.length === 0) return null;
    return this.patrolRoute[this.currentWaypointIndex];
  }

  advanceWaypoint() {
    if (!this.patrolRoute || this.patrolRoute.length === 0) return;
    this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.patrolRoute.length;
  }

  steerTowards(target, dt, aggressive = false, pursuitMode = 'lead') {
    // Predictive aiming with smoothing and accuracy scaling
    let aimPoint = null;
    let predictionAccuracy = (typeof this.predictionAccuracy === 'number') ? this.predictionAccuracy : 1.0;
    let smoothing = (typeof this.aimSmoothing === 'number') ? this.aimSmoothing : 0.3;
    if (target && target.position && target.velocity && this.getCurrentWeapon) {
      let projectileSpeed = 600;
      const weapon = this.getCurrentWeapon ? this.getCurrentWeapon() : null;
      if (weapon && weapon.projectileType && weapon.projectileType.speed) {
        projectileSpeed = weapon.projectileType.speed;
      } else if (weapon && weapon.speed) {
        projectileSpeed = weapon.speed;
      }
      // Optional: use target.acceleration if available
      const options = {
        pursuitMode,
        targetAccel: target.acceleration ? target.acceleration.clone() : null,
        predictionAccuracy
      };
      aimPoint = this.computeInterceptPoint(target.position, target.velocity, projectileSpeed, options);
    } else if (target && target.position) {
      aimPoint = target.position.clone();
    } else if (target instanceof THREE.Vector3) {
      aimPoint = target.clone();
    }
    if (!aimPoint) return;
    // Smoothing/interpolation to prevent jittery aiming
    if (!this._lastAimPoint) {
      this._lastAimPoint = this.position.clone().add(new THREE.Vector3(0, 0, -100));
    }
    this._lastAimPoint.lerp(aimPoint, smoothing);
    aimPoint = this._lastAimPoint.clone();
    // Calculate desired direction
    const toTarget = aimPoint.clone().sub(this.position);
    toTarget.y = aimPoint.y - this.position.y;
    const desiredDir = toTarget.clone().normalize();
    // Interpolate current forward to desired direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation);
    // Clamp turn rate (yaw/pitch/roll) per frame
    const maxTurn = this.maxTurnRate * (dt || 0.016);
    const angle = forward.angleTo(desiredDir);
    let t = aggressive ? 0.13 : 0.07;
    if (angle > maxTurn) {
      t = maxTurn / angle;
    }
    const lerped = forward.lerp(desiredDir, t).normalize();
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(forward, lerped);
    this.rotation.multiply(targetQuat);
    // Throttle up if far from target
    if (toTarget.length() > 200) this.applyThrust(aggressive ? this.maxAccel : this.maxAccel * 0.65);
    // Clamp speed after thrust
    if (this.getSpeed && this.getSpeed() > this.maxSpeed) {
      const v = this.velocity.clone().normalize().multiplyScalar(this.maxSpeed);
      this.velocity.copy(v);
    }
  }

  canSeePlayer() {
    // Placeholder: always true if player exists
    return typeof window !== 'undefined' && window.playerAircraft;
  }

  canDetectPlayer() {
    // Returns true if player is within FOV and range
    if (typeof window === 'undefined' || !window.playerAircraft) return false;
    return this.canDetectTarget(window.playerAircraft);
  }

  /**
   * Determines if the enemy can detect a given target based on distance, FOV, and optional line-of-sight (LOS) check.
   * @param {object} target - The target object (must have .position: THREE.Vector3)
   * @returns {boolean} True if target is detectable
   *
   * If this.sceneObstacles or window.sceneObstacles is defined as an array of THREE.Mesh or objects with geometry,
   * performs a raycast to ensure LOS is not blocked by obstacles (e.g., terrain, buildings).
   */
  canDetectTarget(target) {
    if (!target || !target.position) return false;
    const toTarget = target.position.clone().sub(this.position);
    const dist = toTarget.length();
    if (dist > this.detectionRange) return false;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation).normalize();
    const dirToTarget = toTarget.clone().normalize();
    const angle = Math.acos(forward.dot(dirToTarget));
    if (angle >= this.fieldOfView / 2) return false;

    // --- Optional: Line-of-sight (LOS) check using THREE.Raycaster ---
    let obstacles = this.sceneObstacles || (typeof window !== 'undefined' ? window.sceneObstacles : null);
    if (Array.isArray(obstacles) && obstacles.length > 0 && typeof THREE.Raycaster !== 'undefined') {
      const raycaster = new THREE.Raycaster(this.position, dirToTarget, 0.1, dist - 5); // 5m buffer
      const intersects = raycaster.intersectObjects(obstacles, true);
      if (intersects && intersects.length > 0) {
        // If the closest intersection is before the target, LOS is blocked
        if (intersects[0].distance < dist - 5) return false;
      }
    }
    return true;
  }

  /**
   * Selects the best target from a list using prioritization logic.
   * Prioritizes by: (1) player aircraft (if present), (2) angle to forward, (3) distance.
   * Extend as needed for health, threat, etc.
   * @param {Array} targets - Array of possible target aircraft
   * @returns {object|null} The selected target
   */
  acquireTarget(targets) {
    let best = null, bestScore = Infinity;
    if (!targets || !Array.isArray(targets)) return null;
    for (const t of targets) {
      if (!this.canDetectTarget(t)) continue;
      // --- Prioritization factors ---
      let score = 0;
      // Prefer player if present
      if (t.isPlayer || t === window.playerAircraft) score -= 1000;
      // Angle to forward (smaller angle = better)
      const toTarget = t.position.clone().sub(this.position).normalize();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, forward.dot(toTarget))));
      score += angle * 100; // 0 (ahead) to ~314 (behind)
      // Distance (closer = better)
      const dist = this.position.distanceTo(t.position);
      score += dist;
      // Optionally: lower health targets
      if (typeof t.health === 'number') score -= t.health * 0.5;
      // Optionally: prioritize locked-on or attacking targets
      // Extend here as needed
      if (score < bestScore) {
        best = t;
        bestScore = score;
      }
    }
    this.currentTarget = best;
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      if (best) {
        console.log(`[AI] ${this.id} acquired target: ${best.id || '[unknown]'} @ ${best.position ? best.position.toArray().map(x=>x.toFixed(1)).join(',') : '?'}`);
      } else {
        console.log(`[AI] ${this.id} found no valid targets.`);
      }
    }
    return best;
  }

  /**
   * Tactical engagement decision helper.
   * Returns an object describing the tactical situation for the current target.
   * Use in engage state to decide whether to attack, maneuver, or evade.
   */
  assessTacticalSituation() {
    if (!this.currentTarget || !this.currentTarget.position) return { canAttack: false };
    const toTarget = this.currentTarget.position.clone().sub(this.position);
    const dist = toTarget.length();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation).normalize();
    const dirToTarget = toTarget.clone().normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, forward.dot(dirToTarget))));

    // Tactical rules (adjust as needed)
    const canAttack = (dist < this.detectionRange * 0.7) && (angle < this.fieldOfView * 0.35);
    const needsManeuver = !canAttack && (angle < this.fieldOfView / 2);
    const isBehindTarget = (() => {
      if (!this.currentTarget.rotation) return false;
      const targetForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.currentTarget.rotation).normalize();
      const dot = dirToTarget.dot(targetForward);
      return dot > 0.5; // >0 = behind, 1 = directly behind
    })();
    return {
      canAttack,
      needsManeuver,
      isBehindTarget,
      dist,
      angle,
    };
  }

  updateDetection(dt) {
    if (this.canDetectPlayer()) {
      if (!this.detectingPlayer) {
        this.detectionTimer = 0;
        this.detectingPlayer = true;
      } else {
        this.detectionTimer += dt;
      }
    } else {
      this.resetDetection();
    }
  }

  resetDetection() {
    this.detectionTimer = 0;
    this.detectingPlayer = false;
  }

  distanceToPlayer() {
    if (typeof window !== 'undefined' && window.playerAircraft) {
      return this.position.distanceTo(window.playerAircraft.position);
    }
    return Infinity;
  }

  getPlayerPosition() {
    return typeof window !== 'undefined' && window.playerAircraft
      ? window.playerAircraft.position.clone()
      : new THREE.Vector3();
  }

  canFireAtPlayer() {
    // Placeholder: fire if within 1200m and generally facing player
    if (!this.canSeePlayer()) return false;
    const toPlayer = this.getPlayerPosition().sub(this.position).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation).normalize();
    return this.distanceToPlayer() < 1200 && forward.dot(toPlayer) > 0.85;
  }

  /**
   * Predicts the intercept point for a moving target, given projectile speed.
   * Supports lead or lag pursuit, and can optionally use target acceleration.
   * @param {THREE.Vector3} targetPos - Current position of the target.
   * @param {THREE.Vector3} targetVel - Current velocity of the target.
   * @param {number} projectileSpeed - Speed of the projectile (m/s)
   * @param {Object} [options] - { pursuitMode: 'lead'|'lag', targetAccel?: THREE.Vector3, predictionAccuracy?: number }
   * @returns {THREE.Vector3} The predicted intercept position.
   */
  computeInterceptPoint(targetPos, targetVel, projectileSpeed, options = {}) {
    const { pursuitMode = 'lead', targetAccel = null, predictionAccuracy = 1.0 } = options;
    // Relative position and velocity
    const shooterPos = this.position.clone();
    const shooterVel = this.velocity ? this.velocity.clone() : new THREE.Vector3();
    const relPos = targetPos.clone().sub(shooterPos);
    let relVel = targetVel.clone().sub(shooterVel);
    // Optionally use acceleration for prediction
    let t;
    if (targetAccel) {
      // Use a simple iterative approach for acceleration (not exact)
      // Estimate time to intercept using velocity only, then refine
      const projSpeedSq = projectileSpeed * projectileSpeed;
      const relSpeedSq = relVel.lengthSq();
      const a = relSpeedSq - projSpeedSq;
      const b = 2 * relPos.dot(relVel);
      const c = relPos.lengthSq();
      const discriminant = b * b - 4 * a * c;
      if (a === 0) {
        t = -c / b;
      } else if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b + sqrtDisc) / (2 * a);
        const t2 = (-b - sqrtDisc) / (2 * a);
        t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
      } else {
        t = 0;
      }
      t = Math.max(0, t || 0);
      // Refine using acceleration
      const accelTerm = targetAccel.clone().multiplyScalar(0.5 * t * t);
      relVel = relVel.clone().add(targetAccel.clone().multiplyScalar(t));
      return targetPos.clone().add(targetVel.clone().multiplyScalar(t)).add(accelTerm);
    } else {
      // Standard lead/lag prediction
      const projSpeedSq = projectileSpeed * projectileSpeed;
      const relSpeedSq = relVel.lengthSq();
      const a = relSpeedSq - projSpeedSq;
      const b = 2 * relPos.dot(relVel);
      const c = relPos.lengthSq();
      const discriminant = b * b - 4 * a * c;
      if (a === 0) {
        t = -c / b;
      } else if (discriminant >= 0) {
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b + sqrtDisc) / (2 * a);
        const t2 = (-b - sqrtDisc) / (2 * a);
        t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
      } else {
        t = 0;
      }
      t = Math.max(0, t || 0);
      let intercept;
      if (pursuitMode === 'lead') {
        intercept = targetPos.clone().add(relVel.clone().multiplyScalar(t));
      } else if (pursuitMode === 'lag') {
        // Lag pursuit: aim behind the target
        intercept = targetPos.clone().add(relVel.clone().multiplyScalar(Math.max(0, t - 0.5)));
      } else {
        intercept = targetPos.clone();
      }
      // Add accuracy/noise scaling
      if (predictionAccuracy < 1.0) {
        const noise = new THREE.Vector3(
          (Math.random() - 0.5) * (1 - predictionAccuracy) * 60,
          (Math.random() - 0.5) * (1 - predictionAccuracy) * 60,
          (Math.random() - 0.5) * (1 - predictionAccuracy) * 60
        );
        intercept.add(noise);
      }
      return intercept;
    }
  }

  /**
   * Enhanced: Selects the optimal weapon for the current target based on range, angle, ammo, cooldown, context, and fallback.
   * Sets this.currentWeaponIndex to the selected weapon, or falls back to any available weapon if none ideal.
   * @param {THREE.Vector3} intercept - Predicted intercept position for aiming.
   * @param {string} [engagementContext] - 'close', 'long', or 'any'. Optional, can be derived from tactical situation.
   * @returns {boolean} True if a weapon was selected, false otherwise.
   */
  selectWeaponForTarget(intercept, engagementContext = 'any') {
    if (!this.weapons || this.weapons.length === 0) return false;
    let bestIdx = -1;
    let bestScore = -Infinity;
    const toIntercept = intercept.clone().sub(this.position);
    const dist = toIntercept.length();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation).normalize();
    const dirToIntercept = toIntercept.clone().normalize();
    const angle = Math.acos(forward.dot(dirToIntercept));

    // First pass: strict constraint and context matching
    for (let i = 0; i < this.weapons.length; ++i) {
      const w = this.weapons[i];
      // --- Constraint checks ---
      // Range
      if (typeof w.range === 'number' && dist > w.range) continue;
      if (typeof w.minRange === 'number' && dist < w.minRange) continue;
      // Angle (lock/firing cone)
      const maxAngle = (typeof w.firingCone === 'number' ? w.firingCone : (20 * Math.PI / 180));
      if (angle > maxAngle) continue;
      // Ammo
      if (typeof w.ammoCount === 'number' && w.ammoCount <= 0) continue;
      // Cooldown/ready
      if (typeof w.isReady === 'function' && !w.isReady()) continue;
      if (typeof w.ready === 'boolean' && !w.ready) continue;
      if (typeof w.canFire === 'function' && !w.canFire()) continue;
      // Missile lock
      if (w.requiresLock && typeof w.hasLock === 'function' && !w.hasLock(this.currentTarget)) continue;
      // Arming constraint
      if (typeof w.isArmed === 'function' && !w.isArmed()) continue;
      // --- Engagement context preference ---
      let contextMatch = false;
      if (w.engagementContext === engagementContext || w.engagementContext === 'any' || engagementContext === 'any') {
        contextMatch = true;
      }
      // --- Scoring ---
      let score = 0;
      if (w.type === 'missile') {
        score += 20;
        if (dist > 700) score += 10;
      } else if (w.type === 'gun') {
        score += 10;
        if (dist < 400) score += 5;
      }
      // Prefer context match
      if (contextMatch) score += 8;
      // Prefer higher ammo
      if (typeof w.ammoCount === 'number') score += w.ammoCount;
      // Prefer ready weapons
      if (typeof w.isReady === 'function' && w.isReady()) score += 2;
      if (typeof w.ready === 'boolean' && w.ready) score += 2;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    // Fallback: select any available weapon with ammo and ready status, ignoring context
    if (bestIdx < 0) {
      for (let i = 0; i < this.weapons.length; ++i) {
        const w = this.weapons[i];
        if ((typeof w.ammoCount === 'number' && w.ammoCount <= 0)) continue;
        if (typeof w.isReady === 'function' && !w.isReady()) continue;
        if (typeof w.ready === 'boolean' && !w.ready) continue;
        if (typeof w.canFire === 'function' && !w.canFire()) continue;
        // Prefer higher ammo and ready
        let score = 0;
        if (typeof w.ammoCount === 'number') score += w.ammoCount;
        if (typeof w.isReady === 'function' && w.isReady()) score += 2;
        if (typeof w.ready === 'boolean' && w.ready) score += 2;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }
    if (bestIdx >= 0) {
      this.currentWeaponIndex = bestIdx;
      this.equippedWeapon = this.weapons[bestIdx];
      return true;
    }
    // No weapon available
    return false;
  }

  fireWeaponAtPlayer() {
    // Predictive targeting: aim at intercept point
    const player = window.playerAircraft;
    if (!player) return;
    // Use currently equipped weapon or fallback for projectile speed
    let projectileSpeed = 600;
    if (this.equippedWeapon && this.equippedWeapon.projectileType && this.equippedWeapon.projectileType.speed) {
      projectileSpeed = this.equippedWeapon.projectileType.speed;
    } else if (this.equippedWeapon && this.equippedWeapon.speed) {
      projectileSpeed = this.equippedWeapon.speed;
    }
    const targetPos = player.position.clone();
    const targetVel = player.velocity ? player.velocity.clone() : new THREE.Vector3();
    const intercept = this.computeInterceptPoint(targetPos, targetVel, projectileSpeed);
    // Select best weapon for this intercept
    if (!this.selectWeaponForTarget(intercept)) return; // No valid weapon
    // Recompute projectile speed for selected weapon
    const weapon = this.weapons[this.currentWeaponIndex];
    if (weapon && weapon.projectileType && weapon.projectileType.speed) {
      projectileSpeed = weapon.projectileType.speed;
    } else if (weapon && weapon.speed) {
      projectileSpeed = weapon.speed;
    }
    // Recompute intercept if weapon changed
    const newIntercept = this.computeInterceptPoint(targetPos, targetVel, projectileSpeed);
    // Inject aim error based on difficulty
    const aimError = this.aimError !== undefined ? this.aimError : 0.05;
    const toIntercept = newIntercept.clone().sub(this.position).normalize();
    const errorDir = aimError > 0 ? this.randomDirectionWithinCone(toIntercept, aimError) : toIntercept;
    const interceptWithError = this.position.clone().add(errorDir.multiplyScalar(newIntercept.clone().sub(this.position).length()));
    this.setLockedTarget(interceptWithError);

    // --- ENHANCED CONSTRAINTS ---
    // Range check
    const dist = newIntercept.clone().sub(this.position).length();
    if (typeof weapon.range === 'number' && dist > weapon.range) return;
    if (typeof weapon.minRange === 'number' && dist < weapon.minRange) return;
    // Ammo check
    if (typeof weapon.ammoCount === 'number' && weapon.ammoCount <= 0) return;
    // Cooldown check (canFire or isReady)
    if (weapon && ((typeof weapon.canFire === 'function' && !weapon.canFire()) || (typeof weapon.isReady === 'function' && !weapon.isReady()) || (typeof weapon.ready === 'boolean' && !weapon.ready))) {
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} cannot fire: weapon on cooldown.`);
      }
      return;
    }
    // Missile lock
    if (weapon && weapon.requiresLock && typeof weapon.hasLock === 'function' && !weapon.hasLock(this.currentTarget)) {
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} cannot fire: missile lock not acquired.`);
      }
      return;
    }
    // Arming
    if (weapon && typeof weapon.isArmed === 'function' && !weapon.isArmed()) {
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} cannot fire: weapon not armed.`);
      }
      return;
    }
    // --- HIT PROBABILITY THRESHOLD ---
    // Estimate hit probability based on aim error and difficulty
    let hitProbability = 1.0;
    if (typeof this.predictionAccuracy === 'number') {
      // Simple model: lower accuracy reduces hit probability
      hitProbability = this.predictionAccuracy;
    } else if (typeof aimError === 'number') {
      // Higher aim error = lower probability (roughly mapped)
      hitProbability = Math.max(0, 1.0 - (aimError / 0.3));
    }
    const minHitProbability = (typeof this.minHitProbability === 'number') ? this.minHitProbability : 0.45; // can be scaled by difficulty
    if (hitProbability < minHitProbability) {
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} will not fire: hit probability too low (${hitProbability.toFixed(2)}).`);
      }
      return;
    }
    // --- FIRE! ---
    this.fireWeapon();
    // --- UPDATE AMMO/COOLDOWN (if not handled by weapon itself) ---
    if (typeof weapon.ammoCount === 'number') {
      weapon.ammoCount = Math.max(0, weapon.ammoCount - 1);
    }
    if (typeof weapon.triggerCooldown === 'function') {
      weapon.triggerCooldown();
    }
  }

  isUnderAttack() {
    // --- Realistic threat detection ---
    // 1. Missile lock detection
    if (typeof window !== 'undefined' && window.sceneProjectiles) {
      for (const proj of window.sceneProjectiles) {
        // Check for missile projectiles with a target of this AI
        if (proj && proj.type === 'missile' && proj.target === this && proj.locked) {
          if (window.DEBUG_AI_STATE) {
            console.log(`[AI] ${this.id} is under missile lock!`);
          }
          return true;
        }
        // Check for any missile within 400m and approaching
        if (proj && proj.type === 'missile' && proj.position && proj.direction) {
          const toAI = this.position.clone().sub(proj.position);
          if (toAI.length() < 400 && toAI.normalize().dot(proj.direction) > 0.85) {
            if (window.DEBUG_AI_STATE) {
              console.log(`[AI] ${this.id} missile threat detected (proximity).`);
            }
            return true;
          }
        }
        // Check for bullets/shells within 150m and approaching
        if ((proj.type === 'bullet' || proj.type === 'shell') && proj.position && proj.direction) {
          const toAI = this.position.clone().sub(proj.position);
          if (toAI.length() < 150 && toAI.normalize().dot(proj.direction) > 0.9) {
            if (window.DEBUG_AI_STATE) {
              console.log(`[AI] ${this.id} incoming bullet/shell detected.`);
            }
            return true;
          }
        }
      }
    }
    // 2. (Optional) Player aiming detection
    if (typeof window !== 'undefined' && window.playerAircraft) {
      const player = window.playerAircraft;
      const toAI = this.position.clone().sub(player.position);
      const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.rotation).normalize();
      // If player is aiming within 10 deg and within 1200m
      if (toAI.length() < 1200 && playerForward.dot(toAI.normalize()) > 0.98) {
        if (window.DEBUG_AI_STATE) {
          console.log(`[AI] ${this.id} is being targeted by player.`);
        }
        return true;
      }
    }
    return false;
  }

  startEvasionManeuver() {
    this.evasionActive = true;
    // Optionally trigger a roll or random direction
  }

  updateEvasion(dt) {
    if (!this.evasionActive) return;
    // --- Context-aware evasive maneuvers ---
    let threatType = null;
    if (this.isUnderAttack && this.isUnderAttack()) {
      // Try to determine threat type for maneuver selection
      if (typeof window !== 'undefined' && window.sceneProjectiles) {
        for (const proj of window.sceneProjectiles) {
          if (proj && proj.type === 'missile' && proj.target === this && proj.locked) {
            threatType = 'missile_lock';
            break;
          }
          if (proj && proj.type === 'missile' && proj.position && proj.direction) {
            const toAI = this.position.clone().sub(proj.position);
            if (toAI.length() < 400 && toAI.normalize().dot(proj.direction) > 0.85) {
              threatType = 'missile_near';
              break;
            }
          }
          if ((proj.type === 'bullet' || proj.type === 'shell') && proj.position && proj.direction) {
            const toAI = this.position.clone().sub(proj.position);
            if (toAI.length() < 150 && toAI.normalize().dot(proj.direction) > 0.9) {
              threatType = 'gunfire';
              break;
            }
          }
        }
      }
    }
    // Pick maneuver based on threat
    if (threatType === 'missile_lock' || threatType === 'missile_near') {
      // Missile: break turn, split-S, or barrel roll
      if (Math.random() < 0.5) {
        this.applyYaw((Math.random() < 0.5 ? 1 : -1) * 0.25); // hard break turn
        this.applyRoll((Math.random() - 0.5) * 0.5);
      } else {
        this.applyPitch(-0.3); // split-S dive
        this.applyRoll((Math.random() - 0.5) * 0.5);
      }
      this.applyThrust(this.maxAccel);
      // Deploy countermeasures if available and cooldown allows
      if (this.deployCountermeasure && (!this._lastCM || (performance.now() - this._lastCM) > 1200)) {
        this.deployCountermeasure('flare');
        this._lastCM = performance.now();
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${this.id} deployed flare!`);
        }
      }
    } else if (threatType === 'gunfire') {
      // Gunfire: jink (random roll/yaw/pitch)
      this.applyRoll((Math.random() - 0.5) * 0.3);
      this.applyYaw((Math.random() - 0.5) * 0.25);
      this.applyPitch((Math.random() - 0.5) * 0.18);
      this.applyThrust(this.maxAccel * 0.8);
    } else {
      // Fallback: random evasive movement
      const rand = Math.random();
      if (rand < 0.33) this.applyRoll((Math.random() - 0.5) * 0.15);
      if (rand < 0.66) this.applyYaw((Math.random() - 0.5) * 0.12);
      if (rand > 0.66) this.applyPitch((Math.random() - 0.5) * 0.12);
      this.applyThrust(12000);
    }
  }

  endEvasionManeuver() {
    this.evasionActive = false;
  }
}
