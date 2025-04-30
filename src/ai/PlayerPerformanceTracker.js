// src/ai/PlayerPerformanceTracker.js
// Tracks player performance metrics for dynamic difficulty adjustment

/**
 * PlayerPerformanceTracker
 * Tracks player stats (accuracy, kills, deaths, damage, streaks, time engaged/evading, etc.)
 * Used by RubberBandManager and AI systems to enable dynamic difficulty scaling.
 *
 * Usage:
 *   playerPerformanceTracker.recordShot(true, true);
 *   playerPerformanceTracker.recordKill();
 *   const metrics = playerPerformanceTracker.getMetrics();
 */
class PlayerPerformanceTracker {
  constructor() {
    this.reset();
  }

  /**
   * Resets all tracked metrics to zero.
   */
  reset() {
    this.metrics = {
      accuracy: 0,
      shotsFired: 0,
      shotsHit: 0,
      killCount: 0,
      deathCount: 0,
      damageDealt: 0,
      damageTaken: 0,
      objectivesCompleted: 0,
      timeEngaged: 0,
      timeEvading: 0,
      streak: 0,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Records a shot fired and/or hit.
   * @param {boolean} fired - Whether a shot was fired.
   * @param {boolean} hit - Whether the shot hit a target.
   */
  recordShot(fired = true, hit = false) {
    if (fired) this.metrics.shotsFired++;
    if (hit) this.metrics.shotsHit++;
    this.updateAccuracy();
  }

  /**
   * Records a kill and increments streak.
   */
  recordKill() {
    this.metrics.killCount++;
    this.metrics.streak++;
  }

  /**
   * Records a death and resets streak.
   */
  recordDeath() {
    this.metrics.deathCount++;
    this.metrics.streak = 0;
  }

  /**
   * Adds to total damage dealt.
   * @param {number} amount
   */
  recordDamageDealt(amount) {
    this.metrics.damageDealt += amount;
  }

  /**
   * Adds to total damage taken.
   * @param {number} amount
   */
  recordDamageTaken(amount) {
    this.metrics.damageTaken += amount;
  }

  /**
   * Increments objectives completed.
   */
  recordObjectiveCompleted() {
    this.metrics.objectivesCompleted++;
  }

  /**
   * Adds time spent engaged in combat.
   * @param {number} dt - Time in seconds
   */
  recordEngagedTime(dt) {
    this.metrics.timeEngaged += dt;
  }

  /**
   * Adds time spent evading.
   * @param {number} dt - Time in seconds
   */
  recordEvadingTime(dt) {
    this.metrics.timeEvading += dt;
  }

  /**
   * Updates accuracy metric based on shots fired/hit.
   * Called internally after recording a shot.
   */
  updateAccuracy() {
    const { shotsFired, shotsHit } = this.metrics;
    this.metrics.accuracy = shotsFired > 0 ? shotsHit / shotsFired : 0;
  }

  /**
   * Returns a copy of all tracked metrics.
   * @returns {object}
   */
  getMetrics() {
    return { ...this.metrics };
  }
}

export const playerPerformanceTracker = new PlayerPerformanceTracker();
