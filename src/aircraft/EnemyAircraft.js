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

  steerTowards(target, dt, aggressive = false) {
    // Calculate desired direction
    const toTarget = target.clone().sub(this.position);
    toTarget.y = target.y - this.position.y;
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

  canDetectTarget(target) {
    if (!target || !target.position) return false;
    const toTarget = target.position.clone().sub(this.position);
    const dist = toTarget.length();
    if (dist > this.detectionRange) return false;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation).normalize();
    const dirToTarget = toTarget.clone().normalize();
    const angle = Math.acos(forward.dot(dirToTarget));
    return angle < this.fieldOfView / 2;
  }

  acquireTarget(targets) {
    let best = null, bestScore = Infinity;
    if (!targets || !Array.isArray(targets)) return null;
    for (const t of targets) {
      if (this.canDetectTarget(t)) {
        const d = this.position.distanceTo(t.position);
        if (d < bestScore) {
          best = t;
          bestScore = d;
        }
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

  fireWeaponAtPlayer() {
    // Predictive targeting: aim at intercept point
    const player = window.playerAircraft;
    if (!player) return;
    // Estimate projectile speed: use equipped weapon or default
    let projectileSpeed = 600; // Default fallback (m/s)
    if (this.equippedWeapon && this.equippedWeapon.projectileType && this.equippedWeapon.projectileType.speed) {
      projectileSpeed = this.equippedWeapon.projectileType.speed;
    } else if (this.equippedWeapon && this.equippedWeapon.speed) {
      projectileSpeed = this.equippedWeapon.speed;
    }
    const targetPos = player.position.clone();
    const targetVel = player.velocity ? player.velocity.clone() : new THREE.Vector3();
    const intercept = this.computeInterceptPoint(targetPos, targetVel, projectileSpeed);
    this.setLockedTarget(intercept);
    this.fireWeapon();
  }

  isUnderAttack() {
    // Placeholder: randomly simulate being under attack
    return Math.random() < 0.02; // ~2% chance per frame (to be replaced by real logic)
  }

  startEvasionManeuver() {
    this.evasionActive = true;
    // Optionally trigger a roll or random direction
  }

  updateEvasion(dt) {
    if (!this.evasionActive) return;
    // Simple: random evasive movement
    const rand = Math.random();
    if (rand < 0.33) this.applyRoll((Math.random() - 0.5) * 0.15);
    if (rand < 0.66) this.applyYaw((Math.random() - 0.5) * 0.12);
    if (rand > 0.66) this.applyPitch((Math.random() - 0.5) * 0.12);
    this.applyThrust(12000);
  }

  endEvasionManeuver() {
    this.evasionActive = false;
  }
}
