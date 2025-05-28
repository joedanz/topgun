// src/aircraft/PlayerAircraft.js
import * as THREE from 'three';
import Aircraft from './Aircraft';
import AircraftPhysics from './AircraftPhysics';
// InputHandler type might be needed if we were type-checking constructor params more strictly,
// but for now, an instance is passed, so direct import for type isn't critical.

export default class PlayerAircraft extends Aircraft {
  constructor({
    inputHandler,
    physicsWorld,
    ammoLib,
    initialPosition = new THREE.Vector3(), // Default initial position
    aircraftType = 'playerFighter',
    mass = 1000,
    weapons = []
  }) {
    super({ type: aircraftType, mass, position: initialPosition, weapons });

    this.inputHandler = inputHandler;
    this.physics = new AircraftPhysics(this, ammoLib, physicsWorld, { initialPosition: this.position, mass });

    // Flight control state variables
    this.throttle = 0; // Current throttle level (0 to 1)
    this.MAX_THRUST_FORCE = 50000; // Newtons, tunable
    this.PITCH_RATE_SENSITIVITY = 0.03; // Radians per input unit, tunable
    this.ROLL_RATE_SENSITIVITY = 0.04;  // Radians per input unit, tunable
    this.YAW_RATE_SENSITIVITY = 0.02;   // Radians per input unit, tunable
    this.THROTTLE_STEP = 0.05;          // How much throttle changes per key press

    // Setup the visual mesh
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4, 20), // Example dimensions
      new THREE.MeshBasicMaterial({ color: 0x00aaff })
    );
    this.mesh.position.copy(this.position); // Set initial mesh position from Aircraft's position
    this.mesh.quaternion.copy(this.rotation); // Set initial mesh rotation from Aircraft's rotation
  }

  processInputsAndApplyPhysics(dt) {
    console.log('[PlayerAircraft] processInputsAndApplyPhysics, dt:', dt); // ADDED
    if (!this.inputHandler) {
      console.error('[PlayerAircraft] InputHandler not available!'); // ADDED
      return;
    }

    // Log raw action states
    console.log('[PlayerAircraft] THROTTLE_INCREASE active:', this.inputHandler.getAction('THROTTLE_INCREASE').active); // ADDED
    console.log('[PlayerAircraft] THROTTLE_DECREASE active:', this.inputHandler.getAction('THROTTLE_DECREASE').active); // ADDED
    console.log('[PlayerAircraft] PITCH_UP active:', this.inputHandler.getAction('PITCH_UP').active); // ADDED
    console.log('[PlayerAircraft] PITCH_DOWN active:', this.inputHandler.getAction('PITCH_DOWN').active); // ADDED
    console.log('[PlayerAircraft] ROLL_LEFT active:', this.inputHandler.getAction('ROLL_LEFT').active); // ADDED
    console.log('[PlayerAircraft] ROLL_RIGHT active:', this.inputHandler.getAction('ROLL_RIGHT').active); // ADDED
    console.log('[PlayerAircraft] YAW_LEFT active:', this.inputHandler.getAction('YAW_LEFT').active); // ADDED
    console.log('[PlayerAircraft] YAW_RIGHT active:', this.inputHandler.getAction('YAW_RIGHT').active); // ADDED

    // Get Inputs for flight controls
    // Throttle
    if (this.inputHandler.getAction('THROTTLE_INCREASE').active) {
      this.throttle = Math.min(1, this.throttle + this.THROTTLE_STEP);
    }
    if (this.inputHandler.getAction('THROTTLE_DECREASE').active) {
      this.throttle = Math.max(0, this.throttle - this.THROTTLE_STEP);
    }
    console.log(`[PlayerAircraft] Calculated throttle: ${this.throttle}`); // ADDED

    // Pitch, Roll, Yaw Inputs
    let pitchInput = 0;
    if (this.inputHandler.getAction('PITCH_UP').active) pitchInput = 1;
    if (this.inputHandler.getAction('PITCH_DOWN').active) pitchInput = -1;

    let rollInput = 0;
    if (this.inputHandler.getAction('ROLL_RIGHT').active) rollInput = 1;
    if (this.inputHandler.getAction('ROLL_LEFT').active) rollInput = -1;

    let yawInput = 0;
    if (this.inputHandler.getAction('YAW_RIGHT').active) yawInput = 1;
    if (this.inputHandler.getAction('YAW_LEFT').active) yawInput = -1;

    // Apply Controls to Aircraft State
    this.angularInput.pitch = pitchInput * this.PITCH_RATE_SENSITIVITY;
    this.angularInput.roll = rollInput * this.ROLL_RATE_SENSITIVITY;
    this.angularInput.yaw = yawInput * this.YAW_RATE_SENSITIVITY;
    console.log(`[PlayerAircraft] angularInput: P:${this.angularInput.pitch.toFixed(3)}, R:${this.angularInput.roll.toFixed(3)}, Y:${this.angularInput.yaw.toFixed(3)}`); // ADDED

    this.applyThrust(this.throttle * this.MAX_THRUST_FORCE);
    console.log('[PlayerAircraft] Called applyThrust. Current acceleration:', this.acceleration); // ADDED

    // Physics Update
    // applyForcesAndTorques uses this.acceleration (from applyThrust) and this.angularInput
    if (this.physics) {
      console.log('[PlayerAircraft] Calling this.physics.applyForcesAndTorques()'); // ADDED
      this.physics.applyForcesAndTorques();
    } else {
      console.error('[PlayerAircraft] Physics not available in processInputsAndApplyPhysics!'); // ADDED
    }
    
    // Do NOT call super.update(dt) as physics is handling movement.
    // syncFromPhysics and mesh updates are now in syncVisuals()
  }

  syncVisuals() {
    console.log('[PlayerAircraft] syncVisuals called'); // ADDED
    if (this.physics) { // Check if physics is initialized
      this.physics.syncFromPhysics(); // Updates this.position and this.rotation
      console.log(`[PlayerAircraft] Synced from physics. Position: X:${this.position.x.toFixed(2)}, Y:${this.position.y.toFixed(2)}, Z:${this.position.z.toFixed(2)}`); // ADDED
      this.mesh.position.copy(this.position);
      this.mesh.quaternion.copy(this.rotation);
    } else {
      console.error('[PlayerAircraft] Physics not available in syncVisuals!'); // ADDED
    }
  }

  // --- Control State Getters ---
  /**
   * Gets the current throttle level.
   * @returns {number} Throttle level (0 to 1).
   */
  getThrottle() {
    return this.throttle;
  }

  /**
   * Gets the current pitch input rate (after sensitivity adjustment).
   * @returns {number} Pitch input rate in radians/sec.
   */
  getPitchInput() {
    return this.angularInput.pitch;
  }

  /**
   * Gets the current roll input rate (after sensitivity adjustment).
   * @returns {number} Roll input rate in radians/sec.
   */
  getRollInput() {
    return this.angularInput.roll;
  }

  /**
   * Gets the current yaw input rate (after sensitivity adjustment).
   * @returns {number} Yaw input rate in radians/sec.
   */
  getYawInput() {
    return this.angularInput.yaw;
  }
}
