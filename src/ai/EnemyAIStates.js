// src/ai/EnemyAIStates.js
// Defines the state logic for enemy AI (patrol, engage, evade)
import * as THREE from 'three';

/**
 * Factory function to create enemy AI state objects (patrol, engage, evade) with logic for each state.
 * @param {EnemyAircraft} enemy - The AI-controlled enemy aircraft instance.
 * @param {object} [config={}] - AI configuration options for patrol, engagement, and evasion.
 * @returns {object} State definitions for use with a StateMachine.
 */
export function createEnemyAIStates(enemy, config = {}) {
  return {
    patrol: {
      /**
       * Called when entering the patrol state.
       * Sets up patrol route and resets waypoint index.
       * Side Effects: Modifies enemy state, route, and debug state.
       */
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
      /**
       * Called when entering the engage state.
       * Acquires a target and resets lost target timer.
       * @param {object} [gameContext={}] - Optional context with targets array.
       * Side Effects: Sets debug state, resets timers.
       */
      onEnter(gameContext = {}) {
        enemy.acquireTarget(gameContext && gameContext.targets ? gameContext.targets : [window.playerAircraft]);
        enemy.stateDebug = 'engage';
        enemy.lostTargetTimer = 0;
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} entering ENGAGE state`);
        }
      },
      /**
       * Called every frame in engage state.
       * Handles dynamic target acquisition, pursuit, and checks for loss of target or threats.
       * Transitions to patrol or evade as appropriate.
       * @param {number} dt - Delta time in seconds.
       * @param {object} [gameContext={}] - Optional context with targets array.
       */
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
          if (tactical.canAttack && enemy.canFireAtTarget && enemy.canFireAtTarget()) {
            enemy.fireWeaponAtTarget();
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} firing at target ${enemy.currentTarget.id || '[unknown]'}`);
            }
          }
          // Tactical: evade if under attack or at a disadvantage
          // --- Evasion Cooldown: block rapid re-entry ---
          if (enemy.isUnderAttack && enemy.isUnderAttack()) {
            if (enemy._evasionCooldown && enemy._evasionCooldown > 0) {
              if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
                console.log(`[AI] ${enemy.id} evade blocked by cooldown (${enemy._evasionCooldown.toFixed(2)}s left)`);
              }
            } else {
              if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
                console.log(`[AI] ${enemy.id} switching to EVADE (under attack)`);
              }
              enemy.stateMachine.transition('evade');
            }
          }
        }
      },
      /**
       * Called when exiting the engage state.
       * Side Effects: Resets lost target timer.
       */
      onExit() { enemy.lostTargetTimer = 0; }
    },
    evade: {
      /**
       * Called when entering the evade state.
       * Sets evasion parameters based on difficulty, triggers evasion maneuver, and resets timers.
       * Side Effects: Modifies enemy evasion aggression, timers, and debug state.
       */
  /**
   * Called when entering the evade state.
   * Sets evasion parameters based on difficulty, triggers evasion maneuver, and resets timers.
   * Side Effects: Modifies enemy evasion aggression, timers, and debug state.
   */
      onEnter() {
        // --- Difficulty scaling for evasion ---
        // Use config.difficulty if present (easy, medium, hard)
        const difficulty = config.difficulty || 'medium';
        // Set evasion parameters based on difficulty
        let minEvadeTime = 1.7, maneuverAggression = 0.6, cmProbability = 0.5;
        if (difficulty === 'easy') {
          minEvadeTime = 2.2; maneuverAggression = 0.45; cmProbability = 0.3;
        } else if (difficulty === 'hard') {
          minEvadeTime = 1.0; maneuverAggression = 0.85; cmProbability = 0.75;
        } else if (difficulty === 'medium') {
          minEvadeTime = 1.7; maneuverAggression = 0.6; cmProbability = 0.5;
        }
        enemy._evadeMinTime = minEvadeTime;
        enemy._evasionAggression = maneuverAggression;
        enemy._cmProbability = cmProbability;
        enemy.stateDebug = 'evade';
        enemy.startEvasionManeuver && enemy.startEvasionManeuver();
        enemy._evadeTimer = 0;
        if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
          console.log(`[AI] ${enemy.id} entering EVADE state (difficulty: ${difficulty}, minEvadeTime: ${minEvadeTime}s)`);
        }
      },
      onUpdate(dt) {
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
        // Require minimum evasion duration before recovery
        const minEvadeTime = enemy._evadeMinTime || config.minEvadeTime || 1.7;
        // Configurable: require distance check only if config.evadeDistance is set
        let requireDistance = typeof config.evadeDistance !== 'undefined';
        let safeDistance = requireDistance ? (enemy.distanceToPlayer() > config.evadeDistance) : true;
        if (enemy._evadeTimer >= minEvadeTime) {
          if (!enemy.isUnderAttack() && safeDistance) {
            if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
              console.log(`[AI] ${enemy.id} recovery: transitioning from EVADE to ENGAGE (timer: ${enemy._evadeTimer.toFixed(2)}s, threat: ${enemy.isUnderAttack()}, safeDistance: ${safeDistance})`);
            }
            // Set cooldown before AI can re-enter evade
            enemy._evasionCooldown = (typeof config.evasionCooldown === 'number') ? config.evasionCooldown : 1.2;
            enemy.stateMachine.transition('engage');
          } else {
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
