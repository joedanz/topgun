import { playerPerformanceTracker } from '../PlayerPerformanceTracker';

describe('PlayerPerformanceTracker', () => {
  beforeEach(() => playerPerformanceTracker.reset());

  it('should track shots fired and hits, and calculate accuracy', () => {
    playerPerformanceTracker.recordShot(true, true);
    playerPerformanceTracker.recordShot(true, false);
    playerPerformanceTracker.recordShot(true, true);
    const metrics = playerPerformanceTracker.getMetrics();
    expect(metrics.shotsFired).toBe(3);
    expect(metrics.shotsHit).toBe(2);
    expect(metrics.accuracy).toBeCloseTo(2/3);
  });

  it('should track kills, deaths, and streaks', () => {
    playerPerformanceTracker.recordKill();
    playerPerformanceTracker.recordKill();
    expect(playerPerformanceTracker.getMetrics().streak).toBe(2);
    playerPerformanceTracker.recordDeath();
    expect(playerPerformanceTracker.getMetrics().streak).toBe(0);
    expect(playerPerformanceTracker.getMetrics().killCount).toBe(2);
    expect(playerPerformanceTracker.getMetrics().deathCount).toBe(1);
  });

  it('should track damage dealt and taken', () => {
    playerPerformanceTracker.recordDamageDealt(50);
    playerPerformanceTracker.recordDamageTaken(30);
    const metrics = playerPerformanceTracker.getMetrics();
    expect(metrics.damageDealt).toBe(50);
    expect(metrics.damageTaken).toBe(30);
  });

  it('should track objectives completed', () => {
    playerPerformanceTracker.recordObjectiveCompleted();
    expect(playerPerformanceTracker.getMetrics().objectivesCompleted).toBe(1);
  });

  it('should track engaged and evading time', () => {
    playerPerformanceTracker.recordEngagedTime(1.5);
    playerPerformanceTracker.recordEvadingTime(2.0);
    const metrics = playerPerformanceTracker.getMetrics();
    expect(metrics.timeEngaged).toBeCloseTo(1.5);
    expect(metrics.timeEvading).toBeCloseTo(2.0);
  });
});
