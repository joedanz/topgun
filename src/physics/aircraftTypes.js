// src/physics/aircraftTypes.js
// Defines different aircraft types and their physics parameters

export const AIRCRAFT_TYPES = {
  FIGHTER: {
    name: 'Fighter',
    mass: 12000,
    width: 10,
    length: 15,
    height: 4,
    pitchTorque: 12000,
    rollTorque: 13000,
    yawTorque: 6000,
    thrust: 80000,
    maxSpeed: 300,
    damping: 0.08,
    stallSpeed: 60,
    ceiling: 18000,
    turnRate: 18,
  },
  BOMBER: {
    name: 'Bomber',
    mass: 30000,
    width: 20,
    length: 30,
    height: 8,
    pitchTorque: 9000,
    rollTorque: 8000,
    yawTorque: 5000,
    thrust: 60000,
    maxSpeed: 220,
    damping: 0.11,
    stallSpeed: 80,
    ceiling: 12000,
    turnRate: 10,
  },
  HELICOPTER: {
    name: 'Helicopter',
    mass: 6000,
    width: 12,
    length: 14,
    height: 5,
    pitchTorque: 9000,
    rollTorque: 9000,
    yawTorque: 12000,
    thrust: 40000,
    maxSpeed: 160,
    damping: 0.15,
    hoverThrust: 6000, // special for vertical lift
    ceiling: 6000,
    turnRate: 30,
    isHelicopter: true,
  },
  // Add more aircraft types as needed
};

/**
 * Validates that aircraft parameters are physically reasonable.
 */
export function validateAircraftType(type) {
  if (!type.mass || type.mass <= 0) throw new Error('Aircraft mass must be positive');
  if (!type.maxSpeed || type.maxSpeed <= 0) throw new Error('Aircraft maxSpeed must be positive');
  // Add more checks as needed
  return true;
}
