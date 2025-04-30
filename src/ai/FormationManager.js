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
    // For now, only V-formation is implemented
    // Slot 0: leader, then alternate left/right
    formation.assignments.clear();
    let slot = 0;
    formation.assignments.set(leader, 0);
    let left = true, offset = 1;
    for (const m of members) {
      if (m === leader) continue;
      formation.assignments.set(m, left ? -offset : offset);
      if (!left) offset++;
      left = !left;
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
    // Placeholder: can add dynamic spacing, tactical logic, etc.
    // For now, static spacing and type
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
        // Compute offset from leader based on slot and formation type
        const leader = formation.leader;
        const spacing = formation.spacing;
        let offsetVec = new THREE.Vector3();
        if (slot === 0) {
          offsetVec.set(0, 0, 0); // Leader at center
        } else {
          // For V-formation: alternate left/right, behind leader
          const side = slot < 0 ? -1 : 1;
          const rank = Math.abs(slot);
          offsetVec.set(side * spacing * rank, 0, -spacing * rank);
        }
        // Transform offset relative to leader's orientation
        const leaderPos = leader.position.clone();
        const leaderRot = leader.rotation.clone();
        offsetVec.applyQuaternion(leaderRot);
        const worldPos = leaderPos.add(offsetVec);
        const role = slot === 0 ? 'leader' : 'wingman';
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
