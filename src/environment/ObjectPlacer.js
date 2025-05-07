// ObjectPlacer.js - System for placing and rendering environmental objects and vegetation
import * as THREE from 'three';

export default class ObjectPlacer {
  constructor({ terrain, scene, rng = Math.random, numTrees = 400, numRocks = 60, numBuildings = 10 } = {}) {
    this.terrain = terrain;
    this.scene = scene;
    this.rng = rng;
    this.objects = [];
    this.treeInstances = null;
    this.rockInstances = null;
    this.buildings = [];
    this.numTrees = numTrees;
    this.numRocks = numRocks;
    this.numBuildings = numBuildings;
  }

  // Place objects based on terrain properties
  placeObjects() {
    // Trees (instanced)
    const treeGeometry = new THREE.ConeGeometry(8, 40, 7);
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x226622 });
    this.treeInstances = new THREE.InstancedMesh(treeGeometry, treeMaterial, this.numTrees);
    // Rocks (instanced)
    const rockGeometry = new THREE.DodecahedronGeometry(5, 0);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    this.rockInstances = new THREE.InstancedMesh(rockGeometry, rockMaterial, this.numRocks);
    // Place trees and rocks
    let treeCount = 0, rockCount = 0;
    for (let i = 0; i < this.numTrees + this.numRocks; i++) {
      const x = (this.rng() - 0.5) * this.terrain.width;
      const z = (this.rng() - 0.5) * this.terrain.height;
      const y = this.terrain.getHeightAt(x, z);
      if (y < 10 || y > 110) continue; // Avoid water and peaks
      if (treeCount < this.numTrees && this.rng() > 0.2) {
        // Place tree at terrain height
        const m = new THREE.Matrix4().setPosition(x, y, z);
        this.treeInstances.setMatrixAt(treeCount++, m);
      } else if (rockCount < this.numRocks) {
        // Place rock at terrain height
        const m = new THREE.Matrix4().setPosition(x, y, z);
        this.rockInstances.setMatrixAt(rockCount++, m);
      }
    }
    this.treeInstances.instanceMatrix.needsUpdate = true;
    this.rockInstances.instanceMatrix.needsUpdate = true;
    this.scene.add(this.treeInstances);
    this.scene.add(this.rockInstances);

    // Buildings (simple boxes, not instanced)
    for (let i = 0; i < this.numBuildings; i++) {
      const x = (this.rng() - 0.5) * this.terrain.width;
      const z = (this.rng() - 0.5) * this.terrain.height;
      const y = this.terrain.getHeightAt(x, z);
      if (y < 10 || y > 110) continue;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(18, 24, 18),
        new THREE.MeshLambertMaterial({ color: 0xc2b280 })
      );
      // Place building at terrain height
      box.position.set(x, y, z);
      box.castShadow = true;
      box.receiveShadow = true;
      this.scene.add(box);
      this.buildings.push(box);
    }
  }

  // Animate wind for trees (simple sway)
  animateWind(time) {
    if (!this.treeInstances || typeof this.treeInstances.getMatrixAt !== 'function') return;
    for (let i = 0; i < this.numTrees; i++) {
      let oldMatrix = new THREE.Matrix4();
      if (this.treeInstances.getMatrixAt) {
        try {
          this.treeInstances.getMatrixAt(i, oldMatrix);
        } catch (e) {
          continue; // Skip if not set
        }
      }
      const sway = Math.sin(time * 1.2 + i) * 0.08;
      const m = new THREE.Matrix4().makeRotationZ(sway);
      // Copy position from old matrix
      const pos = new THREE.Vector3();
      pos.setFromMatrixPosition(oldMatrix);
      m.setPosition(pos);
      this.treeInstances.setMatrixAt(i, m);
    }
    this.treeInstances.instanceMatrix.needsUpdate = true;
  }
}
