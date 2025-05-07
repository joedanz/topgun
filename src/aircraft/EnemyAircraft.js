// src/aircraft/EnemyAircraft.js
// EnemyAircraft class extends Aircraft and integrates AI state machine
import Aircraft from './Aircraft';
import { StateMachine } from '../ai/StateMachine';
import { createEnemyAIStates } from '../ai/EnemyAIStates';
import * as THREE from 'three';
import FormationManager, { FORMATION_TYPES } from './FormationManager';
import DifficultyManager from '../ai/DifficultyManager';
import AITelemetryTracker from '../systems/AITelemetryTracker';

export default class EnemyAircraft extends Aircraft {
  // --- Terrain-aware helper ---
  _canPerformNegativePitchManeuver(minSafeAltitude = 60) {
    // 1. If obstacles/terrain meshes are available, raycast downward
    let altitude = this.position.y;
    if (typeof window !== 'undefined' && window.sceneObstacles && Array.isArray(window.sceneObstacles) && window.sceneObstacles.length > 0 && typeof THREE.Raycaster !== 'undefined') {
      const down = new THREE.Vector3(0, -1, 0);
      const raycaster = new THREE.Raycaster(this.position, down, 0, 1000);
      const intersects = raycaster.intersectObjects(window.sceneObstacles, true);
      if (intersects && intersects.length > 0) {
        altitude = intersects[0].distance;
      }
    }
    // 2. Fallback: use y position as altitude
    return altitude > minSafeAltitude;
  }

  // --- Debug visualization for maneuvers ---
  _showManeuverLabel(labelText) {
    if (!window.DEBUG_AI_STATE || typeof window === 'undefined' || !window.scene) return;
    // Remove existing label if present
    this._hideManeuverLabel && this._hideManeuverLabel();
    // Create a DOM element overlay label (simple, robust)
    const div = document.createElement('div');
    div.className = 'ai-maneuver-label';
    div.style.position = 'absolute';
    div.style.background = 'rgba(30,30,30,0.85)';
    div.style.color = '#fff';
    div.style.padding = '2px 8px';
    div.style.borderRadius = '6px';
    div.style.fontSize = '13px';
    div.style.pointerEvents = 'none';
    div.style.zIndex = 10010;
    div.innerText = labelText;
    document.body.appendChild(div);
    this._maneuverLabelDiv = div;
    // Attach update function to reposition label each frame
    const updateLabelPosition = () => {
      if (!this._maneuverLabelDiv || !window.scene || !window.scene.camera) return;
      const camera = window.scene.camera;
      const worldPos = this.position.clone();
      const vector = worldPos.project(camera);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight - 32;
      div.style.left = `${x}px`;
      div.style.top = `${y}px`;
      if (this.evasionActive) {
        this._maneuverLabelRAF = requestAnimationFrame(updateLabelPosition);
      }
    };
    this._maneuverLabelRAF = requestAnimationFrame(updateLabelPosition);
    // Hide method
    this._hideManeuverLabel = () => {
      if (this._maneuverLabelDiv && this._maneuverLabelDiv.parentNode) {
        this._maneuverLabelDiv.parentNode.removeChild(this._maneuverLabelDiv);
      }
      this._maneuverLabelDiv = null;
      if (this._maneuverLabelRAF) cancelAnimationFrame(this._maneuverLabelRAF);
      this._maneuverLabelRAF = null;
    };
  }

  constructor(config = {}) {
    super(config);
    // --- Mesh setup (placeholder: red box) ---
    const geometry = new THREE.BoxGeometry(12, 4, 28); // width, height, depth
    const material = new THREE.MeshPhongMaterial({ color: 0xff2222 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.logic = this; // link back for debug/selection

    // --- Telemetry ---
    this._lastState = null;
    this._stateTimeAccum = { engage: 0, evade: 0, patrol: 0 };

    // --- Threat memory ---
    this._threatMemoryTimer = 0;
    this._threatMemoryDuration = 2.0; // seconds

    // --- Formation integration ---
    this.formation = null; // Reference to FormationManager if in formation
    this.formationIndex = -1; // Index in formation (0 = leader)

    this.isEnemy = true;
    // Keep mesh position in sync with logic position
    this._syncMeshPosition = () => {
      if (this.mesh && this.position) {
        this.mesh.position.copy(this.position);
        this.mesh.quaternion.copy(this.rotation);
      }
    };
    // Optionally, you can call this._syncMeshPosition() in update(), or set up a setter for position.

    this.stateDebug = 'patrol';
    this.patrolRoute = config.patrolRoute || [];
    this.currentWaypointIndex = 0;
    // --- Performance limits (AI fairness) ---
    this.maxSpeed = (config.maxSpeed !== undefined) ? config.maxSpeed : 1000; // units/sec
    this.maxAccel = (config.maxAccel !== undefined) ? config.maxAccel : 14000; // units/sec^2
    this.maxTurnRate = (config.maxTurnRate !== undefined) ? config.maxTurnRate : 90 * Math.PI / 180; // radians/sec
    // Store base values for scaling
    this._baseMaxSpeed = this.maxSpeed;
    this._baseMaxAccel = this.maxAccel;
    this._baseMaxTurnRate = this.maxTurnRate;
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

  // --- Telemetry: record shots fired/hit ---
  fireWeapon(weaponIdx = 0, target = null) {
    // Call original fire logic (assume super.fireWeapon exists, otherwise copy logic)
    const result = super.fireWeapon ? super.fireWeapon(weaponIdx, target) : true;
    // Always record shot
    AITelemetryTracker.recordEvent(this.id, 'shot', { hit: false });
    return result;
  }

  registerHit(target) {
    // Called when this AI hits a target (player or other AI)
    AITelemetryTracker.recordEvent(this.id, 'shot', { hit: true });
  }

  onKill() {
    AITelemetryTracker.recordEvent(this.id, 'kill');
  }

  onDeath() {
    AITelemetryTracker.recordEvent(this.id, 'death');
  }

  // --- Telemetry: evasion and maneuvers ---
  startEvasionManeuver() {
    AITelemetryTracker.recordEvent(this.id, 'evasionAttempt');
    this.evasionActive = true;
  }
  endEvasionManeuver(success = false) {
    if (success) {
      AITelemetryTracker.recordEvent(this.id, 'evasionAttempt', { success: true });
    }
    this.evasionActive = false;
    this._hideManeuverLabel && this._hideManeuverLabel();
  }

  // --- Telemetry: countermeasures ---
  deployCountermeasure(type = 'flare') {
    AITelemetryTracker.recordEvent(this.id, 'countermeasure', { type });
    // Call original deploy logic if exists
    if (super.deployCountermeasure) return super.deployCountermeasure(type);
  }

  // --- Telemetry: maneuvers ---
  performBreakTurn(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'BreakTurn' }); /* ...original logic... */ }
  performSplitS() { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'SplitS' }); /* ...original logic... */ }
  performBarrelRoll(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'BarrelRoll' }); /* ...original logic... */ }
  performImmelmann(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'Immelmann' }); /* ...original logic... */ }
  performVerticalScissors() { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'VerticalScissors' }); /* ...original logic... */ }
  performLowYoYo(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'LowYoYo' }); /* ...original logic... */ }
  performHighYoYo(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'HighYoYo' }); /* ...original logic... */ }
  performRollingScissors(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'RollingScissors' }); /* ...original logic... */ }
  performFlatScissors(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'FlatScissors' }); /* ...original logic... */ }
  performCobraManeuver() { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'Cobra' }); /* ...original logic... */ }
  performLagDisplacementRoll(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'LagDisplacementRoll' }); /* ...original logic... */ }
  performDefensiveSpiral(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'DefensiveSpiral' }); /* ...original logic... */ }
  performPitchbackTurn(dir) { AITelemetryTracker.recordEvent(this.id, 'maneuver', { name: 'PitchbackTurn' }); /* ...original logic... */ }

  update(dt, gameContext = {}) {
    // --- Difficulty-based performance scaling ---
    const diff = DifficultyManager.getCurrent();
    // These are the base values set in the constructor
    this.maxSpeed = (this._baseMaxSpeed || this.maxSpeed) * (diff.maxSpeedMultiplier || 1.0);
    this.maxAccel = (this._baseMaxAccel || this.maxAccel) * (diff.maxAccelMultiplier || 1.0);
    this.maxTurnRate = (this._baseMaxTurnRate || this.maxTurnRate) * (diff.maxTurnRateMultiplier || 1.0);

    // --- Threat memory timer decrement ---
    if (this._threatMemoryTimer > 0) {
      this._threatMemoryTimer -= dt;
      if (this._threatMemoryTimer < 0) this._threatMemoryTimer = 0;
    }

    // --- Formation integration ---
    if (this.formation && this.formationIndex > 0) {
      // Follower: let formation manager move us
      // (Leader runs normal AI)
      // Position and velocity are updated by FormationManager.update()
      // Optionally, skip state machine update if in formation state
      if (this.stateDebug === 'formation') {
        // Only update physics, skip AI
        super.update(dt);
        return;
      }
    }

    // AI logic
    this.stateMachine.update(dt, gameContext);
    // --- AI telemetry: record state time ---
    if (this.stateMachine && this.stateMachine.currentState && typeof this.stateMachine.currentState === 'string') {
      const state = this.stateMachine.currentState;
      if (['engage','evade','patrol'].includes(state)) {
        this._stateTimeAccum[state] = (this._stateTimeAccum[state] || 0) + dt;
        // Emit every ~2 seconds per state
        if (this._stateTimeAccum[state] > 2.0) {
          AITelemetryTracker.recordEvent(this.id, 'stateTime', { state, dt: this._stateTimeAccum[state] });
          this._stateTimeAccum[state] = 0;
        }
      }
    }
    // Call base update for physics
    super.update(dt);
  }

  /**
   * Assign this aircraft to a formation and set its index
   */
  joinFormation(formationManager, index) {
    this.formation = formationManager;
    this.formationIndex = index;
    this.stateDebug = 'formation';
  }

  /**
   * Leave the current formation
   */
  leaveFormation() {
    this.formation = null;
    this.formationIndex = -1;
    this.stateDebug = 'patrol';
  }

  /**
   * Respond to a formation command (stub)
   */
  onFormationCommand(cmd, params) {
    // TODO: handle break, attack, regroup, etc.
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

  // --- Missile threat detection helper ---
  getIncomingMissileThreats() {
    // Returns array of incoming missile threats with distance, closure, and TTI
    const threats = [];
    if (typeof window !== 'undefined' && window.sceneProjectiles) {
      for (const proj of window.sceneProjectiles) {
        if (!proj || proj.type !== 'missile' || !proj.position) continue;
        // Must be locked on us or have us as target
        if (proj.target !== this && !proj.locked) continue;
        // Distance
        const toAI = this.position.clone().sub(proj.position);
        const dist = toAI.length();
        // Missile velocity (estimate)
        const missileVel = proj.velocity ? proj.velocity.clone() : new THREE.Vector3();
        // Relative velocity toward AI
        const relVel = missileVel.clone().sub(this.velocity || new THREE.Vector3());
        const closure = -relVel.dot(toAI.clone().normalize()); // positive = closing
        // Time-to-impact (avoid div by zero)
        const tti = (closure > 10) ? dist / closure : Infinity;
        // Only consider as threat if closing and within 800m
        if (closure > 10 && dist < 800) {
          threats.push({ missile: proj, dist, closure, tti });
        }
      }
    }
    return threats;
  }

  // --- Gunfire threat detection helper ---
  getIncomingGunfireThreats() {
    // Returns array of incoming gunfire threats (bullets/shells) with distance and TTI
    const threats = [];
    if (typeof window !== 'undefined' && window.sceneProjectiles) {
      for (const proj of window.sceneProjectiles) {
        if (!proj || (proj.type !== 'bullet' && proj.type !== 'shell') || !proj.position || !proj.direction) continue;
        const toAI = this.position.clone().sub(proj.position);
        const dist = toAI.length();
        // Only consider if approaching and within 200m
        if (dist > 200 || toAI.normalize().dot(proj.direction) < 0.92) continue;
        // Estimate projectile speed (fallback to 800m/s)
        const projSpeed = proj.velocity ? proj.velocity.length() : 800;
        // Time-to-impact
        const tti = projSpeed > 10 ? dist / projSpeed : Infinity;
        threats.push({ projectile: proj, dist, tti });
      }
    }
    return threats;
  }

  // --- Multi-threat awareness and ranking ---
  getThreatSummary() {
    // Collect all missile and gunfire threats, rank by TTI
    const missileThreats = this.getIncomingMissileThreats().map(t => ({
      type: 'missile',
      obj: t.missile,
      dist: t.dist,
      tti: t.tti,
      closure: t.closure
    }));
    const gunfireThreats = this.getIncomingGunfireThreats().map(t => ({
      type: 'gunfire',
      obj: t.projectile,
      dist: t.dist,
      tti: t.tti
    }));
    // Concatenate and sort by TTI (lowest = most urgent)
    // --- Player aiming threat integration ---
    let aimingThreat = null;
    if (typeof window !== 'undefined' && window.playerAircraft) {
      const player = window.playerAircraft;
      const toAI = this.position.clone().sub(player.position);
      const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.rotation).normalize();
      // If player is aiming within 10 deg and within 1200m
      if (toAI.length() < 1200 && playerForward.dot(toAI.normalize()) > 0.98) {
        aimingThreat = {
          type: 'aiming',
          obj: player,
          dist: toAI.length(),
          tti: 1.5, // Assign moderate urgency (tunable)
        };
        if (window.DEBUG_AI_STATE) {
          console.log(`[AI] ${this.id} is being targeted by player (aiming threat)`);
        }
      }
    }
    let allThreats = missileThreats.concat(gunfireThreats);
    if (aimingThreat) allThreats.push(aimingThreat);
    allThreats.sort((a, b) => a.tti - b.tti);
    return allThreats;
  }

  isUnderAttack() {
    // --- Realistic threat detection ---
    // Multi-threat awareness: check all threats and rank by urgency
    const threats = this.getThreatSummary();
    if (threats.length > 0) {
      // Threat detected: set memory timer
      this._threatMemoryTimer = this._threatMemoryDuration;
      const t = threats[0];
      if (window.DEBUG_AI_STATE) {
        if (t.type === 'missile') {
          console.log(`[AI] ${this.id} missile threat: dist=${t.dist.toFixed(1)}m, closure=${t.closure !== undefined ? t.closure.toFixed(1) : 'n/a'}m/s, tti=${t.tti.toFixed(1)}s`);
        } else if (t.type === 'gunfire') {
          console.log(`[AI] ${this.id} gunfire threat: dist=${t.dist.toFixed(1)}m, tti=${t.tti.toFixed(2)}s`);
        } else if (t.type === 'aiming') {
          console.log(`[AI] ${this.id} aiming threat: dist=${t.dist.toFixed(1)}m, tti=${t.tti.toFixed(2)}s`);
        }
      }
      return true;
    }
    // Threat memory: stay alert after threats disappear
    if (this._threatMemoryTimer > 0) {
      if (window.DEBUG_AI_STATE) {
        console.log(`[AI] ${this.id} threat memory active (${this._threatMemoryTimer.toFixed(2)}s left)`);
      }
      return true;
    }

    return false;
  }

  /**
   * Initiates an evasion maneuver based on the highest priority threat.
   * Sets evasionActive to true, determines the best maneuver, and triggers it.
   * Side Effects: Sets currentEvasionManeuver, evasionTimer, may deploy countermeasures.
   */
  startEvasionManeuver() {
    this.evasionActive = true;
    // Optionally trigger a roll or random direction
  }

  // --- Evasive Maneuver Library ---

/**
 * Performs a Flat Scissors maneuver (horizontal weaving turns).
 * @param {number} [direction=1] - Initial turn direction (1 for right, -1 for left).
 * Side Effects: Applies yaw, roll, pitch, thrust; shows maneuver label in debug.
 */
performFlatScissors(direction = 1) {
  // Alternating hard yaw/roll, low speed, horizontal plane
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      this.applyYaw(direction * 0.5 + (Math.random() - 0.5) * 0.15);
      this.applyRoll(direction * 0.9 + (Math.random() - 0.5) * 0.18);
      this.applyPitch((Math.random() - 0.5) * 0.08);
      this.applyThrust(this.maxAccel * 0.7);
      if (window.DEBUG_AI_STATE) {
        this._showManeuverLabel('Flat Scissors');
      }
    }, i * 180);
  }
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs FLAT SCISSORS (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Flat Scissors (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs a Cobra maneuver (sudden high-angle pitch-up to bleed speed).
 * Side Effects: Applies pitch, thrust; may show maneuver label in debug.
 */
performCobraManeuver() {
  // Sudden pitch-up, then recover
  if (!this._canPerformNegativePitchManeuver(30)) {
    if (window.DEBUG_AI_STATE) this._showManeuverLabel('Cobra (Blocked: Low Altitude)');
    return;
  }
  this.applyPitch(1.3 + (Math.random() - 0.5) * 0.2);
  this.applyThrust(this.maxAccel * 0.5);
  setTimeout(() => {
    this.applyPitch(-0.7 + (Math.random() - 0.5) * 0.18);
    this.applyThrust(this.maxAccel * 0.9);
  }, 320);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs COBRA MANEUVER`);
    this._showManeuverLabel('Cobra Maneuver');
  }
}

/**
 * Performs a Lag Displacement Roll (rolls out of plane to change pursuit geometry).
 * @param {number} [direction=1] - Roll direction (1 for right, -1 for left).
 * Side Effects: Applies roll, yaw, pitch, thrust; shows maneuver label in debug.
 */
performLagDisplacementRoll(direction = 1) {
  // Roll and yaw away, then pitch back in
  this.applyRoll(direction * 1.1 + (Math.random() - 0.5) * 0.2);
  this.applyYaw(-direction * 0.3 + (Math.random() - 0.5) * 0.1);
  this.applyPitch(0.16 + (Math.random() - 0.5) * 0.09);
  this.applyThrust(this.maxAccel * 0.8);
  setTimeout(() => {
    this.applyRoll(-direction * 0.7 + (Math.random() - 0.5) * 0.2);
    this.applyYaw(direction * 0.22 + (Math.random() - 0.5) * 0.08);
    this.applyPitch(-0.12 + (Math.random() - 0.5) * 0.07);
    this.applyThrust(this.maxAccel * 0.8);
  }, 240);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs LAG DISPLACEMENT ROLL (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Lag Displacement Roll (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs a Defensive Spiral (descending spiral to evade and bleed energy).
 * @param {number} [direction=1] - Spiral direction (1 for right, -1 for left).
 * Side Effects: Applies roll, yaw, pitch, thrust; shows maneuver label in debug.
 */
performDefensiveSpiral(direction = 1) {
  // Descending spiral, continuous roll, negative pitch, yaw
  if (!this._canPerformNegativePitchManeuver()) {
    if (window.DEBUG_AI_STATE) this._showManeuverLabel('Defensive Spiral (Pitch Limited)');
    return;
  }
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      this.applyRoll(direction * 1.0 + (Math.random() - 0.5) * 0.2);
      this.applyYaw(direction * 0.18 + (Math.random() - 0.5) * 0.07);
      this.applyPitch(-0.23 + (Math.random() - 0.5) * 0.06);
      this.applyThrust(this.maxAccel * 0.75);
      if (window.DEBUG_AI_STATE) {
        this._showManeuverLabel('Defensive Spiral');
      }
    }, i * 130);
  }
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs DEFENSIVE SPIRAL (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Defensive Spiral (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs a Pitchback Turn (sharp vertical turn to reverse direction).
 * @param {number} [direction=1] - Turn direction (1 for right, -1 for left).
 * Side Effects: Applies pitch, roll, yaw, thrust; shows maneuver label in debug.
 */
performPitchbackTurn(direction = 1) {
  // Rapid pitch-up, then roll/yaw to reverse
  if (!this._canPerformNegativePitchManeuver(40)) {
    if (window.DEBUG_AI_STATE) this._showManeuverLabel('Pitchback (Pitch Limited)');
    return;
  }
  this.applyPitch(0.95 + (Math.random() - 0.5) * 0.18);
  this.applyThrust(this.maxAccel * 0.85);
  setTimeout(() => {
    this.applyRoll(direction * 0.9 + (Math.random() - 0.5) * 0.13);
    this.applyYaw(direction * 0.7 + (Math.random() - 0.5) * 0.15);
    this.applyPitch(-0.45 + (Math.random() - 0.5) * 0.12);
    this.applyThrust(this.maxAccel * 0.9);
  }, 220);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs PITCHBACK TURN (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Pitchback Turn (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs a Low Yo-Yo maneuver (dives below turn circle to decrease range).
 * @param {number} [direction=1] - Turn direction (1 for right, -1 for left).
 * Side Effects: Applies pitch, roll, yaw, thrust; shows maneuver label in debug.
 */
performLowYoYo(direction = 1) {
  // Descend and then pull up, reducing closure and repositioning
  let pitch = -0.28 + (Math.random() - 0.5) * 0.07;
  if (!this._canPerformNegativePitchManeuver()) {
    pitch = Math.abs(pitch) * 0.18;
    if (window.DEBUG_AI_STATE) {
      this._showManeuverLabel('Low Yo-Yo (Pitch Limited)');
    }
  }
  this.applyPitch(pitch);
  this.applyRoll(direction * 0.4 + (Math.random() - 0.5) * 0.08);
  this.applyYaw(direction * 0.22 + (Math.random() - 0.5) * 0.08);
  this.applyThrust(this.maxAccel * 0.85);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs LOW YO-YO (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Low Yo-Yo (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs a High Yo-Yo maneuver (climbs above turn circle to manage closure).
 * @param {number} [direction=1] - Turn direction (1 for right, -1 for left).
 * Side Effects: Applies pitch, roll, yaw, thrust; shows maneuver label in debug.
 */
performHighYoYo(direction = 1) {
  // Pull up and roll over, then descend back, reducing closure and repositioning
  this.applyPitch(0.32 + (Math.random() - 0.5) * 0.07);
  this.applyRoll(direction * 0.7 + (Math.random() - 0.5) * 0.1);
  this.applyYaw(direction * 0.18 + (Math.random() - 0.5) * 0.07);
  this.applyThrust(this.maxAccel * 0.82);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs HIGH YO-YO (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`High Yo-Yo (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs Rolling Scissors (alternating rolls to force overshoot in close dogfight).
 * @param {number} [direction=1] - Initial roll direction (1 for right, -1 for left).
 * Side Effects: Applies roll, yaw, pitch, thrust; shows maneuver label in debug.
 */
performRollingScissors(direction = 1) {
  // Alternating roll and yaw, simulating a rolling scissors
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      this.applyRoll(direction * 1.2 + (Math.random() - 0.5) * 0.2);
      this.applyYaw(direction * 0.22 + (Math.random() - 0.5) * 0.08);
      this.applyPitch((Math.random() - 0.5) * 0.12);
      this.applyThrust(this.maxAccel * 0.8);
      if (window.DEBUG_AI_STATE) {
        this._showManeuverLabel('Rolling Scissors');
      }
    }, i * 200);
  }
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs ROLLING SCISSORS (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Rolling Scissors (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs a Break Turn (maximum G turn away from threat).
 * @param {number} [direction=1] - Turn direction (1 for right, -1 for left).
 * Side Effects: Applies yaw, roll, thrust; shows maneuver label in debug.
 */
performBreakTurn(direction = 1) {
  this.applyYaw(direction * 0.32 + (Math.random() - 0.5) * 0.08);
  this.applyRoll(direction * 0.6 + (Math.random() - 0.5) * 0.1);
  this.applyThrust(this.maxAccel);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs BREAK TURN (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Break Turn (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs a Split-S maneuver (half-roll and descending half-loop to reverse direction).
 * Side Effects: Applies pitch, roll, thrust; shows maneuver label in debug.
 */
performSplitS() {
  // Terrain-aware: check altitude before negative pitch
  if (!this._canPerformNegativePitchManeuver()) {
    if (window.DEBUG_AI_STATE) {
      console.warn(`[AI] ${this.id} Split-S blocked: too close to ground!`);
      this._showManeuverLabel('Split-S (Blocked: Low Altitude)');
    }
    // Fallback: do a break turn instead
    this.performBreakTurn(Math.random() < 0.5 ? 1 : -1);
    return;
  }
  this.applyPitch(-0.5 + (Math.random() - 0.5) * 0.08);
  this.applyRoll((Math.random() < 0.5 ? 1 : -1) * 0.7 + (Math.random() - 0.5) * 0.1);
  this.applyThrust(this.maxAccel);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs SPLIT-S`);
    this._showManeuverLabel('Split-S');
  }
}

/**
 * Performs a Barrel Roll (360-degree roll while maintaining heading).
 * @param {number} [direction=1] - Roll direction (1 for right, -1 for left).
 * Side Effects: Applies roll, pitch, thrust; shows maneuver label in debug.
 */
performBarrelRoll(direction = 1) {
  this.applyRoll(direction * 1.0 + (Math.random() - 0.5) * 0.2);
  this.applyPitch(0.18 + (Math.random() - 0.5) * 0.05);
  this.applyThrust(this.maxAccel * 0.9);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs BARREL ROLL (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Barrel Roll (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

/**
 * Performs an Immelmann turn (half-loop up and half-roll to reverse direction and gain altitude).
 * @param {number} [direction=1] - Roll direction after loop (1 for right, -1 for left).
 * Side Effects: Applies pitch, roll, thrust; shows maneuver label in debug.
 */
performImmelmann(direction = 1) {
  this.applyPitch(0.55 + (Math.random() - 0.5) * 0.06);
  this.applyRoll(direction * 0.5 + (Math.random() - 0.5) * 0.1);
  this.applyThrust(this.maxAccel);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs IMMELMANN (${direction > 0 ? 'right' : 'left'})`);
    this._showManeuverLabel(`Immelmann (${direction > 0 ? 'Right' : 'Left'})`);
  }
}

performVerticalScissors() {
  this.applyYaw((Math.random() < 0.5 ? 1 : -1) * 0.22 + (Math.random() - 0.5) * 0.05);
  this.applyPitch(0.25 + (Math.random() - 0.5) * 0.08);
  this.applyRoll((Math.random() < 0.5 ? 1 : -1) * 0.5 + (Math.random() - 0.5) * 0.1);
  this.applyThrust(this.maxAccel * 0.85);
  if (window.DEBUG_AI_STATE) {
    console.log(`[AI] ${this.id} performs VERTICAL SCISSORS`);
    this._showManeuverLabel('Vertical Scissors');
  }
}

performHighGJink() {
  // Terrain-aware: avoid large negative pitch if too low
  let pitch = (Math.random() - 0.5) * 0.25;
  if (pitch < 0 && !this._canPerformNegativePitchManeuver()) {
    pitch = Math.abs(pitch) * 0.25; // reduce negative pitch
    if (window.DEBUG_AI_STATE) {
      console.warn(`[AI] ${this.id} High-G Jink: negative pitch reduced due to low altitude!`);
      this._showManeuverLabel('High-G Jink (Pitch Limited)');
    }
  }
  this.applyYaw((Math.random() < 0.5 ? 1 : -1) * 0.4 + (Math.random() - 0.5) * 0.1);
  this.applyPitch(pitch);
  this.applyRoll((Math.random() - 0.5) * 0.2);
  this.applyThrust(this.maxAccel);
  if (window.DEBUG_AI_STATE && pitch >= 0) {
    console.log(`[AI] ${this.id} performs HIGH-G JINK`);
    this._showManeuverLabel('High-G Jink');
  }
}

performRandomJink() {
  // Terrain-aware: avoid negative pitch if too low
  let pitch = (Math.random() - 0.5) * 0.22;
  if (pitch < 0 && !this._canPerformNegativePitchManeuver()) {
    pitch = Math.abs(pitch) * 0.18;
    if (window.DEBUG_AI_STATE) {
      console.warn(`[AI] ${this.id} Random Jink: negative pitch reduced due to low altitude!`);
      this._showManeuverLabel('Random Jink (Pitch Limited)');
    }
  }
  this.applyRoll((Math.random() - 0.5) * 0.35);
  this.applyYaw((Math.random() - 0.5) * 0.32);
  this.applyPitch(pitch);
  this.applyThrust(this.maxAccel * 0.8);
  if (window.DEBUG_AI_STATE && pitch >= 0) {
    console.log(`[AI] ${this.id} performs RANDOM JINK`);
    this._showManeuverLabel('Random Jink');
  }
}

updateEvasion(dt, evasionConfig = {}) {
  if (!this.evasionActive) return;
  // Always pull from DifficultyManager for live scaling
  const diff = DifficultyManager.getCurrent();
  const aggression = (typeof evasionConfig.aggression === 'number') ? evasionConfig.aggression : (typeof this._evasionAggression === 'number' ? this._evasionAggression : diff.maneuverAggression);
  const cmProbability = (typeof evasionConfig.cmProbability === 'number') ? evasionConfig.cmProbability : (typeof this._cmProbability === 'number' ? this._cmProbability : (0.4 + 0.5 * diff.maneuverAggression));
  // --- Energy management ---
  const minEnergy = 0.45; // fraction of maxSpeed, below which AI should conserve energy
  const currentSpeed = this.getSpeed ? this.getSpeed() : (this.velocity ? this.velocity.length() : 0);
  const maxSpeed = this.maxSpeed || 1000;
  const energyLow = currentSpeed < maxSpeed * minEnergy;
  if (energyLow && this.applyThrust) {
    // Throttle up or afterburner if available
    this.applyThrust(this.maxAccel * 1.1);
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      this._showManeuverLabel('Energy Recovery');
      console.log(`[AI] ${this.id} energy low, throttling up!`);
    }
  }

  // --- Threat ranking integration ---
  let threatType = null;
  let threatGuidance = null;
  let threatObj = null;
  let threatTTI = null;
  const rankedThreats = this.getThreatSummary();
  if (rankedThreats.length > 0) {
    const topThreat = rankedThreats[0];
    threatType = topThreat.type;
    threatObj = topThreat.obj;
    threatTTI = topThreat.tti;
    if (topThreat.type === 'missile' && topThreat.obj && topThreat.obj.guidanceType) {
      threatGuidance = topThreat.obj.guidanceType;
    }
    if (window.DEBUG_AI_STATE) {
      console.log(`[AI] ${this.id} evasion: top threat=${threatType}, tti=${threatTTI !== null ? threatTTI.toFixed(2) : 'n/a'}s`);
    }
  }
  // Select maneuver based on threat
  if (threatType === 'missile') {
    // Missile: select from break turn, split-S, barrel roll, Immelmann, vertical scissors, low yo-yo, high yo-yo, rolling scissors
    // Tactical complexity: higher values = more advanced maneuvers available
    let maneuvers = [
      () => this.performBreakTurn(Math.random() < 0.5 ? 1 : -1),
      () => this.performSplitS(),
      () => this.performBarrelRoll(Math.random() < 0.5 ? 1 : -1),
      () => this.performImmelmann(Math.random() < 0.5 ? 1 : -1)
    ];
    const tacticalComplexity = diff.tacticalComplexity || 0.2;
    if (tacticalComplexity > 0.3) {
      maneuvers.push(() => this.performVerticalScissors());
      maneuvers.push(() => this.performLowYoYo(Math.random() < 0.5 ? 1 : -1));
      maneuvers.push(() => this.performHighYoYo(Math.random() < 0.5 ? 1 : -1));
    }
    if (tacticalComplexity > 0.6) {
      maneuvers.push(() => this.performRollingScissors(Math.random() < 0.5 ? 1 : -1));
      maneuvers.push(() => this.performFlatScissors(Math.random() < 0.5 ? 1 : -1));
      maneuvers.push(() => this.performCobraManeuver());
      maneuvers.push(() => this.performLagDisplacementRoll(Math.random() < 0.5 ? 1 : -1));
    }
    if (tacticalComplexity > 0.9) {
      maneuvers.push(() => this.performDefensiveSpiral(Math.random() < 0.5 ? 1 : -1));
      maneuvers.push(() => this.performPitchbackTurn(Math.random() < 0.5 ? 1 : -1));
    }
    // If energy is low, prefer less energy-draining maneuvers
    if (energyLow) {
      maneuvers.unshift(() => this.performBreakTurn(Math.random() < 0.5 ? 1 : -1));
    }
    maneuvers[Math.floor(Math.random() * maneuvers.length)]();
    // --- Countermeasure logic ---
    if (this.deployCountermeasure && (!this._lastCM || (performance.now() - this._lastCM) > 1200)) {
      // Radar-guided: prefer chaff; IR: prefer flare; fallback: random
      let cmType = 'flare';
      if (threatGuidance === 'radar') cmType = 'chaff';
      else if (threatGuidance === 'ir') cmType = 'flare';
      else if (Math.random() < 0.5) cmType = 'chaff';
      // Deploy based on difficulty-scaling probability
      if (Math.random() < cmProbability) {
        this.deployCountermeasure(cmType);
        this._lastCM = performance.now();
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          this._showManeuverLabel(`Deploy ${cmType.charAt(0).toUpperCase() + cmType.slice(1)}`);
          console.log(`[AI] ${this.id} deployed ${cmType}!`);
        }
      }
    }
  } else if (threatType === 'gunfire') {
    // Gunfire: select between high-G jink, random jink, break turn, low yo-yo, rolling scissors
    const maneuvers = [
      () => this.performHighGJink(),
      () => this.performRandomJink(),
      () => this.performBreakTurn(Math.random() < 0.5 ? 1 : -1),
      () => this.performLowYoYo(Math.random() < 0.5 ? 1 : -1),
      () => this.performRollingScissors(Math.random() < 0.5 ? 1 : -1),
      () => this.performFlatScissors(Math.random() < 0.5 ? 1 : -1),
      () => this.performLagDisplacementRoll(Math.random() < 0.5 ? 1 : -1),
      () => this.performDefensiveSpiral(Math.random() < 0.5 ? 1 : -1),
      () => this.performPitchbackTurn(Math.random() < 0.5 ? 1 : -1)
    ];
    // If energy is low, prefer random jink (less energy cost)
    if (energyLow) maneuvers.unshift(() => this.performRandomJink());
    const idx = Math.floor(Math.random() * maneuvers.length);
    maneuvers[idx]();
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      let label = idx === 0 ? 'High-G Jink' : idx === 1 ? 'Random Jink' : 'Break Turn';
      if (energyLow) label += ' (Energy Save)';
      this._showManeuverLabel(label);
    }
  } else {
    // Fallback: random jink, energy-aware
    if (energyLow && Math.random() < 0.7) {
      this.performRandomJink();
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        this._showManeuverLabel('Random Jink (Energy Save)');
      }
    } else {
      this.performRandomJink();
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        this._showManeuverLabel('Random Jink');
      }
    }
  }
}



  /**
   * Ends the current evasion maneuver and resets related state.
   * Side Effects: Sets evasionActive = false, hides debug label.
   */
  endEvasionManeuver() {
    this.evasionActive = false;
    this._hideManeuverLabel && this._hideManeuverLabel();
  }
}
