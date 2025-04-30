// src/ai/EnemyAIStates.js
// Defines the state logic for enemy AI (patrol, engage, evade)
import * as THREE from 'three';

import { difficultyManager } from './DifficultyManager';

export function createEnemyAIStates(enemy, config = {}) {
  return {
    patrol: {
      onEnter() {
        // --- DIFFICULTY PARAMS ---
        enemy.reactionTime = difficultyManager.getParam('reactionTime');
        enemy.aimError = 1 - difficultyManager.getParam('accuracy'); // Lower is better aim
        enemy.aggressiveness = difficultyManager.getParam('aggressiveness');
        enemy.tactics = difficultyManager.getParam('tactics');
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} DIFFICULTY:`, {
            reactionTime: enemy.reactionTime,
            aimError: enemy.aimError,
            aggressiveness: enemy.aggressiveness,
            tactics: enemy.tactics
          });
        }
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
        // --- DIFFICULTY PARAMS ---
        enemy.reactionTime = difficultyManager.getParam('reactionTime');
        enemy.aimError = 1 - difficultyManager.getParam('accuracy');
        enemy.aggressiveness = difficultyManager.getParam('aggressiveness');
        enemy.tactics = difficultyManager.getParam('tactics');
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} DIFFICULTY:`, {
            reactionTime: enemy.reactionTime,
            aimError: enemy.aimError,
            aggressiveness: enemy.aggressiveness,
            tactics: enemy.tactics
          });
        }
        enemy.acquireTarget(gameContext && gameContext.targets ? gameContext.targets : [window.playerAircraft]);
        enemy.stateDebug = 'engage';
        enemy.lostTargetTimer = 0;
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} entering ENGAGE state`);
        }
      },
      onUpdate(dt, gameContext = {}) {
        // Always re-acquire best target each frame for dynamic prioritization
        const targets = gameContext.targets || [window.playerAircraft];
        enemy.acquireTarget(targets);
        if (!enemy.currentTarget || !enemy.canDetectTarget(enemy.currentTarget)) {
          enemy.lostTargetTimer = (enemy.lostTargetTimer || 0) + dt;
          if (enemy.lostTargetTimer > 0.5) {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} lost target, returning to PATROL`);
            }
            enemy.stateMachine.transition('patrol');
            return;
          }
        } else {
          enemy.lostTargetTimer = 0;
          // --- Tactical engagement logic ---
          const tactical = enemy.assessTacticalSituation ? enemy.assessTacticalSituation() : { canAttack: false };
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} tactical:`, tactical);
          }
          // Steer toward target (with aggression if needsManeuver)
          enemy.steerTowards(enemy.currentTarget.position, dt, tactical.needsManeuver);
          // Fire if in good attack position
          if (
            tactical.canAttack &&
            enemy.canFireAtTarget &&
            enemy.currentTarget &&
            enemy.canFireAtTarget(enemy.currentTarget)
          ) {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} can fire at target ${enemy.currentTarget.id || '[unknown]'}`);
            }
            enemy.fireWeaponAtTarget(enemy.currentTarget);
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              const weapon = enemy.equippedWeapon;
              const aimError = enemy.aimError !== undefined ? enemy.aimError : 0.05;
              console.log(`[AI] ${enemy.id} fired ${weapon ? weapon.name : '[unknown weapon]'} at ${enemy.currentTarget.id || '[unknown]'} with aimError=${aimError}`);
            }
          }
          // Tactical: evade if under attack or at a disadvantage
          if (enemy.isUnderAttack && enemy.isUnderAttack()) {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} switching to EVADE (under attack)`);
            }
            enemy.stateMachine.transition('evade');
          }
        }
      },
      onExit() { enemy.lostTargetTimer = 0; }
    },
    evade: {
      onEnter() {
        // --- DIFFICULTY PARAMS ---
        enemy.reactionTime = difficultyManager.getParam('reactionTime');
        enemy.aimError = 1 - difficultyManager.getParam('accuracy');
        enemy.aggressiveness = difficultyManager.getParam('aggressiveness');
        enemy.tactics = difficultyManager.getParam('tactics');
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} DIFFICULTY:`, {
            reactionTime: enemy.reactionTime,
            aimError: enemy.aimError,
            aggressiveness: enemy.aggressiveness,
            tactics: enemy.tactics
          });
        }
        enemy.stateDebug = 'evade';
        enemy.startEvasionManeuver();
        enemy._evasionStartTime = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      },
      onUpdate(dt) {
        // Perform evasive maneuver
        enemy.updateEvasion(dt);
        // Recovery/re-engagement logic: Only return to engage if safe and minimum evasion time elapsed
        // --- TUNABLE: Minimum evasion duration and safe distance scale with difficulty ---
        // Lower aimError = harder AI = shorter evasion, closer re-engage
        const aimError = enemy.aimError !== undefined ? enemy.aimError : 0.05;
        const minDurationBase = (config.evadeMinDurationBase !== undefined) ? config.evadeMinDurationBase : 1.0;
        const minDurationScale = (config.evadeMinDurationScale !== undefined) ? config.evadeMinDurationScale : 2.5;
        const minEvasionDuration = minDurationBase + aimError * minDurationScale; // e.g. 1.0s (ace) to 3.5s (rookie)
        const safeDistBase = (config.evadeSafeDistBase !== undefined) ? config.evadeSafeDistBase : 180;
        const safeDistScale = (config.evadeSafeDistScale !== undefined) ? config.evadeSafeDistScale : 500;
        const safeDistance = safeDistBase + aimError * safeDistScale; // e.g. 180m (ace) to 680m (rookie)
        const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        const evasionTime = enemy._evasionStartTime ? (now - enemy._evasionStartTime) / 1000 : 0;
        // Optionally, check for safe distance from all threats (player and projectiles)
        let safeFromThreats = true;
        if (typeof window !== 'undefined' && window.sceneProjectiles) {
          for (const proj of window.sceneProjectiles) {
            if (proj && proj.target === enemy && proj.type === 'missile' && proj.locked) {
              safeFromThreats = false;
              break;
            }
          }
        }
        if (!enemy.isUnderAttack() && enemy.distanceToPlayer() > safeDistance && evasionTime > minEvasionDuration && safeFromThreats) {
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} completed evasion, re-engaging after ${evasionTime.toFixed(2)}s (min: ${minEvasionDuration.toFixed(2)}s, safeDist: ${safeDistance.toFixed(0)}m, aimError: ${aimError})`);
          }
          enemy.stateMachine.transition('engage');
        }
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} completed evasion, re-engaging after ${evasionTime.toFixed(2)}s`);
          }
          enemy.stateMachine.transition('engage');
        }
      },
      onExit() {
        enemy.endEvasionManeuver();
        delete enemy._evasionStartTime;
      }
    }
  };
}
