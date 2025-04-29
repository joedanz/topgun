// src/input/ControlSettingsMenu.js
// UI for control configuration and scheme selection
import { ControlSchemes } from './InputHandler';

export class ControlSettingsMenu {
  constructor({ inputHandler, mappers }) {
    this.inputHandler = inputHandler;
    this.mappers = mappers;
    this.menu = null;
    this._createMenu();
  }

  _createMenu() {
    this.menu = document.createElement('div');
    this.menu.style.position = 'fixed';
    this.menu.style.top = '30px';
    this.menu.style.right = '30px';
    this.menu.style.background = 'rgba(30,30,30,0.97)';
    this.menu.style.borderRadius = '18px';
    this.menu.style.padding = '28px 32px';
    this.menu.style.zIndex = 2000;
    this.menu.style.color = '#fff';
    this.menu.style.fontSize = '1.1em';
    this.menu.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
    this.menu.style.maxWidth = '340px';
    this.menu.style.display = 'flex';
    this.menu.style.flexDirection = 'column';
    this.menu.style.gap = '18px';

    // Title
    const title = document.createElement('div');
    title.textContent = 'Control Settings';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '1.3em';
    this.menu.appendChild(title);

    // Scheme selector
    const schemeLabel = document.createElement('label');
    schemeLabel.textContent = 'Control Scheme:';
    const schemeSelect = document.createElement('select');
    for (const name of Object.keys(ControlSchemes)) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
      schemeSelect.appendChild(opt);
    }
    schemeSelect.value = this.inputHandler.activeScheme || 'desktop';
    schemeSelect.onchange = () => {
      this.inputHandler.setActiveScheme(schemeSelect.value);
      this._saveSettings();
    };
    schemeLabel.appendChild(schemeSelect);
    this.menu.appendChild(schemeLabel);

    // Sensitivity controls
    const sensLabel = document.createElement('label');
    sensLabel.textContent = 'Sensitivity:';
    const sensInput = document.createElement('input');
    sensInput.type = 'range';
    sensInput.min = 0.1;
    sensInput.max = 2.0;
    sensInput.step = 0.01;
    sensInput.value = 1.0;
    sensInput.oninput = () => {
      for (const m of Object.values(this.mappers)) {
        if (typeof m.setSensitivity === 'function') m.setSensitivity(Number(sensInput.value));
      }
      this._saveSettings();
    };
    sensLabel.appendChild(sensInput);
    this.menu.appendChild(sensLabel);

    // Key/button rebinding UI (simplified)
    const rebindLabel = document.createElement('label');
    rebindLabel.textContent = 'Rebind Key/Button:';
    const oldInput = document.createElement('input');
    oldInput.placeholder = 'Current Key/Button';
    const newInput = document.createElement('input');
    newInput.placeholder = 'New Key/Button';
    const rebindBtn = document.createElement('button');
    rebindBtn.textContent = 'Rebind';
    rebindBtn.onclick = () => {
      for (const m of Object.values(this.mappers)) {
        if (typeof m.rebindKey === 'function') m.rebindKey(oldInput.value, newInput.value);
        if (typeof m.rebindButton === 'function') m.rebindButton(oldInput.value, newInput.value);
      }
      this._saveSettings();
    };
    rebindLabel.appendChild(oldInput);
    rebindLabel.appendChild(newInput);
    rebindLabel.appendChild(rebindBtn);
    this.menu.appendChild(rebindLabel);

    // UI scale control
    const uiScaleLabel = document.createElement('label');
    uiScaleLabel.textContent = 'UI Scale:';
    const uiScaleInput = document.createElement('input');
    uiScaleInput.type = 'range';
    uiScaleInput.min = 0.7;
    uiScaleInput.max = 1.4;
    uiScaleInput.step = 0.01;
    uiScaleInput.value = 1.0;
    uiScaleInput.style.width = '120px';
    uiScaleInput.oninput = () => {
      document.documentElement.style.setProperty('--ui-scale', uiScaleInput.value);
      this._saveSettings();
    };
    uiScaleLabel.appendChild(uiScaleInput);
    this.menu.appendChild(uiScaleLabel);

    // Platform-specific settings (tilt, joystick size)
    const tiltSensLabel = document.createElement('label');
    tiltSensLabel.textContent = 'Tilt Sensitivity:';
    const tiltSensInput = document.createElement('input');
    tiltSensInput.type = 'range';
    tiltSensInput.min = 0.1;
    tiltSensInput.max = 2.0;
    tiltSensInput.step = 0.01;
    tiltSensInput.value = 1.0;
    tiltSensInput.oninput = () => {
      if (this.mappers.tilt && typeof this.mappers.tilt.setSensitivity === 'function') {
        this.mappers.tilt.setSensitivity(Number(tiltSensInput.value));
      }
      this._saveSettings();
    };
    tiltSensLabel.appendChild(tiltSensInput);
    this.menu.appendChild(tiltSensLabel);

    const joySizeLabel = document.createElement('label');
    joySizeLabel.textContent = 'Joystick Size:';
    const joySizeInput = document.createElement('input');
    joySizeInput.type = 'range';
    joySizeInput.min = 40;
    joySizeInput.max = 160;
    joySizeInput.step = 1;
    joySizeInput.value = 80;
    joySizeInput.oninput = () => {
      if (this.mappers.mobile && this.mappers.mobile.options) {
        this.mappers.mobile.options.joystickSize = Number(joySizeInput.value);
      }
      this._saveSettings();
    };
    joySizeLabel.appendChild(joySizeInput);
    this.menu.appendChild(joySizeLabel);

    // Save/load settings
    this._loadSettings();
    document.body.appendChild(this.menu);
  }

  _saveSettings() {
    const uiScaleInput = this.menu.querySelector('input[type="range"][min="0.7"]');
    const settings = {
      scheme: this.inputHandler.activeScheme,
      sensitivity: this.mappers.desktop?.sensitivity || 1.0,
      tiltSensitivity: this.mappers.tilt?.options?.sensitivity || 1.0,
      joystickSize: this.mappers.mobile?.options?.joystickSize || 80,
      uiScale: uiScaleInput ? Number(uiScaleInput.value) : 1.0,
    };
    localStorage.setItem('controlSettings', JSON.stringify(settings));
  }

  _loadSettings() {
    const settings = JSON.parse(localStorage.getItem('controlSettings') || '{}');
    if (settings.scheme) this.inputHandler.setActiveScheme(settings.scheme);
    if (settings.sensitivity && this.mappers.desktop) this.mappers.desktop.setSensitivity(settings.sensitivity);
    if (settings.tiltSensitivity && this.mappers.tilt) this.mappers.tilt.setSensitivity(settings.tiltSensitivity);
    if (settings.joystickSize && this.mappers.mobile) this.mappers.mobile.options.joystickSize = settings.joystickSize;
    // Restore UI scale
    if (typeof settings.uiScale === 'number') {
      document.documentElement.style.setProperty('--ui-scale', settings.uiScale);
      const uiScaleInput = this.menu.querySelector('input[type="range"][min="0.7"]');
      if (uiScaleInput) uiScaleInput.value = settings.uiScale;
    }
  }
}
