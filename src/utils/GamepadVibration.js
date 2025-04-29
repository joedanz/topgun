// GamepadVibration.js
// Utility for triggering controller vibration via Gamepad API

/**
 * Triggers vibration on all connected gamepads that support it.
 * @param {number} duration - Duration in ms
 * @param {number} strong - 0..1 (strong motor)
 * @param {number} weak - 0..1 (weak motor)
 */
export function vibrateGamepads(duration = 120, strong = 0.7, weak = 0.4) {
  if (!navigator.getGamepads) return;
  const pads = navigator.getGamepads();
  for (const pad of pads) {
    if (!pad || !pad.vibrationActuator) continue;
    try {
      pad.vibrationActuator.playEffect('dual-rumble', {
        duration,
        strongMagnitude: strong,
        weakMagnitude: weak,
      });
    } catch (e) {
      // Ignore unsupported
    }
  }
}
