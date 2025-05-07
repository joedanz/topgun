// src/systems/AITelemetryTracker.js
// Tracks AI performance metrics for balancing and debugging

class AITelemetryTracker {
  constructor() {
    // Aggregate stats (reset each mission/session)
    this.globalStats = {
      shotsFired: 0,
      shotsHit: 0,
      kills: 0,
      deaths: 0,
      evasionAttempts: 0,
      evasionSuccesses: 0,
      countermeasuresDeployed: 0,
      maneuvers: {}, // maneuverName: count
      stateTime: { engage: 0, evade: 0, patrol: 0 },
    };
    // Per-AI stats (by id)
    this.perAI = {};
    this.listeners = [];
  }

  // --- Stat Update Methods ---
  recordEvent(aiId, type, data = {}) {
    // Ensure per-AI record
    if (!this.perAI[aiId]) {
      this.perAI[aiId] = {
        shotsFired: 0,
        shotsHit: 0,
        kills: 0,
        deaths: 0,
        evasionAttempts: 0,
        evasionSuccesses: 0,
        countermeasuresDeployed: 0,
        maneuvers: {},
        stateTime: { engage: 0, evade: 0, patrol: 0 },
      };
    }
    const aiStats = this.perAI[aiId];
    switch (type) {
      case 'shot':
        this.globalStats.shotsFired++;
        aiStats.shotsFired++;
        if (data.hit) {
          this.globalStats.shotsHit++;
          aiStats.shotsHit++;
        }
        break;
      case 'kill':
        this.globalStats.kills++;
        aiStats.kills++;
        break;
      case 'death':
        this.globalStats.deaths++;
        aiStats.deaths++;
        break;
      case 'evasionAttempt':
        this.globalStats.evasionAttempts++;
        aiStats.evasionAttempts++;
        if (data.success) {
          this.globalStats.evasionSuccesses++;
          aiStats.evasionSuccesses++;
        }
        break;
      case 'countermeasure':
        this.globalStats.countermeasuresDeployed++;
        aiStats.countermeasuresDeployed++;
        break;
      case 'maneuver':
        const m = data.name || 'unknown';
        this.globalStats.maneuvers[m] = (this.globalStats.maneuvers[m] || 0) + 1;
        aiStats.maneuvers[m] = (aiStats.maneuvers[m] || 0) + 1;
        break;
      case 'stateTime':
        // data: { state, dt }
        if (data.state && typeof data.dt === 'number') {
          this.globalStats.stateTime[data.state] = (this.globalStats.stateTime[data.state] || 0) + data.dt;
          aiStats.stateTime[data.state] = (aiStats.stateTime[data.state] || 0) + data.dt;
        }
        break;
    }
    this._emit(type, { aiId, ...data });
  }

  // --- Listener Methods ---
  onEvent(cb) {
    this.listeners.push(cb);
  }
  _emit(type, data) {
    this.listeners.forEach(cb => cb({ type, ...data, timestamp: Date.now() }));
  }

  // --- Query Methods ---
  getGlobalStats() {
    return { ...this.globalStats };
  }
  getAIStats(aiId) {
    return this.perAI[aiId] ? { ...this.perAI[aiId] } : null;
  }
  reset() {
    this.globalStats = {
      shotsFired: 0,
      shotsHit: 0,
      kills: 0,
      deaths: 0,
      evasionAttempts: 0,
      evasionSuccesses: 0,
      countermeasuresDeployed: 0,
      maneuvers: {},
      stateTime: { engage: 0, evade: 0, patrol: 0 },
    };
    this.perAI = {};
    this._emit('reset', {});
  }
}

// Singleton instance
const instance = new AITelemetryTracker();
export default instance;
