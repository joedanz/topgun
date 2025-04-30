import { difficultyManager } from '../DifficultyManager';
import { playerPerformanceTracker } from '../PlayerPerformanceTracker';
import { rubberBandManager } from '../RubberBandManager';

jest.useFakeTimers();

describe('RubberBandManager', () => {
  beforeEach(() => {
    difficultyManager.setDifficulty('medium');
    playerPerformanceTracker.reset();
    rubberBandManager.lastAdjustment = Date.now() - 10000; // ensure cooldown passed
  });

  it('should increase difficulty when player is dominating', () => {
    playerPerformanceTracker.metrics.killCount = 5;
    playerPerformanceTracker.metrics.deathCount = 1;
    playerPerformanceTracker.metrics.streak = 4;
    const before = difficultyManager.getParam('accuracy');
    rubberBandManager.update();
    const after = difficultyManager.getParam('accuracy');
    expect(after).toBeGreaterThan(before);
  });

  it('should decrease difficulty when player is struggling', () => {
    playerPerformanceTracker.metrics.killCount = 1;
    playerPerformanceTracker.metrics.deathCount = 4;
    playerPerformanceTracker.metrics.streak = 0;
    const before = difficultyManager.getParam('accuracy');
    rubberBandManager.update();
    const after = difficultyManager.getParam('accuracy');
    expect(after).toBeLessThan(before);
  });

  it('should not adjust if cooldown not passed', () => {
    rubberBandManager.lastAdjustment = Date.now();
    playerPerformanceTracker.metrics.killCount = 5;
    playerPerformanceTracker.metrics.deathCount = 1;
    const before = difficultyManager.getParam('accuracy');
    rubberBandManager.update();
    const after = difficultyManager.getParam('accuracy');
    expect(after).toBeCloseTo(before);
  });

  it('should clamp parameters within bounds', () => {
    playerPerformanceTracker.metrics.killCount = 100;
    playerPerformanceTracker.metrics.deathCount = 0;
    playerPerformanceTracker.metrics.streak = 100;
    for (let i = 0; i < 20; ++i) {
      rubberBandManager.lastAdjustment = Date.now() - 10000;
      rubberBandManager.update();
    }
    expect(difficultyManager.getParam('accuracy')).toBeLessThanOrEqual(1.0);
    expect(difficultyManager.getParam('reactionTime')).toBeGreaterThanOrEqual(0.25);
  });
});
