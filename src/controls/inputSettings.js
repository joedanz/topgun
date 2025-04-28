// src/controls/inputSettings.js
/**
 * Manages sensitivity and control customization settings for all input types.
 * Persists settings to localStorage and applies them to input processing.
 */
export class InputSettings {
  constructor() {
    this.defaults = {
      mouseSensitivity: 1.0,
      joystickSensitivity: 1.0,
      tiltSensitivity: 1.0,
      invertY: false,
      customMappings: {}, // e.g., { 'move': 'ArrowKeys', 'fire': 'Space' }
    };
    this.settings = { ...this.defaults, ...this.load() };
  }

  /**
   * Get a setting value.
   */
  get(key) {
    return this.settings[key];
  }

  /**
   * Set a setting value and persist.
   */
  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  /**
   * Reset to defaults.
   */
  reset() {
    this.settings = { ...this.defaults };
    this.save();
  }

  /**
   * Save settings to localStorage.
   */
  save() {
    localStorage.setItem('inputSettings', JSON.stringify(this.settings));
  }

  /**
   * Load settings from localStorage.
   */
  load() {
    try {
      return JSON.parse(localStorage.getItem('inputSettings')) || {};
    } catch {
      return {};
    }
  }
}

/**
 * Example usage:
 * const settings = new InputSettings();
 * settings.set('mouseSensitivity', 1.5);
 * const sens = settings.get('mouseSensitivity');
 */
