// src/ai/EnemyAIStates.js
// Defines the state logic for enemy AI (patrol, engage, evade)
import * as THREE from 'three';

export function createEnemyAIStates(enemy, config = {}) {
  return {
    patrol: {
      onEnter() {
        // Optionally pick a new patrol route/waypoint
        enemy.setPatrolRoute(config.patrolRoute || null);
        enemy.currentWaypointIndex = 0;
        enemy.stateDebug = 'patrol';
      },
      onUpdate(dt) {
        // Move toward current waypoint
        const wp = enemy.getCurrentWaypoint && enemy.getCurrentWaypoint();
        if (!wp) return;
        const toWP = wp.clone().sub(enemy.position);
        const waypointRadius = config.waypointRadius || 80;
        if (toWP.length() < waypointRadius) {
          enemy.advanceWaypoint && enemy.advanceWaypoint();
        } else {
          // Smooth steering and throttle toward waypoint
          enemy.steerTowards(wp, dt, false);
          // Optionally clamp speed here for patrol
          if (enemy.getSpeed && typeof config.patrolSpeed === 'number') {
            if (enemy.getSpeed() > config.patrolSpeed) {
              enemy.applyThrust(-4000); // slow down gently
            }
          }
        }
        // Transition to engage if player in range/LOS
        if (enemy.canSeePlayer && enemy.distanceToPlayer() < (config.engageDistance || 1200)) {
          enemy.stateMachine.transition('engage');
        }
      },
      onExit() {
        // Optional: clear patrol state
      }
    },
    engage: {
      onEnter() {
        enemy.stateDebug = 'engage';
      },
      onUpdate(dt) {
        // Track and attack player
        if (enemy.canSeePlayer) {
          enemy.steerTowards(enemy.getPlayerPosition(), dt, true);
          if (enemy.canFireAtPlayer()) {
            enemy.fireWeaponAtPlayer();
          }
        }
        // Evade if under attack or too close
        if (enemy.isUnderAttack() || enemy.distanceToPlayer() < (config.evadeDistance || 300)) {
          enemy.stateMachine.transition('evade');
        }
        // Return to patrol if player lost
        if (!enemy.canSeePlayer) {
          enemy.stateMachine.transition('patrol');
        }
      },
      onExit() {}
    },
    evade: {
      onEnter() {
        enemy.stateDebug = 'evade';
        enemy.startEvasionManeuver();
      },
      onUpdate(dt) {
        // Perform evasive maneuver
        enemy.updateEvasion(dt);
        // Return to engage if safe
        if (!enemy.isUnderAttack() && enemy.distanceToPlayer() > (config.evadeDistance || 300)) {
          enemy.stateMachine.transition('engage');
        }
      },
      onExit() {
        enemy.endEvasionManeuver();
      }
    }
  };
}
