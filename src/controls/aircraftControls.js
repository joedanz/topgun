// src/controls/aircraftControls.js
// Maps player input to aircraft physics forces (pitch, roll, yaw)

export class AircraftControls {
  constructor() {
    this.inputState = {
      pitch: 0, // -1 (down) to 1 (up)
      roll: 0,  // -1 (left) to 1 (right)
      yaw: 0,   // -1 (left) to 1 (right)
      throttle: 0 // 0 to 1
    };
    this.smoothing = 0.15; // input smoothing factor
  }

  // Update input state from keyboard/gamepad (expand as needed)
  updateFromKeyboard(keys) {
    // Example: keys = { ArrowUp: true, ArrowDown: false, ... }
    this.inputState.pitch = (keys.ArrowUp ? 1 : 0) + (keys.ArrowDown ? -1 : 0);
    this.inputState.roll = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    this.inputState.yaw = (keys.KeyA ? -1 : 0) + (keys.KeyD ? 1 : 0);
    this.inputState.throttle = keys.Space ? 1 : 0;
  }

  // Smooth input transitions
  applySmoothing(prevState) {
    for (const key in this.inputState) {
      this.inputState[key] = prevState[key] + this.smoothing * (this.inputState[key] - prevState[key]);
    }
  }

  // Get current input state
  getState() {
    return { ...this.inputState };
  }
}
