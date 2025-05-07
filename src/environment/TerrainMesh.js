// Generates a terrain mesh from a 2D height array and applies a basic texture
import * as THREE from 'three';

class TerrainMesh {
  constructor(heights, options = {}) {
    const size = heights.length;
    const width = options.width || 1000;
    const height = options.height || 1000;
    const maxElevation = options.maxElevation || 120;
    const geometry = new THREE.PlaneGeometry(width, height, size - 1, size - 1);
    // Displace vertices by heightmap
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      const x = i % size;
      const y = Math.floor(i / size);
      const h = heights[y][x];
      geometry.attributes.position.setZ(i, h * maxElevation);
    }
    geometry.computeVertexNormals();
    // Basic texture (placeholder: green)
    const material = new THREE.MeshLambertMaterial({
      color: 0x88cc88,
      wireframe: options.wireframe || false
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
  }
  getMesh() {
    return this.mesh;
  }
}

export default TerrainMesh;
