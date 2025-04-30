// src/aircraft/PlayerAircraft.js
import * as THREE from 'three';

export default class PlayerAircraft {
  constructor({ position = new THREE.Vector3(), velocity = new THREE.Vector3() } = {}) {
    this.position = position.clone();
    this.velocity = velocity.clone();
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4, 20),
      new THREE.MeshBasicMaterial({ color: 0x00aaff })
    );
    this.mesh.position.copy(this.position);
  }

  update(dt) {
    this.position.add(this.velocity.clone().multiplyScalar(dt));
    this.mesh.position.copy(this.position);
  }
}
