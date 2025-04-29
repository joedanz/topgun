// src/input/DesktopInputMapper.js
// Keyboard and mouse input mapper for desktop browsers
import { InputMapper } from './InputHandler';

export class DesktopInputMapper extends InputMapper {
  constructor(sensitivity = 1.0) {
    super();
    this.sensitivity = sensitivity;
    this.keyMap = {
      'KeyW': 'moveForward',
      'KeyA': 'moveLeft',
      'KeyS': 'moveBackward',
      'KeyD': 'moveRight',
      'ArrowUp': 'moveForward',
      'ArrowDown': 'moveBackward',
      'ArrowLeft': 'moveLeft',
      'ArrowRight': 'moveRight',
      'Space': 'fire',
      // Weapon switching
      'KeyQ': 'prevWeapon',
      'KeyE': 'nextWeapon',
      'Tab': 'nextWeapon',
      'ShiftLeft': 'prevWeapon',
      'Digit1': 'selectWeapon1',
      'Digit2': 'selectWeapon2',
      'Digit3': 'selectWeapon3',
      'Digit4': 'selectWeapon4',
    };
    this.heldKeys = new Set();
    this.mouseState = { dx: 0, dy: 0, active: false };
    this._setupListeners();
  }

  _setupListeners() {
    window.addEventListener('keydown', e => {
      if (this.keyMap[e.code]) {
        this.heldKeys.add(e.code);
        this.mapInput(this.keyMap[e.code], this.keyMap[e.code], true);
      }
    });
    window.addEventListener('keyup', e => {
      if (this.keyMap[e.code]) {
        this.heldKeys.delete(e.code);
        this.mapInput(this.keyMap[e.code], this.keyMap[e.code], false);
      }
    });
    window.addEventListener('mousemove', e => {
      this.mouseState.dx = e.movementX * this.sensitivity;
      this.mouseState.dy = e.movementY * this.sensitivity;
      this.mouseState.active = true;
      this.mapInput('aim', 'aim', { dx: this.mouseState.dx, dy: this.mouseState.dy });
    });
    window.addEventListener('mousedown', e => {
      // Optionally map mouse button to fire or other actions
      if (e.button === 0) this.mapInput('fire', 'fire', true);
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mapInput('fire', 'fire', false);
    });
  }

  setSensitivity(s) {
    this.sensitivity = s;
  }

  rebindKey(oldCode, newCode) {
    if (this.keyMap[oldCode]) {
      this.keyMap[newCode] = this.keyMap[oldCode];
      delete this.keyMap[oldCode];
    }
  }
}
