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
    // AI state machine
    this.stateMachine = new StateMachine(
      createEnemyAIStates(this, config.aiConfig || {}),
      'patrol',
      config.aiConfig || {}
    );
    // For evasion
    this.evasionActive = false;
  }

  update(dt, gameContext = {}) {
    // AI logic
    this.stateMachine.update(dt, gameContext);
    // Call base update for physics
    super.update(dt);
  }

  // --- AI Helper Methods (stubs, to be implemented or connected) ---
  setPatrolRoute(route) {
    this.patrolRoute = route || [];
    this.currentWaypointIndex = 0;
  }

  steerTowards(target, dt, aggressive = false) {
    // Simple steering: adjust velocity/rotation toward target (to be improved)
    const toTarget = target.clone().sub(this.position);
    toTarget.y = target.y - this.position.y;
    const desiredDir = toTarget.clone().normalize();
    // Interpolate current forward to desired direction
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rotation);
    const lerped = forward.lerp(desiredDir, aggressive ? 0.13 : 0.07).normalize();
    const targetQuat = new THREE.Quaternion().setFromUnitVectors(forward, lerped);
    this.rotation.multiply(targetQuat);
    // Throttle up if far from target
    if (toTarget.length() > 200) this.applyThrust(aggressive ? 16000 : 9000);
  }

  canSeePlayer() {
    // Placeholder: always true if player exists
    return typeof window !== 'undefined' && window.playerAircraft;
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

  fireWeaponAtPlayer() {
    // Use base fireWeapon, pass player as target if missile
    this.setLockedTarget(window.playerAircraft);
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
