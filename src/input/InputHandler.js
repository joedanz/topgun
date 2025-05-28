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

  handleRawInput(rawInput, value) { // Removed 'inputType' as it was rawInput anyway
    if (!this.activeScheme) return;

    // The activeScheme is an object like: { THROTTLE_INCREASE: ['ShiftLeft'], PITCH_UP: ['ArrowDown'], ... }
    const schemeActions = this.activeScheme; // e.g., ControlSchemes.desktop

    // Find which game action this rawInput key corresponds to
    for (const gameActionName in schemeActions) {
      if (Object.prototype.hasOwnProperty.call(schemeActions, gameActionName)) {
        const mappedRawKeys = schemeActions[gameActionName]; // This is an array of raw keys, e.g., ['ShiftLeft']
        
        if (Array.isArray(mappedRawKeys) && mappedRawKeys.includes(rawInput)) {
          // Found the game action that this rawInput key triggers.
          
          // We need to find the current scheme name to get the correct mapper.
          let currentSchemeName = null;
          for (const schemeName in this.schemes) {
              if (this.schemes[schemeName] === this.activeScheme) {
                  currentSchemeName = schemeName;
                  break;
              }
          }

          if (currentSchemeName) {
              // If no specific mapper is registered for this scheme name, create a default one.
              // This makes the system more robust if mappers aren't pre-registered for all schemes.
              if (!this.mappers[currentSchemeName]) {
                   this.mappers[currentSchemeName] = new InputMapper();
              }

              const mapper = this.mappers[currentSchemeName];
              if (mapper) {
                // Map using the gameActionName (e.g., 'THROTTLE_INCREASE'), not the rawInput.
                // The rawInput itself is still useful for the mapper internally if it needs to distinguish
                // between different raw inputs mapping to the same action (though not typical for this setup).
                mapper.mapInput(rawInput, gameActionName, value); 
                this.emit(gameActionName, value);
              }
          }
          // Assuming one raw key maps to one game action.
          return; 
        }
      }
    }
  }
}

// Example configuration objects for control schemes
export const ControlSchemes = {
  desktop: {
    // Assuming 'movement' might be for ground controls or a different mode, or will be superseded.
    // If W,A,S,D,Arrows are purely for flight now, the old 'movement' might be redundant for player aircraft.
    movement: ['W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], // Keep for now, address conflicts later if they arise in PlayerAircraft
    fire: ['Space'],
    aim: ['MouseMove'], // Typically for looking around or fine-tuning aim

    // Flight Controls
    THROTTLE_INCREASE: ['ShiftLeft'], // Use Left Shift for throttle up
    THROTTLE_DECREASE: ['ControlLeft'], // Use Left Control for throttle down

    PITCH_UP: ['ArrowDown'],      // ArrowDown for Pitch Up (pull stick back)
    PITCH_DOWN: ['ArrowUp'],    // ArrowUp for Pitch Down (push stick forward)
    ROLL_LEFT: ['ArrowLeft'],
    ROLL_RIGHT: ['ArrowRight'],

    YAW_LEFT: ['A'],
    YAW_RIGHT: ['D'],
    // Consider if 'Q' and 'E' are better if A/D are still used for strafing in 'movement'.
    // For now, let's use A/D for yaw.
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
