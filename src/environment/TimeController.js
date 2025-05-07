// TimeController.js - Manages in-game time progression for day/night cycle
export default class TimeController {
  constructor({
    dayLengthSeconds = 120, // Full day/night cycle duration in seconds
    startNormalizedTime = 0.25 // 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm
  } = {}) {
    this.dayLength = dayLengthSeconds;
    this.time = startNormalizedTime; // 0..1
    this.lastUpdate = performance.now() / 1000;
  }
  update() {
    const now = performance.now() / 1000;
    const dt = now - this.lastUpdate;
    this.lastUpdate = now;
    this.time = (this.time + dt / this.dayLength) % 1;
  }
  // Returns normalized time (0..1)
  getTime() {
    return this.time;
  }
  // Returns hour in 24h format (0..24)
  getHour() {
    return this.time * 24;
  }
}
