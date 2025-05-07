// src/systems/PlayerPerformanceTracker.js
// Tracks player performance stats and emits events for dynamic difficulty adjustment

class PlayerPerformanceTracker {
  constructor() {
    this.stats = {
      deaths: 0,
      kills: 0,
      missionsFailed: 0,
      missionsCompleted: 0,
      score: 0,
      hitAccuracy: 0, // 0-1
      shotsFired: 0,
      shotsHit: 0,
      streak: 0, // consecutive kills without death
    };
    this.listeners = [];
  }

  // --- Stat Update Methods ---
  recordDeath() {
    this.stats.deaths++;
    this.stats.streak = 0;
    this._emit('death', { ...this.stats });
  }

  recordKill() {
    this.stats.kills++;
    this.stats.streak++;
    this._emit('kill', { ...this.stats });
  }

  recordMissionFailed() {
    this.stats.missionsFailed++;
    this._emit('missionFailed', { ...this.stats });
  }

  recordMissionCompleted() {
    this.stats.missionsCompleted++;
    this._emit('missionCompleted', { ...this.stats });
  }

  addScore(amount) {
    this.stats.score += amount;
    this._emit('score', { ...this.stats });
  }

  recordShot(fired, hit = false) {
    this.stats.shotsFired++;
    if (hit) this.stats.shotsHit++;
    this.stats.hitAccuracy = this.stats.shotsFired > 0 ? this.stats.shotsHit / this.stats.shotsFired : 0;
    this._emit('shot', { ...this.stats });
  }

  // --- Listener Methods ---
  onEvent(cb) {
    this.listeners.push(cb);
  }

  _emit(type, stats) {
    this.listeners.forEach(cb => cb({ type, stats, timestamp: Date.now() }));
  }

  getStats() {
    return { ...this.stats };
  }

  reset() {
    this.stats = {
      deaths: 0,
      kills: 0,
      missionsFailed: 0,
      missionsCompleted: 0,
      score: 0,
      hitAccuracy: 0,
      shotsFired: 0,
      shotsHit: 0,
      streak: 0,
    };
    this._emit('reset', { ...this.stats });
  }
}

// Singleton instance
const instance = new PlayerPerformanceTracker();
export default instance;
