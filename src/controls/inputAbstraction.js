// src/controls/inputAbstraction.js
/**
 * Abstract input actions: move, aim, fire, throttle, etc.
 * Platform-specific handlers map events to these actions.
 */
export class InputAbstraction {
  constructor() {
    this.state = {
      move: { x: 0, y: 0 }, // pitch/roll or joystick axes
      aim: { x: 0, y: 0 },  // mouse/touch/gyro
      fire: false,
      throttle: 0,
      yaw: 0,
      // Add more as needed
    };
    this.callbacks = {};
  }

  /**
   * Register a callback for an abstract action (e.g., 'move', 'fire').
   * @param {string} action
   * @param {function} callback
   */
  on(action, callback) {
    if (!this.callbacks[action]) this.callbacks[action] = [];
    this.callbacks[action].push(callback);
  }

  /**
   * Update the state for an action, and notify listeners.
   * @param {string} action
   * @param {any} value
   */
  setState(action, value) {
    this.state[action] = value;
    if (this.callbacks[action]) {
      this.callbacks[action].forEach(cb => cb(value));
    }
  }

  /**
   * Get the current state for an action.
   */
  getState(action) {
    return this.state[action];
  }

  /**
   * Reset all input state (e.g., on platform switch)
   */
  reset() {
    for (const key in this.state) {
      if (typeof this.state[key] === 'object') {
        for (const sub in this.state[key]) this.state[key][sub] = 0;
      } else {
        this.state[key] = 0;
      }
    }
  }
}

/**
 * Example usage:
 * const input = new InputAbstraction();
 * input.on('move', (val) => { ... });
 * input.setState('move', { x: 1, y: 0 });
 */
