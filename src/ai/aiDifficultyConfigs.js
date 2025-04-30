// src/ai/aiDifficultyConfigs.js
export const aiDifficultyConfigs = {
  easy:   { aimError: 0.12, reactionTime: 1.0, predictionAccuracy: 0.5, minHitProbability: 0.2 },
  medium: { aimError: 0.06, reactionTime: 0.6, predictionAccuracy: 0.75, minHitProbability: 0.35 },
  hard:   { aimError: 0.02, reactionTime: 0.2, predictionAccuracy: 0.95, minHitProbability: 0.5 }
};
