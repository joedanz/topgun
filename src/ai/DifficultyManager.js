// src/ai/DifficultyManager.js
/**
 * DifficultyManager
 * Centralized manager for AI difficulty scaling and balancing.
 *
 * - Maintains difficulty presets (easy, medium, hard) with parameters for AI behaviors and performance.
 * - Allows dynamic difficulty adjustment at runtime via setDifficulty().
 * - Notifies listeners (AI, UI, etc.) of changes for real-time adaptation.
 * - Used by EnemyAIStates, EnemyAircraft, and debug tools for consistent scaling.
 *
 * Usage:
 *   import DifficultyManager from './ai/DifficultyManager';
 *   DifficultyManager.setDifficulty('hard');
 *   const params = DifficultyManager.getCurrent();
 *
 * See also: PlayerPerformanceTracker (for dynamic adjustment), DDADebugPanel (for visualization)
 */

// --- Difficulty Presets ---
// Each preset defines AI parameters for a given difficulty level.
const DIFFICULTY_PRESETS = {
  easy: {
    label: 'Easy',
    reactionTime: 1.2, // seconds
    aimAccuracy: 0.55, // 0-1
    maneuverAggression: 0.4, // 0-1
    tacticalComplexity: 0.2, // 0-1
    maxSpeedMultiplier: 0.85,
    maxTurnRateMultiplier: 0.85,
    formationSpacing: 1.5, // Loose formation
    groupAggression: 0.35, // Slow, cautious group reactions
    regroupDelay: 3.0 // Delay before regrouping (seconds)
  },
  medium: {
    label: 'Medium',
    reactionTime: 0.8, // seconds
    aimAccuracy: 0.7, // 0-1
    maneuverAggression: 0.7, // 0-1
    tacticalComplexity: 0.6, // 0-1
    maxSpeedMultiplier: 1.0,
    maxTurnRateMultiplier: 1.0,
    formationSpacing: 1.0, // Standard formation
    groupAggression: 0.6, // Balanced group reactions
    regroupDelay: 2.0 // Moderate regroup delay
  },
  hard: {
    label: 'Hard',
    reactionTime: 0.5, // seconds
    aimAccuracy: 0.92, // 0-1
    maneuverAggression: 1.0, // 0-1
    tacticalComplexity: 1.0, // 0-1
    maxSpeedMultiplier: 1.12,
    maxTurnRateMultiplier: 1.13,
    formationSpacing: 0.8, // Tight formation
    groupAggression: 0.9, // Fast, aggressive group reactions
    regroupDelay: 1.0 // Quick regroup
  }
};

/**
 * @class DifficultyManager
 * @classdesc Singleton for managing AI difficulty presets and runtime scaling.
 *
 * - Use getCurrent() to access the current difficulty parameters.
 * - Call setDifficulty(name) to change difficulty (notifies listeners).
 * - Use onChange(cb) to subscribe to difficulty changes (for AI, UI, etc.).
 *
 * Example parameters: reactionTime, aimAccuracy, maneuverAggression, tacticalComplexity, etc.
 *
 * Integration points:
 *   - EnemyAIStates: Reads parameters for state logic (reaction, tactics, etc.)
 *   - EnemyAircraft: Scales aircraft performance (speed, turn rate, etc.)
 *   - PlayerPerformanceTracker: May trigger setDifficulty() based on player stats
 *   - DDADebugPanel: Visualizes current state and changes
 */
import PlayerPerformanceTracker from '../systems/PlayerPerformanceTracker';

class DifficultyManager {
  /**
   * Constructs the DifficultyManager with default presets and listeners.
   */
  constructor() {
    /**
     * @type {Object} Preset definitions for each difficulty level.
     */
    this.presets = DIFFICULTY_PRESETS;
    /**
     * @type {string} Name of the current difficulty preset.
     */
    this.current = 'medium';
    /**
     * @type {Function[]} Subscribers to difficulty changes.
     */
    this.listeners = [];
    /**
     * @type {Object} Rubber-banding state (updated live)
     */
    this.rubberBand = {
      reactionTimeAdj: 0,
      aimAccuracyAdj: 0,
      maneuverAggressionAdj: 0,
      tacticalComplexityAdj: 0
    };
    // Subscribe to player performance events
    if (PlayerPerformanceTracker && PlayerPerformanceTracker.onEvent) {
      PlayerPerformanceTracker.onEvent(this._onPlayerPerformance.bind(this));
    }
  }

  /**
   * Get a preset by name.
   * @param {string} name - The preset name ('easy', 'medium', 'hard').
   * @returns {Object} The preset parameters.
   */
  getPreset(name) {
    return this.presets[name] || this.presets.medium;
  }

  /**
   * Get the currently active difficulty preset.
   * @returns {Object} The active preset parameters.
   */
  getCurrent() {
    // Get base preset
    const base = this.getPreset(this.current);
    // Apply rubber-banding adjustments (clamped)
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    return {
      ...base,
      reactionTime: clamp(base.reactionTime + this.rubberBand.reactionTimeAdj, 0.25, 2.0),
      aimAccuracy: clamp(base.aimAccuracy + this.rubberBand.aimAccuracyAdj, 0.3, 1.0),
      maneuverAggression: clamp(base.maneuverAggression + this.rubberBand.maneuverAggressionAdj, 0.2, 1.2),
      tacticalComplexity: clamp(base.tacticalComplexity + this.rubberBand.tacticalComplexityAdj, 0.0, 1.2)
    };
  }

  /**
   * Set the current difficulty level and notify listeners if changed.
   * @param {string} name - The new difficulty preset name.
   */
  setDifficulty(name) {
    if (this.presets[name] && this.current !== name) {
      this.current = name;
      this._notifyListeners();
    }
  }

  /**
   * Subscribe to difficulty changes.
   * @param {Function} cb - Callback to invoke with new preset on change.
   */
  onChange(cb) {
    this.listeners.push(cb);
  }

  /**
   * Internal: Notifies all listeners of the current preset.
   * Called automatically after setDifficulty().
   * @private
   */
  _notifyListeners() {
    const preset = this.getCurrent();
    this.listeners.forEach(cb => cb(preset));
  }

  /**
   * Rubber-banding: Called on every player stat event.
   * Adjusts AI parameters to keep challenge fair.
   */
  _onPlayerPerformance(evt) {
    const stats = evt.stats;
    // --- Example logic: ---
    // If player is on a kill streak, boost AI; if dying a lot, ease AI
    // (Tune these numbers as needed for your game)
    let streak = stats.streak || 0;
    let deaths = stats.deaths || 0;
    let kills = stats.kills || 0;
    let hitAccuracy = stats.hitAccuracy || 0;
    // Calculate modifiers
    // More kills/streak = harder AI; more deaths = easier AI
    let reactionTimeAdj = 0;
    let aimAccuracyAdj = 0;
    let maneuverAggressionAdj = 0;
    let tacticalComplexityAdj = 0;
    // Streak: up to +0.3/-0.3
    reactionTimeAdj += clamp(-0.18 * streak, -0.3, 0.15);
    aimAccuracyAdj += clamp(0.06 * streak, -0.1, 0.18);
    maneuverAggressionAdj += clamp(0.08 * streak, -0.15, 0.20);
    tacticalComplexityAdj += clamp(0.09 * streak, -0.15, 0.20);
    // Deaths: up to +0.25 easier
    reactionTimeAdj += clamp(0.10 * deaths, 0, 0.25);
    aimAccuracyAdj += clamp(-0.04 * deaths, -0.25, 0);
    maneuverAggressionAdj += clamp(-0.05 * deaths, -0.15, 0);
    tacticalComplexityAdj += clamp(-0.04 * deaths, -0.15, 0);
    // Accuracy: if player is super accurate, AI gets tougher
    if (hitAccuracy > 0.45) {
      aimAccuracyAdj += clamp((hitAccuracy - 0.45) * 0.8, 0, 0.14);
      reactionTimeAdj += clamp(-(hitAccuracy - 0.45) * 0.5, -0.12, 0);
    }
    // Clamp all
    this.rubberBand = {
      reactionTimeAdj: clamp(reactionTimeAdj, -0.5, 0.5),
      aimAccuracyAdj: clamp(aimAccuracyAdj, -0.3, 0.3),
      maneuverAggressionAdj: clamp(maneuverAggressionAdj, -0.4, 0.4),
      tacticalComplexityAdj: clamp(tacticalComplexityAdj, -0.4, 0.4)
    };
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      console.log('[DDA] Rubber-banding updated:', this.rubberBand, 'Player stats:', stats);
    }
    // Optionally notify listeners (UI, debug panel)
    this._notifyListeners();
  }
}

// Singleton instance
const instance = new DifficultyManager();
export default instance;
export { DIFFICULTY_PRESETS };
