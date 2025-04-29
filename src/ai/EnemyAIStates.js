// src/ai/EnemyAIStates.js
// Defines the state logic for enemy AI (patrol, engage, evade)
import * as THREE from 'three';

export function createEnemyAIStates(enemy, config = {}) {
  return {
    patrol: {
      onEnter() {
        // Assign a patrol route with randomization/perturbation for unpredictability
        enemy.setPatrolRoute(
          config.patrolRoute || null,
          {
            randomize: !!config.randomizePatrol,
            perturb: !!config.perturbPatrol
          }
        );
        enemy.currentWaypointIndex = 0;
        enemy.stateDebug = 'patrol';
      },
      onUpdate(dt) {
        // Move toward current waypoint
        const wp = enemy.getCurrentWaypoint && enemy.getCurrentWaypoint();
        if (!wp) return;

        // --- Collision Avoidance Stub ---
        // Terrain avoidance
        if (enemy.position.y < (config.minAltitude || 60)) {
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} avoiding terrain: skipping waypoint`);
          }
          enemy.advanceWaypoint && enemy.advanceWaypoint();
          return;
        }
        // Aircraft avoidance
        if (typeof window !== 'undefined' && window.enemies) {
          for (const other of window.enemies) {
            if (other !== enemy && enemy.position.distanceTo(other.position) < (config.avoidRadius || 120)) {
              if (window.DEBUG_AI_STATE) {
                console.log(`[AI] ${enemy.id} avoiding collision: skipping waypoint`);
              }
              enemy.advanceWaypoint && enemy.advanceWaypoint();
              return;
            }
          }
        }

        // --- Normal patrol logic below ---
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} patrol: waypoint #${enemy.currentWaypointIndex + 1} at (${wp.x.toFixed(1)}, ${wp.y.toFixed(1)}, ${wp.z.toFixed(1)})`);
        }
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
        // --- Detection logic for engagement ---
        enemy.updateDetection(dt);
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          if (enemy.detectingPlayer) {
            console.log(`[AI] ${enemy.id} detecting player: timer=${enemy.detectionTimer.toFixed(2)}s`);
          }
        }
        if (enemy.detectingPlayer && enemy.detectionTimer >= enemy.reactionTime) {
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} engaging player!`);
          }
          enemy.stateMachine.transition('engage');
        }
      },
      onExit() {
        // Optional: clear patrol state
      }
    },
    engage: {
      onEnter(gameContext = {}) {
        enemy.acquireTarget(gameContext && gameContext.targets ? gameContext.targets : [window.playerAircraft]);
        enemy.stateDebug = 'engage';
        enemy.lostTargetTimer = 0;
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} entering ENGAGE state`);
        }
      },
      onUpdate(dt, gameContext = {}) {
        // Re-acquire or lose target logic
        const targets = gameContext.targets || [window.playerAircraft];
        if (!enemy.currentTarget || !enemy.canDetectTarget(enemy.currentTarget)) {
          enemy.lostTargetTimer = (enemy.lostTargetTimer || 0) + dt;
          if (enemy.lostTargetTimer > 0.5) {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} lost target, returning to PATROL`);
            }
            enemy.stateMachine.transition('patrol');
            return;
          }
          // Optionally, try to acquire a new target
          enemy.acquireTarget(targets);
        } else {
          enemy.lostTargetTimer = 0;
          // Engage logic: steer toward, fire if in range/angle, etc.
          enemy.steerTowards(enemy.currentTarget.position, dt, true);
          if (enemy.canFireAtPlayer && enemy.canFireAtPlayer()) {
            enemy.fireWeaponAtPlayer();
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} firing at target ${enemy.currentTarget.id || '[unknown]'}`);
            }
          }
          // Tactical: evade if under attack or too close
          if (enemy.isUnderAttack && (enemy.isUnderAttack() || enemy.distanceToPlayer() < (config.evadeDistance || 300))) {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} switching to EVADE`);
            }
            enemy.stateMachine.transition('evade');
          }
        }
      },
      onExit() { enemy.lostTargetTimer = 0; }
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
