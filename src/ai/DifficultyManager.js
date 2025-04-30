// src/ai/DifficultyManager.js
// Singleton for managing current AI difficulty and exposing parameters
import { difficultyConfig } from './difficultyConfig.js';

class DifficultyManager {
  constructor() {
    this.current = 'medium';
    this._overrides = {};
  }

  setDifficulty(level) {
    if (difficultyConfig[level]) this.current = level;
  }

  getDifficulty() {
    return this.current;
  }

  getParam(param) {
    if (this._overrides[this.current] && this._overrides[this.current][param] !== undefined) {
      return this._overrides[this.current][param];
    }
    return difficultyConfig[this.current][param];
  }

  getAllParams() {
    return { ...difficultyConfig[this.current], ...(this._overrides[this.current] || {}) };
  }

  setParam(param, value) {
    if (!this._overrides[this.current]) this._overrides[this.current] = {};
    // Clamp numeric values to [0, 1] unless param is 'reactionTime' (allow 0.1-2.0)
    if (typeof value === 'number') {
      if (param === 'reactionTime') {
        value = Math.max(0.1, Math.min(2.0, value));
      } else {
        value = Math.max(0.0, Math.min(1.0, value));
      }
    }
    this._overrides[this.current][param] = value;
  }
}

export const difficultyManager = new DifficultyManager();
