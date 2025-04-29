// src/physics/ForceAndDebugSystem.js
// Methods for applying forces/torques and debug visualization of physics objects
import * as THREE from 'three';

export class ForceAndDebugSystem {
  constructor(Ammo, world, scene) {
    this.Ammo = Ammo;
    this.world = world;
    this.scene = scene;
    this.debugMeshes = [];
    this.enabled = false;
  }

  // --- Force Application Utilities ---

  applyForce(rigidBody, forceVec, relPos = null) {
    const force = new this.Ammo.btVector3(forceVec.x, forceVec.y, forceVec.z);
    if (relPos) {
      const pos = new this.Ammo.btVector3(relPos.x, relPos.y, relPos.z);
      rigidBody.applyForce(force, pos);
      this.Ammo.destroy(pos);
    } else {
      rigidBody.applyCentralForce(force);
    }
    this.Ammo.destroy(force);
  }

  applyTorque(rigidBody, torqueVec) {
    const torque = new this.Ammo.btVector3(torqueVec.x, torqueVec.y, torqueVec.z);
    rigidBody.applyTorque(torque);
    this.Ammo.destroy(torque);
  }

  // --- Aerodynamic Forces ---

  applyLift(rigidBody, liftVec) {
    this.applyForce(rigidBody, liftVec);
  }

  applyDrag(rigidBody, dragVec) {
    this.applyForce(rigidBody, dragVec);
  }

  applyThrust(rigidBody, thrustVec) {
    this.applyForce(rigidBody, thrustVec);
  }

  // --- Debug Visualization ---

  enableDebug() {
    this.enabled = true;
  }

  disableDebug() {
    this.enabled = false;
    this.clearDebugMeshes();
  }

  clearDebugMeshes() {
    for (const mesh of this.debugMeshes) {
      this.scene.remove(mesh);
    }
    this.debugMeshes = [];
  }

  // Call after each physics step to visualize collision shapes
  debugDraw() {
    if (!this.enabled) return;
    this.clearDebugMeshes();
    const numObjects = this.world.getNumCollisionObjects();
    for (let i = 0; i < numObjects; i++) {
      const obj = this.world.getCollisionObjectArray().at(i);
      const shape = obj.getCollisionShape();
      const transform = obj.getWorldTransform();
      // Only visualize basic shapes (btBoxShape, btSphereShape)
      if (shape instanceof this.Ammo.btBoxShape) {
        const halfExtents = shape.getHalfExtentsWithMargin();
        const size = new THREE.Vector3(halfExtents.x(), halfExtents.y(), halfExtents.z()).multiplyScalar(2);
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(size.x, size.y, size.z),
          new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
        );
        mesh.position.set(transform.getOrigin().x(), transform.getOrigin().y(), transform.getOrigin().z());
        mesh.quaternion.set(
          transform.getRotation().x(),
          transform.getRotation().y(),
          transform.getRotation().z(),
          transform.getRotation().w()
        );
        this.scene.add(mesh);
        this.debugMeshes.push(mesh);
      } else if (shape instanceof this.Ammo.btSphereShape) {
        const radius = shape.getRadius();
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        mesh.position.set(transform.getOrigin().x(), transform.getOrigin().y(), transform.getOrigin().z());
        mesh.quaternion.set(
          transform.getRotation().x(),
          transform.getRotation().y(),
          transform.getRotation().z(),
          transform.getRotation().w()
        );
        this.scene.add(mesh);
        this.debugMeshes.push(mesh);
      }
      // Add more shape types as needed
    }
  }
}
