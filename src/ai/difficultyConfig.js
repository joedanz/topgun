// src/ai/difficultyConfig.js
// Central configuration for AI difficulty presets

export const difficultyConfig = {
  easy: {
    reactionTime: 0.8,      // seconds
    accuracy: 0.5,          // 0 (worst) to 1 (perfect)
    aggressiveness: 0.4,    // 0 (timid) to 1 (reckless)
    tactics: 'basic',       // or 'advanced'
    commsDelay: 1.0,        // seconds
    // Add more parameters as needed
  },
  medium: {
    reactionTime: 0.5,
    accuracy: 0.7,
    aggressiveness: 0.6,
    tactics: 'standard',
    commsDelay: 0.7,
  },
  hard: {
    reactionTime: 0.2,
    accuracy: 0.9,
    aggressiveness: 0.9,
    tactics: 'advanced',
    commsDelay: 0.3,
  }
};
