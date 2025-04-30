import { difficultyManager } from '../DifficultyManager';

describe('DifficultyManager', () => {
  beforeEach(() => {
    difficultyManager.setDifficulty('medium');
  });

  it('should set and get the current difficulty', () => {
    difficultyManager.setDifficulty('easy');
    expect(difficultyManager.getDifficulty()).toBe('easy');
    difficultyManager.setDifficulty('hard');
    expect(difficultyManager.getDifficulty()).toBe('hard');
  });

  it('should get parameters for the current difficulty', () => {
    difficultyManager.setDifficulty('easy');
    expect(difficultyManager.getParam('reactionTime')).toBeDefined();
    expect(difficultyManager.getParam('accuracy')).toBeDefined();
  });

  it('should clamp parameter values within bounds', () => {
    difficultyManager.setParam('accuracy', 2.0);
    expect(difficultyManager.getParam('accuracy')).toBeLessThanOrEqual(1.0);
    difficultyManager.setParam('accuracy', -1.0);
    expect(difficultyManager.getParam('accuracy')).toBeGreaterThanOrEqual(0.0);
  });

  it('should allow updating parameters and reflect changes', () => {
    const oldAccuracy = difficultyManager.getParam('accuracy');
    difficultyManager.setParam('accuracy', oldAccuracy + 0.1);
    expect(difficultyManager.getParam('accuracy')).toBeCloseTo(Math.min(1.0, oldAccuracy + 0.1));
  });

  it('should get all parameters as an object', () => {
    const params = difficultyManager.getAllParams();
    expect(params).toHaveProperty('reactionTime');
    expect(params).toHaveProperty('accuracy');
    expect(params).toHaveProperty('aggressiveness');
    expect(params).toHaveProperty('tactics');
  });
});
