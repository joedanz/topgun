// src/input/MobileTouchInputMapper.js
// Touch controls with virtual joysticks for mobile devices
import { InputMapper } from './InputHandler';

export class MobileTouchInputMapper extends InputMapper {
  constructor(options = {}) {
    super();
    this.options = Object.assign({
      joystickSize: 80,
      joystickDeadZone: 0.15,
      joystickOpacity: 0.5,
    }, options);
    this._setupJoysticks();
    this._setupTouchListeners();
  }

  _setupJoysticks() {
    // Create joystick DOM elements (left: movement, right: aim)
    this.leftJoystick = this._createJoystick('left');
    this.rightJoystick = this._createJoystick('right');
    document.body.appendChild(this.leftJoystick.container);
    document.body.appendChild(this.rightJoystick.container);
  }

  _createJoystick(side) {
    // Basic joystick DOM structure
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style[side === 'left' ? 'left' : 'right'] = '20px';
    container.style.bottom = '20px';
    container.style.width = this.options.joystickSize + 'px';
    container.style.height = this.options.joystickSize + 'px';
    container.style.opacity = this.options.joystickOpacity;
    container.style.zIndex = 1000;
    container.style.touchAction = 'none';
    container.style.background = 'rgba(64,64,64,0.1)';
    container.style.borderRadius = '50%';
    const stick = document.createElement('div');
    stick.style.width = '60%';
    stick.style.height = '60%';
    stick.style.background = 'rgba(128,128,128,0.4)';
    stick.style.borderRadius = '50%';
    stick.style.position = 'absolute';
    stick.style.left = '20%';
    stick.style.top = '20%';
    container.appendChild(stick);
    return { container, stick, active: false, startX: 0, startY: 0, dx: 0, dy: 0 };
  }

  _setupTouchListeners() {
    // Movement joystick (left)
    this.leftJoystick.container.addEventListener('touchstart', e => this._onJoystickStart(e, this.leftJoystick), { passive: false });
    this.leftJoystick.container.addEventListener('touchmove', e => this._onJoystickMove(e, this.leftJoystick, 'move'), { passive: false });
    this.leftJoystick.container.addEventListener('touchend', e => this._onJoystickEnd(e, this.leftJoystick, 'move'), { passive: false });
    // Aim joystick (right)
    this.rightJoystick.container.addEventListener('touchstart', e => this._onJoystickStart(e, this.rightJoystick), { passive: false });
    this.rightJoystick.container.addEventListener('touchmove', e => this._onJoystickMove(e, this.rightJoystick, 'aim'), { passive: false });
    this.rightJoystick.container.addEventListener('touchend', e => this._onJoystickEnd(e, this.rightJoystick, 'aim'), { passive: false });
    // Fire button
    // --- Weapon Switching Buttons ---
    this.prevWeaponButton = document.createElement('button');
    this.prevWeaponButton.textContent = '<';
    this.prevWeaponButton.style.position = 'fixed';
    this.prevWeaponButton.style.right = '140px';
    this.prevWeaponButton.style.bottom = (40 + this.options.joystickSize) + 'px';
    this.prevWeaponButton.style.zIndex = 1001;
    this.prevWeaponButton.style.fontSize = '1.1em';
    this.prevWeaponButton.style.opacity = '0.65';
    this.prevWeaponButton.style.padding = '10px 18px';
    this.prevWeaponButton.style.borderRadius = '14px';
    document.body.appendChild(this.prevWeaponButton);
    this.prevWeaponButton.addEventListener('touchstart', e => { e.preventDefault(); this.mapInput('prevWeapon', 'prevWeapon', true); });
    this.prevWeaponButton.addEventListener('touchend', e => { e.preventDefault(); this.mapInput('prevWeapon', 'prevWeapon', false); });

    this.nextWeaponButton = document.createElement('button');
    this.nextWeaponButton.textContent = '>';
    this.nextWeaponButton.style.position = 'fixed';
    this.nextWeaponButton.style.right = '80px';
    this.nextWeaponButton.style.bottom = (40 + this.options.joystickSize) + 'px';
    this.nextWeaponButton.style.zIndex = 1001;
    this.nextWeaponButton.style.fontSize = '1.1em';
    this.nextWeaponButton.style.opacity = '0.65';
    this.nextWeaponButton.style.padding = '10px 18px';
    this.nextWeaponButton.style.borderRadius = '14px';
    document.body.appendChild(this.nextWeaponButton);
    this.nextWeaponButton.addEventListener('touchstart', e => { e.preventDefault(); this.mapInput('nextWeapon', 'nextWeapon', true); });
    this.nextWeaponButton.addEventListener('touchend', e => { e.preventDefault(); this.mapInput('nextWeapon', 'nextWeapon', false); });

    // --- Fire Button ---
    this.fireButton = document.createElement('button');
    this.fireButton.textContent = 'FIRE';
    this.fireButton.style.position = 'fixed';
    this.fireButton.style.right = '30px';
    this.fireButton.style.bottom = (40 + this.options.joystickSize) + 'px';
    this.fireButton.style.zIndex = 1001;
    this.fireButton.style.fontSize = '1.3em';
    this.fireButton.style.opacity = '0.7';
    this.fireButton.style.padding = '12px 24px';
    this.fireButton.style.borderRadius = '16px';
    document.body.appendChild(this.fireButton);
    this.fireButton.addEventListener('touchstart', e => { e.preventDefault(); this.mapInput('fire', 'fire', true); });
    this.fireButton.addEventListener('touchend', e => { e.preventDefault(); this.mapInput('fire', 'fire', false); });
  }

  _onJoystickStart(e, joystick) {
    e.preventDefault();
    const touch = e.touches[0];
    joystick.active = true;
    joystick.startX = touch.clientX;
    joystick.startY = touch.clientY;
    joystick.dx = 0;
    joystick.dy = 0;
  }

  _onJoystickMove(e, joystick, action) {
    e.preventDefault();
    if (!joystick.active) return;
    const touch = e.touches[0];
    const dx = (touch.clientX - joystick.startX) / (this.options.joystickSize / 2);
    const dy = (touch.clientY - joystick.startY) / (this.options.joystickSize / 2);
    // Clamp to [-1,1]
    joystick.dx = Math.max(-1, Math.min(1, dx));
    joystick.dy = Math.max(-1, Math.min(1, dy));
    // Dead zone
    if (Math.abs(joystick.dx) < this.options.joystickDeadZone) joystick.dx = 0;
    if (Math.abs(joystick.dy) < this.options.joystickDeadZone) joystick.dy = 0;
    this.mapInput(action, action, { dx: joystick.dx, dy: joystick.dy });
  }

  _onJoystickEnd(e, joystick, action) {
    e.preventDefault();
    joystick.active = false;
    joystick.dx = 0;
    joystick.dy = 0;
    this.mapInput(action, action, { dx: 0, dy: 0 });
  }
}
