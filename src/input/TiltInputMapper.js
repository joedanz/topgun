// src/input/TiltInputMapper.js
// Device orientation (tilt) controls for mobile devices
import { InputMapper } from './InputHandler';

export class TiltInputMapper extends InputMapper {
  constructor(options = {}) {
    super();
    this.options = Object.assign({
      sensitivity: 1.0,
      deadZone: 0.07, // ~4 degrees
    }, options);
    this.calibration = { alpha: 0, beta: 0, gamma: 0 };
    this.calibrated = false;
    this._setupOrientationListener();
    this._setupCalibrationButton();
  }

  _setupOrientationListener() {
    window.addEventListener('deviceorientation', e => {
      if (!this.calibrated) return;
      // Calculate tilt relative to calibration
      const dx = ((e.gamma - this.calibration.gamma) / 45) * this.options.sensitivity; // left/right
      const dy = ((e.beta - this.calibration.beta) / 45) * this.options.sensitivity; // forward/back
      // Dead zone
      const moveX = Math.abs(dx) > this.options.deadZone ? dx : 0;
      const moveY = Math.abs(dy) > this.options.deadZone ? dy : 0;
      this.mapInput('tilt', 'tilt', { dx: moveX, dy: moveY });
    });
  }

  _setupCalibrationButton() {
    this.calibBtn = document.createElement('button');
    this.calibBtn.textContent = 'Calibrate Tilt';
    this.calibBtn.style.position = 'fixed';
    this.calibBtn.style.left = '50%';
    this.calibBtn.style.bottom = '20px';
    this.calibBtn.style.transform = 'translateX(-50%)';
    this.calibBtn.style.zIndex = 1002;
    this.calibBtn.style.fontSize = '1.1em';
    this.calibBtn.style.opacity = '0.7';
    this.calibBtn.style.padding = '10px 20px';
    this.calibBtn.style.borderRadius = '14px';
    document.body.appendChild(this.calibBtn);
    this.calibBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      this._calibrate();
    });
  }

  _calibrate() {
    // Use current orientation as neutral
    window.addEventListener('deviceorientation', e => {
      this.calibration = {
        alpha: e.alpha,
        beta: e.beta,
        gamma: e.gamma,
      };
      this.calibrated = true;
    }, { once: true });
  }

  setSensitivity(s) {
    this.options.sensitivity = s;
  }
  setDeadZone(z) {
    this.options.deadZone = z;
  }
}
