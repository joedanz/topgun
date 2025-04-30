// src/ai/PlayerPerformanceTracker.js
// Tracks player performance metrics for dynamic difficulty adjustment

class PlayerPerformanceTracker {
  constructor() {
    this.reset();
  }

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

  recordShot(fired = true, hit = false) {
    if (fired) this.metrics.shotsFired++;
    if (hit) this.metrics.shotsHit++;
    this.updateAccuracy();
  }

  recordKill() {
    this.metrics.killCount++;
    this.metrics.streak++;
  }

  recordDeath() {
    this.metrics.deathCount++;
    this.metrics.streak = 0;
  }

  recordDamageDealt(amount) {
    this.metrics.damageDealt += amount;
  }

  recordDamageTaken(amount) {
    this.metrics.damageTaken += amount;
  }

  recordObjectiveCompleted() {
    this.metrics.objectivesCompleted++;
  }

  recordEngagedTime(dt) {
    this.metrics.timeEngaged += dt;
  }

  recordEvadingTime(dt) {
    this.metrics.timeEvading += dt;
  }

  updateAccuracy() {
    const { shotsFired, shotsHit } = this.metrics;
    this.metrics.accuracy = shotsFired > 0 ? shotsHit / shotsFired : 0;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}

export const playerPerformanceTracker = new PlayerPerformanceTracker();
