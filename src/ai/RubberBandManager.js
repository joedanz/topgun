// src/ai/RubberBandManager.js
// Dynamically adjusts AI difficulty based on player performance (rubber-banding)

import { difficultyManager } from './DifficultyManager';
import { playerPerformanceTracker } from './PlayerPerformanceTracker';

class RubberBandManager {
  constructor() {
    this.lastAdjustment = Date.now();
    this.cooldown = 5000; // ms between adjustments
    this.maxStep = 0.15; // Max change per adjustment (per param)
    this.paramBounds = {
      reactionTime: [0.25, 2.0],
      accuracy: [0.5, 1.0],
      aggressiveness: [0.4, 1.0],
      tactics: [0.4, 1.0],
    };
  }

  update() {
    const now = Date.now();
    if (now - this.lastAdjustment < this.cooldown) return;
    this.lastAdjustment = now;

    const metrics = playerPerformanceTracker.getMetrics();
    // Simple logic: if player is dominating, increase difficulty; if struggling, decrease
    let delta = 0;
    if (metrics.killCount - metrics.deathCount > 3 || metrics.streak >= 3) {
      delta = this.maxStep;
    } else if (metrics.deathCount - metrics.killCount > 2) {
      delta = -this.maxStep;
    } else if (metrics.accuracy > 0.7 && metrics.killCount > 1) {
      delta = this.maxStep / 2;
    } else if (metrics.accuracy < 0.3 && metrics.deathCount > 0) {
      delta = -this.maxStep / 2;
    }

    if (delta !== 0) {
      this.adjustDifficulty(delta);
    }
  }

  adjustDifficulty(delta) {
    const params = ['reactionTime', 'accuracy', 'aggressiveness', 'tactics'];
    params.forEach(param => {
      let value = difficultyManager.getParam(param);
      let [min, max] = this.paramBounds[param];
      // For reactionTime, higher = easier; for others, higher = harder
      if (param === 'reactionTime') {
        value = Math.max(min, Math.min(max, value - delta));
      } else {
        value = Math.max(min, Math.min(max, value + delta));
      }
      difficultyManager.setParam(param, value);
      if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
        console.log(`[RubberBand] Adjusted ${param} to ${value.toFixed(3)} (delta: ${delta})`);
      }
    });
  }
}

export const rubberBandManager = new RubberBandManager();
