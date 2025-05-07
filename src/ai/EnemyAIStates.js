// src/ai/EnemyAIStates.js
// Defines the state logic for enemy AI (patrol, engage, evade)
import * as THREE from 'three';

/**
 * Factory function to create enemy AI state objects (patrol, engage, evade) with logic for each state.
 * @param {EnemyAircraft} enemy - The AI-controlled enemy aircraft instance.
 * @param {object} [config={}] - AI configuration options for patrol, engagement, and evasion.
 * @returns {object} State definitions for use with a StateMachine.
 */
import DifficultyManager from './DifficultyManager';

export function createEnemyAIStates(enemy, config = {}) {
  // Helper to get current difficulty settings
  function getDiff() {
    return DifficultyManager.getCurrent();
  }
  return {
    patrol: {
      /**
       * Called when entering the patrol state.
       * Sets up patrol route and resets waypoint index.
       * Side Effects: Modifies enemy state, route, and debug state.
       */
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
        // Set difficulty-scaled detection and reaction
        const diff = getDiff();
        enemy.detectionRange = diff.detectionRange;
        enemy.fieldOfView = diff.fieldOfView;
        enemy.reactionTime = diff.reactionTime;
        enemy.stateDebug = 'patrol';
      },
      onUpdate(dt) {
        // Always update difficulty-scaled detection/reaction
        const diff = getDiff();
        enemy.detectionRange = diff.detectionRange;
        enemy.fieldOfView = diff.fieldOfView;
        enemy.reactionTime = diff.reactionTime;

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
            if (other !== enemy && other.position.distanceTo(enemy.position) < 40) {
              // Simple collision avoidance: skip waypoint
              enemy.advanceWaypoint && enemy.advanceWaypoint();
              return;
            }
          }
        }
        // --- Throttle/Speed Management ---
        if (enemy.velocity && enemy.velocity.length() > enemy.maxSpeed * 0.98) {
          enemy.applyThrust(-4000); // slow down gently
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
      /**
       * Called when entering the engage state.
       * Acquires a target and resets lost target timer.
       * @param {object} [gameContext={}] - Optional context with targets array.
       * Side Effects: Sets debug state, resets timers.
       */
      onEnter(gameContext = {}) {
        // Set difficulty-scaled aggression and tactics
        const diff = getDiff();
        enemy.reactionTime = diff.reactionTime;
        // --- Advanced tactics ---
        enemy._tacticalComplexity = diff.tacticalComplexity;
        // High tactical complexity: break formation for solo attack
        if (enemy.formation && diff.tacticalComplexity > 0.8 && Math.random() < 0.4) {
          enemy.leaveFormation && enemy.leaveFormation();
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} breaks formation for advanced attack`);
          }
        }
        // Feint disengagement (retreat, then re-engage)
        if (diff.tacticalComplexity > 0.9 && Math.random() < 0.15) {
          enemy._feintRetreat = true;
          enemy._feintTimer = 0;
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} will feint disengagement`);
          }
        } else {
          enemy._feintRetreat = false;
        }
        // Multi-step maneuvers: queue a second maneuver
        if (diff.tacticalComplexity > 0.6 && Math.random() < 0.25) {
          enemy._queuedManeuver = true;
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} will chain maneuvers`);
          }
        } else {
          enemy._queuedManeuver = false;
        }
        // Coordinated attack: signal to nearby AI
        if (diff.tacticalComplexity > 0.8 && typeof window !== 'undefined' && window.enemies && Math.random() < 0.2) {
          const allies = window.enemies.filter(e => e !== enemy && e.stateMachine && e.stateMachine.currentState === 'engage' && e.position.distanceTo(enemy.position) < 1800);
          if (allies.length > 0) {
            allies.forEach(a => { a._coordinatedAttackTarget = enemy.target; });
            if (window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} coordinates attack with ${allies.length} allies`);
            }
          }
        }
        // Set AI parameters for this engage state
        enemy.aimAccuracy = diff.aimAccuracy;
        enemy.maneuverAggression = diff.maneuverAggression;
        enemy.tacticalComplexity = diff.tacticalComplexity;
        enemy.acquireTarget(gameContext && gameContext.targets ? gameContext.targets : [window.playerAircraft]);
        enemy.stateDebug = 'engage';
        enemy.lostTargetTimer = 0;
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} entering ENGAGE state`);
        }
      },
      onUpdate(dt, gameContext = {}) {
        // Update difficulty-scaled aggression and tactics
        const diff = getDiff();
        enemy.reactionTime = diff.reactionTime;
        enemy.aimAccuracy = diff.aimAccuracy;
        enemy.maneuverAggression = diff.maneuverAggression;
        enemy.tacticalComplexity = diff.tacticalComplexity;
        // Always re-acquire best target each frame for dynamic prioritization
        const targets = gameContext.targets || [window.playerAircraft];
        enemy.acquireTarget(targets);
        // --- Feint disengagement logic ---
        if (enemy._feintRetreat) {
          enemy._feintTimer = (enemy._feintTimer || 0) + dt;
          // Retreat for 2-3 seconds, then re-engage
          if (enemy._feintTimer < 2.2 + Math.random()) {
            // Move away from player (simple vector away)
            if (enemy.target && enemy.position && enemy.target.position) {
              const away = enemy.position.clone().sub(enemy.target.position).normalize();
              enemy.applyThrust(enemy.maxAccel * 0.8);
              enemy.applyPitch(0.15);
              enemy.applyRoll((Math.random() < 0.5 ? 1 : -1) * 0.25);
              enemy.applyYaw((Math.random() < 0.5 ? 1 : -1) * 0.18);
              enemy.position.add(away.multiplyScalar(dt * 180));
              if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
                console.log(`[AI] ${enemy.id} feinting retreat...`);
              }
            }
            return;
          } else {
            enemy._feintRetreat = false;
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} re-engages after feint`);
            }
          }
        }
        // --- Multi-step maneuvers logic ---
        if (enemy._queuedManeuver && Math.random() < 0.13) {
          // After a maneuver, chain a second one
          const maneuvers = [
            () => enemy.performBarrelRoll(Math.random() < 0.5 ? 1 : -1),
            () => enemy.performImmelmann(Math.random() < 0.5 ? 1 : -1),
            () => enemy.performVerticalScissors(),
            () => enemy.performLowYoYo(Math.random() < 0.5 ? 1 : -1),
            () => enemy.performHighYoYo(Math.random() < 0.5 ? 1 : -1),
            () => enemy.performRollingScissors(Math.random() < 0.5 ? 1 : -1)
          ];
          maneuvers[Math.floor(Math.random() * maneuvers.length)]();
          // Only trigger once per engage
          enemy._queuedManeuver = false;
        }
        // --- Coordinated attack: focus fire on target if flagged ---
        if (enemy._coordinatedAttackTarget) {
          enemy.target = enemy._coordinatedAttackTarget;
          // Optionally, boost aggression
          enemy._evasionAggression = Math.max(enemy._evasionAggression || 0.8, 1.0);
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} focusing fire (coordinated attack)`);
          }
        }
        // --- Target reacquisition and loss logic ---
        if (!enemy.target || enemy.target.destroyed) {
          enemy.lostTargetTimer = (enemy.lostTargetTimer || 0) + dt;
          if (enemy.lostTargetTimer > 2.5) {
            enemy.stateMachine.transition('patrol');
          }
          return;
        }
        // Lost target: increment lost timer
        enemy.lostTargetTimer = (enemy.lostTargetTimer || 0) + dt;
        if (enemy.lostTargetTimer > 2.5) {
          enemy.stateMachine.transition('patrol');
        }
        enemy.lostTargetTimer = 0;
        // --- Evasion Cooldown: block rapid re-entry ---
        if (enemy.isUnderAttack && enemy.isUnderAttack()) {
          if (enemy._evasionCooldown && enemy._evasionCooldown > 0) {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] evade blocked by cooldown (${enemy._evasionCooldown.toFixed(2)}s left)`);
            }
          } else {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] switching to EVADE (under attack)`);
            }
            enemy.stateMachine.transition('evade');
          }
        }
      },
      onExit() {
        enemy.lostTargetTimer = 0;
      }
    },
    evade: {
      /**
       * Called when entering the evade state.
       * Sets evasion parameters based on difficulty, triggers evasion maneuver, and resets timers.
       * Side Effects: Modifies enemy evasion aggression, timers, and debug state.
       */
      onEnter() {
        // --- Difficulty scaling for evasion ---
        const diff = getDiff();
        enemy._evadeMinTime = Math.max(0.8, 2.0 - diff.maneuverAggression * 1.2); // Lower min time for higher aggression
        enemy._evasionAggression = diff.maneuverAggression;
        enemy._cmProbability = 0.4 + 0.5 * diff.maneuverAggression; // More aggressive = more likely to use countermeasures
        enemy.stateDebug = 'evade';
        enemy.startEvasionManeuver && enemy.startEvasionManeuver();
        enemy._evadeTimer = 0;
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} entering EVADE state (difficulty: ${DifficultyManager.current}, minEvadeTime: ${enemy._evadeMinTime}s)`);
        }
      },
      onUpdate(dt) {
        // Update evasion parameters from difficulty
        const diff = getDiff();
        enemy._evasionAggression = diff.maneuverAggression;
        enemy._cmProbability = 0.4 + 0.5 * diff.maneuverAggression;
        // --- Evasion Cooldown ---
        if (enemy._evasionCooldown && enemy._evasionCooldown > 0) {
          enemy._evasionCooldown -= dt;
          if (enemy._evasionCooldown < 0) enemy._evasionCooldown = 0;
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} evasion cooldown active: ${enemy._evasionCooldown.toFixed(2)}s left`);
          }
        }
        // Pass aggression and CM probability to evasion logic
        enemy.updateEvasion(dt, {
          aggression: enemy._evasionAggression,
          cmProbability: enemy._cmProbability
        });
        enemy._evadeTimer = (enemy._evadeTimer || 0) + dt;
        // End evasion after min time and if not under attack
        if (enemy._evadeTimer > enemy._evadeMinTime && !enemy.isUnderAttack()) {
          // Set cooldown before AI can re-enter evade
          enemy._evasionCooldown = (typeof config.evasionCooldown === 'number') ? config.evasionCooldown : 1.2;
          enemy.stateMachine.transition('engage');
        } else {
          if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
            console.log(`[AI] ${enemy.id} remains in EVADE (timer: ${enemy._evadeTimer.toFixed(2)}s, threat: ${enemy.isUnderAttack()}, safeDistance: ${safeDistance})`);
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} remains in EVADE (timer: ${enemy._evadeTimer.toFixed(2)}s, threat: ${enemy.isUnderAttack()}, safeDistance: ${safeDistance})`);
            }
          }
        }
      },
      onExit() {
        enemy.endEvasionManeuver && enemy.endEvasionManeuver();
        enemy._evadeTimer = 0;
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} exiting EVADE state`);
        }
      },
    },

  };
}
