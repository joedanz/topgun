// src/aircraft/AircraftTypes.js
// Defines performance characteristics for different aircraft types

export const AIRCRAFT_TYPES = {
  F16: {
    displayName: 'F-16 Fighting Falcon',
    mass: 9000, // kg
    maxThrust: 129000, // N
    maxSpeed: 800, // m/s
    turnRate: 2.5, // rad/s
    rollRate: 3.0, // rad/s
    pitchRate: 2.0, // rad/s
    yawRate: 1.5, // rad/s
    liftCoeff: 1.3,
    dragCoeff: 0.02,
  },
  MIG29: {
    displayName: 'MiG-29 Fulcrum',
    mass: 11000,
    maxThrust: 155000,
    maxSpeed: 850,
    turnRate: 2.7,
    rollRate: 3.2,
    pitchRate: 2.1,
    yawRate: 1.6,
    liftCoeff: 1.35,
    dragCoeff: 0.021,
  },
  // Add more aircraft types as needed
};

/**
 * Get a performance profile for a given type string
 * @param {string} type
 * @returns {object|null}
 */
export function getAircraftTypeProfile(type) {
  return AIRCRAFT_TYPES[type] || null;
}
