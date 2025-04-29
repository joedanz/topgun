// src/physics/PhysicsUtils.js
// Utility functions for converting between Three.js and Ammo.js objects
import * as THREE from 'three';
import Ammo from 'ammo.js';

/**
 * Convert THREE.Vector3 to Ammo.btVector3
 * @param {THREE.Vector3} v
 * @param {Ammo} AmmoLib
 * @returns {Ammo.btVector3}
 */
export function threeVectorToAmmo(v, AmmoLib) {
  return new AmmoLib.btVector3(v.x, v.y, v.z);
}

/**
 * Convert Ammo.btVector3 to THREE.Vector3
 * @param {Ammo.btVector3} v
 * @returns {THREE.Vector3}
 */
export function ammoVectorToThree(v) {
  return new THREE.Vector3(v.x(), v.y(), v.z());
}

/**
 * Convert THREE.Quaternion to Ammo.btQuaternion
 * @param {THREE.Quaternion} q
 * @param {Ammo} AmmoLib
 * @returns {Ammo.btQuaternion}
 */
export function threeQuatToAmmo(q, AmmoLib) {
  return new AmmoLib.btQuaternion(q.x, q.y, q.z, q.w);
}

/**
 * Convert Ammo.btQuaternion to THREE.Quaternion
 * @param {Ammo.btQuaternion} q
 * @returns {THREE.Quaternion}
 */
export function ammoQuatToThree(q) {
  return new THREE.Quaternion(q.x(), q.y(), q.z(), q.w());
}

/**
 * Helper to set THREE.Object3D transform from Ammo transform
 * @param {THREE.Object3D} obj
 * @param {Ammo.btTransform} transform
 */
export function setThreeObjectFromAmmoTransform(obj, transform) {
  const origin = transform.getOrigin();
  const rotation = transform.getRotation();
  obj.position.set(origin.x(), origin.y(), origin.z());
  obj.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
}

/**
 * Helper to set Ammo.btTransform from THREE.Object3D
 * @param {Ammo.btTransform} transform
 * @param {THREE.Object3D} obj
 */
export function setAmmoTransformFromThreeObject(transform, obj) {
  transform.setOrigin(new Ammo.btVector3(obj.position.x, obj.position.y, obj.position.z));
  transform.setRotation(new Ammo.btQuaternion(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w));
}
