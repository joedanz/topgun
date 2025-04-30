import * as THREE from 'three';

/**
 * FormationManager manages groups of AI aircraft in coordinated formations.
 * Supports multiple formation types, leader-follower logic, and tactical state changes.
 */
export default class FormationManager {
  constructor() {
    this.formations = new Map(); // formationId -> formation data
    this.nextFormationId = 1;
  }

  /**
   * Create a new formation with given type and members.
   * @param {string} type - Formation type ('V', 'echelon', etc.)
   * @param {Array} members - Array of EnemyAircraft
   * @param {object} options - { leader, spacing }
   * @returns {number} formationId
   */
  createFormation(type, members, options = {}) {
    const formationId = this.nextFormationId++;
    const leader = options.leader || members[0];
    const spacing = options.spacing || 80;
    const formation = {
      id: formationId,
      type,
      members: [...members],
      leader,
      spacing,
      assignments: new Map(), // aircraft -> slot index
      tacticalState: 'patrol',
    };
    this.formations.set(formationId, formation);
    this.assignRoles(formation);
    return formationId;
  }

  /**
   * Assign roles and slots to members based on formation type.
   * For V-formation: slot 0 = leader, then alternate left/right.
   */
  assignRoles(formation) {
    const { type, members, leader } = formation;
    if (!members.length) return;
    formation.assignments.clear();
    switch (type) {
      case 'echelon':
        // Echelon right: slot 0 = leader, 1 = right, 2 = right 2, etc.
        formation.assignments.set(leader, 0);
        let idx = 1;
        for (const m of members) {
          if (m === leader) continue;
          formation.assignments.set(m, idx);
          idx++;
        }
        break;
      case 'line_abreast':
        // Line abreast: leader center, wingmen left/right
        formation.assignments.set(leader, 0);
        let leftIdx = -1, rightIdx = 1, toggle = true;
        for (const m of members) {
          if (m === leader) continue;
          formation.assignments.set(m, toggle ? leftIdx-- : rightIdx++);
          toggle = !toggle;
        }
        break;
      case 'V':
      default:
        // V-formation: leader, alternate left/right
        let slot = 0;
        formation.assignments.set(leader, 0);
        let left = true, offset = 1;
        for (const m of members) {
          if (m === leader) continue;
          formation.assignments.set(m, left ? -offset : offset);
          if (!left) offset++;
          left = !left;
        }
        break;
    }
  }

  /**
   * Remove an aircraft from all formations.
   */
  removeAircraft(aircraft) {
    for (const formation of this.formations.values()) {
      const idx = formation.members.indexOf(aircraft);
      if (idx !== -1) {
        formation.members.splice(idx, 1);
        formation.assignments.delete(aircraft);
        if (formation.leader === aircraft) {
          this.assignNewLeader(formation);
        }
      }
    }
  }

  /**
   * Assign a new leader if the current one is destroyed.
   */
  assignNewLeader(formation) {
    if (formation.members.length === 0) {
      formation.leader = null;
      return;
    }
    formation.leader = formation.members[0];
    this.assignRoles(formation);
  }

  /**
   * Update all formations each frame.
   */
  update(dt, context) {
    for (const formation of this.formations.values()) {
      this.updateFormation(formation, dt, context);
    }
  }

  /**
   * Update a single formation (spacing, tactical state, etc.)
   */
  updateFormation(formation, dt, context) {
    // Dynamic spacing: adjust based on leader's speed if available
    if (formation.leader && formation.leader.getSpeed) {
      const baseSpacing = formation.spacing;
      const speed = formation.leader.getSpeed();
      // Example: increase spacing at higher speeds (linear scale)
      formation.dynamicSpacing = baseSpacing + Math.min(Math.max((speed - 400) * 0.08, 0), 100);
    } else {
      formation.dynamicSpacing = formation.spacing;
    }
    // Example tactical logic: switch to 'engage' if any member detects a player
    if (context && context.detectedPlayer) {
      formation.tacticalState = 'engage';
    }
    // Could add more coordinated attack/retreat logic here
  }

  /**
   * Get the assigned world position and role for an aircraft in its formation.
   * Returns: { position: THREE.Vector3, role: string|null }
   */
  getAssignedPosition(aircraft) {
    for (const formation of this.formations.values()) {
      if (formation.members.includes(aircraft)) {
        const slot = formation.assignments.get(aircraft);
        if (slot === undefined) return null;
        const leader = formation.leader;
        // Use dynamicSpacing if available
        const spacing = formation.dynamicSpacing || formation.spacing;
        let offsetVec = new THREE.Vector3();
        switch (formation.type) {
          case 'echelon':
            // Echelon: all to right of leader
            offsetVec.set(spacing * slot, 0, -spacing * slot * 0.7);
            break;
          case 'line_abreast':
            // Line abreast: all at same z, spread on x
            offsetVec.set(spacing * slot, 0, 0);
            break;
          case 'V':
          default:
            if (slot === 0) {
              offsetVec.set(0, 0, 0);
            } else {
              const side = slot < 0 ? -1 : 1;
              const rank = Math.abs(slot);
              offsetVec.set(side * spacing * rank, 0, -spacing * rank);
            }
            break;
        }
        // Transform offset relative to leader's orientation
        const leaderPos = leader.position.clone();
        const leaderRot = leader.rotation.clone();
        offsetVec.applyQuaternion(leaderRot);
        const worldPos = leaderPos.add(offsetVec);
        const role = slot === 0 ? 'leader' : 'wingman';
        // --- Communication delay simulation ---
        // If difficulty is set, delay updates for non-leader based on difficulty
        let delayMs = 0;
        if (formation.difficulty && slot !== 0) {
          // Easy: 200-400ms, Hard: 30-80ms
          delayMs = formation.difficulty === 'easy' ? 200 + Math.random()*200 :
                    formation.difficulty === 'hard' ? 30 + Math.random()*50 :
                    100 + Math.random()*100;
        }
        // Store last update time per aircraft (simulate delay)
        if (!aircraft._formationLastUpdate) aircraft._formationLastUpdate = 0;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (delayMs && now - aircraft._formationLastUpdate < delayMs) {
          // Return previous position if within delay window
          return aircraft._formationLastAssignment || { position: worldPos, role };
        }
        aircraft._formationLastUpdate = now;
        aircraft._formationLastAssignment = { position: worldPos, role };
        return { position: worldPos, role };
      }
    }
    return null;
  }

  /**
   * Change the tactical state of a formation (e.g., 'patrol', 'engage', 'retreat')
   */
  setTacticalState(formationId, state) {
    const formation = this.formations.get(formationId);
    if (formation) {
      formation.tacticalState = state;
    }
  }

  /**
   * Change the type of a formation (e.g., switch from V to line_abreast)
   */
  setFormationType(formationId, type) {
    const formation = this.formations.get(formationId);
    if (formation) {
      formation.type = type;
      this.assignRoles(formation);
    }
  }
}
