// src/controls/mobileTouchInput.js
import { InputAbstraction } from './inputAbstraction';

/**
 * Sets up basic mobile touch controls using virtual joysticks.
 * @param {InputAbstraction} input
 */
export function setupMobileTouchInput(input) {
  // Create left joystick (for movement)
  const leftStick = createVirtualJoystick({
    id: 'left-joystick',
    position: 'left',
    onMove: (x, y) => input.setState('move', { x, y }),
  });
  // Create right joystick (for aiming/throttle)
  const rightStick = createVirtualJoystick({
    id: 'right-joystick',
    position: 'right',
    onMove: (x, y) => {
      input.setState('aim', { x, y });
      input.setState('throttle', y > 0.5 ? 1 : 0);
    },
  });
  // Fire button
  const fireBtn = document.createElement('button');
  fireBtn.id = 'fire-btn';
  fireBtn.innerText = 'FIRE';
  fireBtn.style.position = 'fixed';
  fireBtn.style.right = '8vw';
  fireBtn.style.bottom = '16vw';
  fireBtn.style.width = '18vw';
  fireBtn.style.height = '18vw';
  fireBtn.style.borderRadius = '50%';
  fireBtn.style.background = '#f33';
  fireBtn.style.color = '#fff';
  fireBtn.style.fontSize = '2em';
  fireBtn.style.opacity = '0.85';
  fireBtn.style.zIndex = '1002';
  fireBtn.ontouchstart = () => input.setState('fire', true);
  fireBtn.ontouchend = () => input.setState('fire', false);
  document.body.appendChild(fireBtn);
}

/**
 * Creates a simple virtual joystick DOM element.
 * @param {Object} opts - { id, position, onMove }
 * @returns {HTMLElement}
 */
function createVirtualJoystick({ id, position, onMove }) {
  const stick = document.createElement('div');
  stick.id = id;
  stick.style.position = 'fixed';
  stick.style.bottom = '8vw';
  stick.style.left = position === 'left' ? '8vw' : 'unset';
  stick.style.right = position === 'right' ? '8vw' : 'unset';
  stick.style.width = '22vw';
  stick.style.height = '22vw';
  stick.style.background = 'rgba(0,0,0,0.12)';
  stick.style.borderRadius = '50%';
  stick.style.zIndex = '1001';
  document.body.appendChild(stick);

  let active = false;
  let center = { x: 0, y: 0 };
  let last = { x: 0, y: 0 };

  stick.ontouchstart = (e) => {
    active = true;
    const rect = stick.getBoundingClientRect();
    center = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
    last = { x: 0, y: 0 };
  };
  stick.ontouchmove = (e) => {
    if (!active) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - center.x) / (stick.offsetWidth/2);
    const dy = (touch.clientY - center.y) / (stick.offsetHeight/2);
    last = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
    if (onMove) onMove(last.x, last.y);
  };
  stick.ontouchend = (e) => {
    active = false;
    last = { x: 0, y: 0 };
    if (onMove) onMove(0, 0);
  };
  return stick;
}
