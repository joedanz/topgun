// src/ai/StateMachine.js
// Generic finite state machine for AI behaviors

export class StateMachine {
  constructor(states = {}, initialState = null, config = {}) {
    this.states = states; // { stateName: { onEnter, onExit, onUpdate } }
    this.currentState = null;
    this.stateName = null;
    this.config = config;
    if (initialState && states[initialState]) {
      this.transition(initialState);
    }
  }

  transition(newState, data = {}) {
    if (this.stateName === newState) return;
    if (typeof window !== 'undefined' && window.DEBUG_AI_STATE) {
      console.log(`[AI] State transition: ${this.stateName} -> ${newState}`);
    }
    if (this.currentState && typeof this.currentState.onExit === 'function') {
      this.currentState.onExit(data);
    }
    this.currentState = this.states[newState];
    this.stateName = newState;
    if (this.currentState && typeof this.currentState.onEnter === 'function') {
      this.currentState.onEnter(data);
    }
  }

  update(dt, context = {}) {
    if (this.currentState && typeof this.currentState.onUpdate === 'function') {
      this.currentState.onUpdate(dt, context);
    }
  }
}

// Example usage:
// const sm = new StateMachine({
//   patrol: { onEnter, onExit, onUpdate },
//   engage: { ... },
//   evade: { ... }
// }, 'patrol');
