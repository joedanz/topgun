// src/input/GamepadInputMapper.js
// Gamepad controls for desktop browsers
import { InputMapper } from './InputHandler';

export class GamepadInputMapper extends InputMapper {
  constructor(options = {}) {
    super();
    this.options = Object.assign({
      sensitivity: 1.0
    }, options);
    this.buttonMap = {
      0: 'fire', // A
      1: 'secondary', // B
      2: 'special', // X
      3: 'menu', // Y
      // Weapon switching
      4: 'prevWeapon', // LB
      5: 'nextWeapon', // RB
      12: 'selectWeapon1', // D-pad Up
      13: 'selectWeapon2', // D-pad Down
      14: 'selectWeapon3', // D-pad Left
      15: 'selectWeapon4', // D-pad Right
    };

    this.axisMap = {
      0: 'moveX', // left stick X
      1: 'moveY', // left stick Y
      2: 'aimX', // right stick X
      3: 'aimY', // right stick Y
    };
    this._polling = false;
    this._startPolling();
  }

  _startPolling() {
    if (this._polling) return;
    this._polling = true;
    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (gamepads[0]) {
        const gp = gamepads[0];
        // Axes
        for (const axis in this.axisMap) {
          const val = gp.axes[axis] * this.options.sensitivity;
          if (Math.abs(val) > 0.1) {
            this.mapInput(this.axisMap[axis], this.axisMap[axis], val);
          } else {
            this.mapInput(this.axisMap[axis], this.axisMap[axis], 0);
          }
        }
        // Buttons
        for (const btn in this.buttonMap) {
          this.mapInput(this.buttonMap[btn], this.buttonMap[btn], gp.buttons[btn].pressed);
        }
      }
      if (this._polling) requestAnimationFrame(poll);
    };
    poll();
  }

  setSensitivity(s) {
    this.options.sensitivity = s;
  }

  rebindButton(oldBtn, newBtn) {
    if (this.buttonMap[oldBtn]) {
      this.buttonMap[newBtn] = this.buttonMap[oldBtn];
      delete this.buttonMap[oldBtn];
    }
  }
}
