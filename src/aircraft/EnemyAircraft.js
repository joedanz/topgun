// src/aircraft/EnemyAircraft.js
// EnemyAircraft class extends Aircraft and integrates AI state machine
import Aircraft from './Aircraft';
import { StateMachine } from '../ai/StateMachine';
import { createEnemyAIStates } from '../ai/EnemyAIStates';
import FormationManager from '../ai/FormationManager';
import * as THREE from 'three';

export default class EnemyAircraft extends Aircraft {
  /**
   * @param {object} config
   * @param {FormationManager} [config.formationManager] - Optional, for formation support
   */
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

    // --- Formation integration ---
    /**
     * Reference to the formation manager (shared across AI)
     * Should be set by game logic or AI spawner
     * @type {FormationManager|null}
     */
    this.formationManager = config.formationManager || null;
    /**
     * ID of the formation this aircraft is assigned to (null if not assigned)
     */
    this.formationId = null;
    /**
     * Cached role info (e.g., 'leader', 'wingman')
     */
    this.formationRole = null;
  }

  /**
   * Assign this aircraft to a formation.
   * @param {FormationManager} manager
   * @param {number} formationId
   */
  assignToFormation(manager, formationId) {
    this.formationManager = manager;
    this.formationId = formationId;
  }

  /**
   * Remove this aircraft from its formation.
   */
  removeFromFormation() {
    if (this.formationManager && this.formationId) {
      this.formationManager.removeAircraft(this);
    }
    this.formationId = null;
    this.formationRole = null;
  }

  update(dt, gameContext = {}) {
    // --- Formation logic ---
    let steeredByFormation = false;
    if (this.formationManager && this.formationId) {
      const assignment = this.formationManager.getAssignedPosition(this);
      if (assignment && assignment.position) {
        // Steer toward assigned formation position
        this.steerTowards(assignment.position, dt, false);
        this.formationRole = assignment.role;
        steeredByFormation = true;
      }
    }
    // AI logic (may include patrol/engage logic)
    // Only call state machine update if not being steered by formation,
    // or allow state machine to override if needed (e.g., evade)
    if (!steeredByFormation || (this.stateDebug === 'evade')) {
      this.stateMachine.update(dt, gameContext);
    }
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

  steerTowards(target, dt, aggressive = false) {
    // If target is an object with position and velocity (e.g., player), try to lead
    let aimPoint = null;
    if (target && target.position && target.velocity && this.getCurrentWeapon) {
      // Use projectile speed from current weapon if available
      let projectileSpeed = 600;
      const weapon = this.getCurrentWeapon ? this.getCurrentWeapon() : null;
      if (weapon && weapon.projectileType && weapon.projectileType.speed) {
        projectileSpeed = weapon.projectileType.speed;
      } else if (weapon && weapon.speed) {
        projectileSpeed = weapon.speed;
      }
      aimPoint = this.computeInterceptPoint(target.position, target.velocity, projectileSpeed);
    } else if (target && target.position) {
      aimPoint = target.position.clone();
    } else if (target instanceof THREE.Vector3) {
      aimPoint = target.clone();
    }
    if (!aimPoint) return;
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

  /**
   * Generalized: Can fire at arbitrary target (player or AI)
   * @param {object} target - Target object with .position and .velocity
   * @returns {boolean}
   */
  canFireAtTarget(target) {
    if (!target || !target.position) return false;
    // Use equipped weapon or fallback
    let projectileSpeed = 600;
    const weapon = this.equippedWeapon || (this.weapons && this.weapons[0]);
    if (weapon && weapon.projectileType && weapon.projectileType.speed) {
      projectileSpeed = weapon.projectileType.speed;
    } else if (weapon && weapon.speed) {
      projectileSpeed = weapon.speed;
    }
    // Predict intercept
    const targetPos = target.position.clone();
    const targetVel = target.velocity ? target.velocity.clone() : new THREE.Vector3();
    const intercept = this.computeInterceptPoint(targetPos, targetVel, projectileSpeed);
    // Select weapon for this intercept
    if (!this.selectWeaponForTarget(intercept)) return false;
    // Check constraints for selected weapon
    const selectedWeapon = this.weapons[this.currentWeaponIndex];
    if (!selectedWeapon) return false;
    // Cooldown, ammo, angle, range, lock, arming handled by selectWeaponForTarget
    // Additional: check if target is in LOS
    if (this.canDetectTarget && !this.canDetectTarget(target)) return false;
    return true;
  }

  // Legacy wrapper for player
  canFireAtPlayer() {
    return this.canFireAtTarget(window.playerAircraft);
  }

  /**
   * Predicts the intercept point for a moving target, given projectile speed.
   * @param {THREE.Vector3} targetPos - Current position of the target.
   * @param {THREE.Vector3} targetVel - Current velocity of the target.
   * @param {number} projectileSpeed - Speed of the projectile (m/s)
   * @returns {THREE.Vector3} The predicted intercept position.
   */
  computeInterceptPoint(targetPos, targetVel, projectileSpeed) {
    // Relative position and velocity
    const shooterPos = this.position.clone();
    const shooterVel = this.velocity ? this.velocity.clone() : new THREE.Vector3();
    const relPos = targetPos.clone().sub(shooterPos);
    const relVel = targetVel.clone().sub(shooterVel);
    const relSpeedSq = relVel.lengthSq();
    const projSpeedSq = projectileSpeed * projectileSpeed;

    // Quadratic: a*t^2 + b*t + c = 0
    const a = relSpeedSq - projSpeedSq;
    const b = 2 * relPos.dot(relVel);
    const c = relPos.lengthSq();
    // Solve for t (time to intercept)
    const discriminant = b * b - 4 * a * c;
    let t;
    if (a === 0) {
      // Linear case
      t = -c / b;
    } else if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      const t1 = (-b + sqrtDisc) / (2 * a);
      const t2 = (-b - sqrtDisc) / (2 * a);
      t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
    } else {
      // No real solution, fallback to aiming at current position
      t = 0;
    }
    t = Math.max(0, t || 0);
    // Predicted position
    return targetPos.clone().add(relVel.clone().multiplyScalar(t));
  }

  /**
    for (let i = 0; i < this.weapons.length; ++i) {
      const w = this.weapons[i];
      // Max range check
      if (typeof w.range === 'number' && dist > w.range) continue;
      // Min range check
      if (typeof w.minRange === 'number' && dist < w.minRange) continue;
      // Angle check (default 20 deg cone if not specified)
      const maxAngle = (typeof w.firingCone === 'number' ? w.firingCone : (20 * Math.PI / 180));
      if (angle > maxAngle) continue;
      // Ammo check
      if (typeof w.ammoCount === 'number' && w.ammoCount <= 0) continue;
      // Cooldown check (assume has isReady, ready, or canFire)
      if (typeof w.isReady === 'function' && !w.isReady()) continue;
      if (typeof w.ready === 'boolean' && !w.ready) continue;
      if (typeof w.canFire === 'function' && !w.canFire()) continue;
      // Missile lock constraint
      if (w.requiresLock && typeof w.hasLock === 'function' && !w.hasLock(this.currentTarget)) continue;
      // Arming constraint (time/distance)
      if (typeof w.isArmed === 'function' && !w.isArmed()) continue;

      // Score: prefer missiles at long range, guns at short
      let score = 0;
      if (w.type === 'missile') {
        score += 20;
        if (dist > 700) score += 10;
      } else if (w.type === 'gun') {
        score += 10;
        if (dist < 400) score += 5;
      }
      // Prefer higher ammo
      if (typeof w.ammoCount === 'number') score += w.ammoCount;
      // Prefer ready weapons
      if (typeof w.isReady === 'function' && w.isReady()) score += 2;
      if (typeof w.ready === 'boolean' && w.ready) score += 2;

      // Debug output for weapon selection and scoring
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} evaluating weapon ${w.name} (score: ${score})`);
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      this.currentWeaponIndex = bestIdx;
      this.equippedWeapon = this.weapons[bestIdx];
      return true;
    }
    return false;
  }
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
    // Enforce dynamic constraints before firing
    // Cooldown check (canFire or isReady)
    if (weapon && ((typeof weapon.canFire === 'function' && !weapon.canFire()) || (typeof weapon.isReady === 'function' && !weapon.isReady()) || (typeof weapon.ready === 'boolean' && !weapon.ready))) {
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} cannot fire: weapon on cooldown.`);
      }
      return;
    }
    // Missile lock
    if (weapon && weapon.requiresLock && typeof weapon.hasLock === 'function' && !weapon.hasLock(target)) {
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
    this.fireWeapon();
  }

  // Legacy wrapper for player
  fireWeaponAtPlayer() {
    this.fireWeaponAtTarget(window.playerAircraft);
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
    this._evasionStartTime = performance.now();
  }

  // --- Evasive Maneuver Library ---
  barrelRoll() {
    this.applyRoll((Math.random() < 0.5 ? 1 : -1) * 0.9); // full roll
    this.applyThrust(this.maxAccel * 0.8);
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      console.log(`[AI] ${this.id} performs BARREL ROLL`);
    }
  }
  splitS() {
    this.applyPitch(-0.5); // hard pitch down
    this.applyRoll((Math.random() < 0.5 ? 1 : -1) * 0.6);
    this.applyThrust(this.maxAccel);
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      console.log(`[AI] ${this.id} performs SPLIT-S`);
    }
  }
  dive() {
    this.applyPitch(-0.7);
    this.applyThrust(this.maxAccel);
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      console.log(`[AI] ${this.id} performs DIVE`);
    }
  }
  hardTurn(direction) {
    this.applyYaw(direction * 0.35);
    this.applyRoll(direction * 0.45);
    this.applyThrust(this.maxAccel);
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      console.log(`[AI] ${this.id} performs HARD TURN (${direction > 0 ? 'RIGHT' : 'LEFT'})`);
    }
  }
  randomJink() {
    this.applyRoll((Math.random() - 0.5) * 0.6);
    this.applyYaw((Math.random() - 0.5) * 0.4);
    this.applyPitch((Math.random() - 0.5) * 0.3);
    this.applyThrust(this.maxAccel * 0.8);
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      console.log(`[AI] ${this.id} performs RANDOM JINK`);
    }
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
    // Terrain-aware evasion
    if (this.position.y < 100) {
      this.applyPitch(0.2); // gentle climb
    } else if (this.position.y > 500) {
      this.applyPitch(-0.2); // gentle dive
    }
    // Scale evasion aggressiveness and countermeasure timing with aimError (difficulty)
    const aimError = this.aimError !== undefined ? this.aimError : 0.05;
    if (aimError > 0.1) {
      this.applyThrust(this.maxAccel * 1.2);
    } else if (aimError < 0.05) {
      this.applyThrust(this.maxAccel * 0.8);
    }
    if (this.deployCountermeasure && (!this._lastCM || (performance.now() - this._lastCM) > 600)) {
      this.deployCountermeasure('flare');
      this._lastCM = performance.now();
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} deployed flare!`);
      }
    }
  }

  endEvasionManeuver() {
    this.evasionActive = false;
  }
}
