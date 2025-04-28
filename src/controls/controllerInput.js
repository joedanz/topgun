// src/controls/controllerInput.js
import { InputAbstraction } from './inputAbstraction';

/**
 * Sets up support for game controllers/joysticks on desktop platforms.
 * @param {InputAbstraction} input
 */
export function setupControllerInput(input) {
  let gamepadIndex = null;

  window.addEventListener('gamepadconnected', (e) => {
    gamepadIndex = e.gamepad.index;
    pollGamepad();
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    if (gamepadIndex === e.gamepad.index) gamepadIndex = null;
  });

  function pollGamepad() {
    if (gamepadIndex === null) return;
    const gamepad = navigator.getGamepads()[gamepadIndex];
    if (gamepad) {
      // Left stick: axes[0] (left/right), axes[1] (up/down)
      input.setState('move', { x: gamepad.axes[0] || 0, y: -(gamepad.axes[1] || 0) });
      // Right stick: axes[2] (aim X), axes[3] (aim Y)
      input.setState('aim', { x: gamepad.axes[2] || 0, y: -(gamepad.axes[3] || 0) });
      // Triggers for throttle (RT) and yaw (LT)
      input.setState('throttle', gamepad.buttons[7]?.value || 0);
      input.setState('yaw', (gamepad.buttons[5]?.pressed ? 1 : 0) - (gamepad.buttons[4]?.pressed ? 1 : 0));
      // Fire (A button)
      input.setState('fire', !!gamepad.buttons[0]?.pressed);
    }
    requestAnimationFrame(pollGamepad);
  }
}
