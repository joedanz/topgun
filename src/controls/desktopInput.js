// src/controls/desktopInput.js
import { InputAbstraction } from './inputAbstraction';

/**
 * Handles desktop keyboard and mouse input, mapping to the InputAbstraction actions.
 * @param {InputAbstraction} input
 */
export function setupDesktopInput(input) {
  // Keyboard
  const keyState = {};
  window.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
    update();
  });
  window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
    update();
  });

  // Mouse
  let mouseDown = false;
  window.addEventListener('mousedown', () => { mouseDown = true; input.setState('fire', true); });
  window.addEventListener('mouseup', () => { mouseDown = false; input.setState('fire', false); });

  // Mouse movement for aiming
  let mouseAim = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => {
    mouseAim.x = e.movementX || 0;
    mouseAim.y = e.movementY || 0;
    input.setState('aim', { ...mouseAim });
  });

  function update() {
    // WASD/Arrow keys for movement (pitch/roll)
    const move = {
      x: (keyState['ArrowRight'] || keyState['KeyD'] ? 1 : 0) - (keyState['ArrowLeft'] || keyState['KeyA'] ? 1 : 0),
      y: (keyState['ArrowUp'] || keyState['KeyW'] ? 1 : 0) - (keyState['ArrowDown'] || keyState['KeyS'] ? 1 : 0),
    };
    input.setState('move', move);
    // Throttle (Shift = full, Ctrl = none)
    input.setState('throttle', keyState['ShiftLeft'] || keyState['ShiftRight'] ? 1 : 0);
    // Yaw (Q/E)
    input.setState('yaw', (keyState['KeyE'] ? 1 : 0) - (keyState['KeyQ'] ? 1 : 0));
  }
}
