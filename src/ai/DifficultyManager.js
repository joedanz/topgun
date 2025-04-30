// src/ai/DifficultyManager.js
// Singleton for managing current AI difficulty and exposing parameters
import { difficultyConfig } from './difficultyConfig.js';

class DifficultyManager {
  constructor() {
    this.current = 'medium';
  }

  setDifficulty(level) {
    if (difficultyConfig[level]) this.current = level;
  }

  getDifficulty() {
    return this.current;
  }

  getParam(param) {
    return difficultyConfig[this.current][param];
  }

  getAllParams() {
    return difficultyConfig[this.current];
  }
}

export const difficultyManager = new DifficultyManager();
