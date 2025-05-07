// FormationManager.js
// Manages AI aircraft formations, leader-follower logic, and tactical coordination
import * as THREE from 'three';

export const FORMATION_TYPES = {
  V: 'v',
  ECHELON_LEFT: 'echelon_left',
  ECHELON_RIGHT: 'echelon_right',
  LINE_ABREAST: 'line_abreast',
  TRAIL: 'trail',
};

const FORMATION_OFFSETS = {
  [FORMATION_TYPES.V]: [
    new THREE.Vector3(0, 0, 0), // Leader
    new THREE.Vector3(-20, 0, -15),
    new THREE.Vector3(20, 0, -15),
    new THREE.Vector3(-40, 0, -30),
    new THREE.Vector3(40, 0, -30),
  ],
  [FORMATION_TYPES.ECHELON_LEFT]: [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-20, 0, -15),
    new THREE.Vector3(-40, 0, -30),
    new THREE.Vector3(-60, 0, -45),
  ],
  [FORMATION_TYPES.ECHELON_RIGHT]: [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(20, 0, -15),
    new THREE.Vector3(40, 0, -30),
    new THREE.Vector3(60, 0, -45),
  ],
  [FORMATION_TYPES.LINE_ABREAST]: [
    new THREE.Vector3(-30, 0, 0),
    new THREE.Vector3(-10, 0, 0),
    new THREE.Vector3(10, 0, 0),
    new THREE.Vector3(30, 0, 0),
  ],
  [FORMATION_TYPES.TRAIL]: [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -20),
    new THREE.Vector3(0, 0, -40),
    new THREE.Vector3(0, 0, -60),
  ],
};

/**
 * FormationManager
 * Manages AI aircraft formations, leader-follower logic, and tactical coordination.
 *
 * Integrates with DifficultyManager to scale formation spacing and group behaviors by difficulty.
 * - Spacing and group aggression update automatically when difficulty changes.
 * - Use groupAggression for tactical command responsiveness (see issueCommand).
 */
export default class FormationManager {
  /**
   * @param {string} type - Formation type (see FORMATION_TYPES)
   * @param {EnemyAircraft[]} aircraftList - Initial aircraft in formation
   */
  constructor(type = FORMATION_TYPES.V, aircraftList = []) {
    this.type = type;
    this.aircraft = [...aircraftList]; // Array of EnemyAircraft
    this.leader = this.aircraft[0] || null;
    this.offsets = FORMATION_OFFSETS[type] || FORMATION_OFFSETS[FORMATION_TYPES.V];
    // Dynamic parameters
    this.spacing = 1.0; // Updated by difficulty
    this.groupAggression = 0.5; // Updated by difficulty
    this.command = null;
    this.tacticalState = 'patrol';
    this.lastLeaderId = this.leader ? this.leader.id : null;

    // Listen for difficulty changes
    if (typeof window !== 'undefined' && window.DifficultyManager) {
      window.DifficultyManager.onChange(this._onDifficultyChange.bind(this));
      this._onDifficultyChange(window.DifficultyManager.getCurrent());
    } else {
      // Fallback: import directly if needed
      try {
        const DifficultyManager = require('../ai/DifficultyManager').default;
        DifficultyManager.onChange(this._onDifficultyChange.bind(this));
        this._onDifficultyChange(DifficultyManager.getCurrent());
      } catch (e) { /* ignore */ }
    }
  }

  setType(type) {
    this.type = type;
    this.offsets = FORMATION_OFFSETS[type] || FORMATION_OFFSETS[FORMATION_TYPES.V];
  }

  setAircraft(aircraftList) {
    this.aircraft = [...aircraftList];
    this.leader = this.aircraft[0] || null;
    this.lastLeaderId = this.leader ? this.leader.id : null;
  }

  setSpacing(multiplier) {
    this.spacing = multiplier;
  }

  update(dt) {
    // Dynamically update spacing and groupAggression from DifficultyManager
    let diff = null;
    if (typeof window !== 'undefined' && window.DifficultyManager) {
      diff = window.DifficultyManager.getCurrent();
    } else {
      try {
        diff = require('../ai/DifficultyManager').default.getCurrent();
      } catch (e) {}
    }
    if (diff) {
      this.spacing = diff.formationSpacing;
      this.groupAggression = diff.groupAggression;
    }
    // Check if leader is alive, reassign if needed
    if (!this.leader || this.leader.destroyed) {
      this._assignNewLeader();
    }
    // Update positions for all aircraft
    for (let i = 0; i < this.aircraft.length; i++) {
      const ai = this.aircraft[i];
      if (!ai || ai === this.leader) continue;
      this._moveToFormationPosition(ai, i);
    }
    // TODO: handle tactical commands (attack, break, regroup)
  }

  _moveToFormationPosition(ai, idx) {
    if (!this.leader) return;
    const offset = (this.offsets[idx] || new THREE.Vector3()).clone().multiplyScalar(this.spacing);
    // Calculate world position for this follower
    const leaderPos = this.leader.position.clone();
    const leaderQuat = this.leader.rotation.clone();
    const relPos = offset.applyQuaternion(leaderQuat).add(leaderPos);
    // Smoothly steer toward assigned position
    const toTarget = relPos.sub(ai.position);
    const dist = toTarget.length();
    if (dist > 1) {
      const move = toTarget.normalize().multiplyScalar(Math.min(dist, 12)); // Max speed to catch up
      ai.velocity.lerp(move, 0.15); // Smoothing
    }
    // Optional: match leader's orientation
    // ai.rotation.slerp(leaderQuat, 0.07);
  }

  _assignNewLeader() {
    // Pick first alive aircraft as new leader
    for (const ai of this.aircraft) {
      if (ai && !ai.destroyed) {
        this.leader = ai;
        this.lastLeaderId = ai.id;
        break;
      }
    }
  }

  /**
   * Issue a tactical command to the formation (attack, break, regroup).
   * Group response speed/aggression is scaled by this.groupAggression (from DifficultyManager).
   * @param {string} cmd
   * @param {object} params
   */
  issueCommand(cmd, params = {}) {
    this.command = cmd;
    // TODO: Use this.groupAggression to determine how quickly/decisively the group responds
    // Example: setTimeout(() => this._executeCommand(cmd, params), (1 - this.groupAggression) * 2000);
    // For now, this is a stub.
    // TODO: handle tactical commands (attack, break, regroup, etc.)
  }

  debugDraw(scene) {
    // Draw lines from leader to each follower
    if (!this.leader || !scene) return;
    for (let i = 1; i < this.aircraft.length; i++) {
      const ai = this.aircraft[i];
      if (!ai) continue;
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const points = [this.leader.position.clone(), ai.position.clone()];
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, mat);
      scene.add(line);
    }
  }

  /**
   * Called when DifficultyManager changes difficulty. Updates formation parameters.
   * @param {object} diffPreset
   */
  _onDifficultyChange(diffPreset) {
    this.spacing = diffPreset.formationSpacing;
    this.groupAggression = diffPreset.groupAggression;
    // Could update other group behaviors here (e.g., regroupDelay)
  }
}

