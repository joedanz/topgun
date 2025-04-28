// src/controls/mobileTiltInput.js
import { InputAbstraction } from './inputAbstraction';

/**
 * Sets up mobile tilt (gyroscope/accelerometer) controls for movement/aiming.
 * @param {InputAbstraction} input
 */
export function setupMobileTiltInput(input) {
  let enabled = false;
  let last = { x: 0, y: 0 };

  // Enable/disable tilt controls (call this from UI/settings)
  input.on('enableTilt', (val) => { enabled = !!val; });

  window.addEventListener('deviceorientation', (e) => {
    if (!enabled) return;
    // e.beta: front-back tilt (-180 to 180), e.gamma: left-right tilt (-90 to 90)
    // Normalize to -1..1
    const x = Math.max(-1, Math.min(1, e.gamma / 45)); // roll
    const y = Math.max(-1, Math.min(1, e.beta / 45));  // pitch
    last = { x, y };
    input.setState('move', last);
  });
}

/**
 * Example usage:
 * input.setState('enableTilt', true); // to enable tilt controls
 */
