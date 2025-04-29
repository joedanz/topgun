// src/input/InputHandler.js
// Platform-agnostic input abstraction layer for Top Gun flight controls

export class InputAction {
  constructor(name) {
    this.name = name; // e.g., 'move', 'fire', 'aim', etc.
    this.active = false;
    this.value = null; // e.g., direction vector, button state, etc.
  }
}

export class InputMapper {
  constructor() {
    // Map from raw input (keyboard, mouse, touch, gamepad, tilt) to InputAction
    this.actionMap = {};
  }

  mapInput(rawInput, actionName, value) {
    if (!this.actionMap[actionName]) {
      this.actionMap[actionName] = new InputAction(actionName);
    }
    this.actionMap[actionName].active = value !== 0 && value !== false && value !== null;
    this.actionMap[actionName].value = value;
  }

  getAction(actionName) {
    return this.actionMap[actionName] || new InputAction(actionName);
  }

  getActiveActions() {
    return Object.values(this.actionMap).filter(a => a.active);
  }
}

export class InputHandler {
  constructor(schemes = {}) {
    this.mappers = {};
    this.listeners = [];
    this.schemes = schemes; // { desktop: ..., mobile: ..., gamepad: ... }
    this.activeScheme = null;
  }

  registerMapper(name, mapper) {
    this.mappers[name] = mapper;
  }

  setActiveScheme(name) {
    this.activeScheme = this.schemes[name];
  }

  onInput(actionName, callback) {
    this.listeners.push({ actionName, callback });
  }

  emit(actionName, value) {
    for (const l of this.listeners) {
      if (l.actionName === actionName) l.callback(value);
    }
  }

  handleRawInput(inputType, rawInput, value) {
    // Find the mapper for the current scheme
    if (!this.activeScheme) return;
    const mapper = this.mappers[this.activeScheme];
    if (mapper) {
      mapper.mapInput(rawInput, inputType, value);
      this.emit(inputType, value);
    }
  }
}

// Example configuration objects for control schemes
export const ControlSchemes = {
  desktop: {
    movement: ['W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
    fire: ['Space'],
    aim: ['MouseMove'],
  },
  mobile: {
    movement: ['TouchJoystick'],
    fire: ['TouchButton'],
    aim: ['TouchAim'],
    tilt: ['DeviceOrientation'],
  },
  gamepad: {
    movement: ['LeftStick'],
    fire: ['ButtonA'],
    aim: ['RightStick'],
  },
};
