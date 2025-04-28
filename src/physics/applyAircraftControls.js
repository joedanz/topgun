// src/physics/applyAircraftControls.js
import * as Ammo from 'ammo.js';

/**
 * Applies pitch, roll, and yaw controls to an aircraft Ammo.js rigid body.
 * @param {Ammo.btRigidBody} body - The aircraft's rigid body
 * @param {Object} controls - { pitch, roll, yaw, throttle }
 * @param {Object} params - { pitchTorque, rollTorque, yawTorque, maxSpeed, damping }
 * @param {number} deltaTime - Time step in seconds
 */
export function applyAircraftControls(body, controls, params, deltaTime) {
  if (!body) return;

  // Damping for smoother response
  body.setDamping(params.damping ?? 0.1, params.damping ?? 0.1);

  // Get current velocity
  const velocity = body.getLinearVelocity();
  const speed = velocity.length();

  // Limit max speed
  if (speed > (params.maxSpeed ?? 200)) {
    velocity.op_mul((params.maxSpeed ?? 200) / speed);
    body.setLinearVelocity(velocity);
  }

  // Calculate torques
  const pitchTorque = (params.pitchTorque ?? 10000) * controls.pitch;
  const rollTorque = (params.rollTorque ?? 10000) * controls.roll;
  const yawTorque = (params.yawTorque ?? 5000) * controls.yaw;

  // Apply torques: Ammo uses local coordinates
  const torque = new Ammo.btVector3(rollTorque, yawTorque, pitchTorque);
  body.applyTorque(torque);
  Ammo.destroy(torque);

  // Apply forward thrust (along local X axis)
  if (controls.throttle > 0) {
    // Get orientation
    const transform = new Ammo.btTransform();
    body.getMotionState().getWorldTransform(transform);
    const basis = transform.getBasis();
    // Forward vector (local X)
    const forward = basis.getColumn(0);
    forward.op_mul((params.thrust ?? 50000) * controls.throttle * deltaTime);
    body.applyCentralForce(forward);
    Ammo.destroy(forward);
    Ammo.destroy(transform);
  }
}
