// Represents a single terrain chunk at a given LOD
import * as THREE from 'three';
import TerrainMesh from './TerrainMesh';

export default class TerrainChunk {
  constructor(heights, x, y, size, resolution, options = {}) {
    // Extract subregion of heights
    const subHeights = [];
    for (let j = 0; j < resolution; j++) {
      const row = [];
      for (let i = 0; i < resolution; i++) {
        const srcX = Math.floor(x + (i / (resolution - 1)) * (size - 1));
        const srcY = Math.floor(y + (j / (resolution - 1)) * (size - 1));
        row.push(heights[srcY][srcX]);
      }
      subHeights.push(row);
    }
    this.meshObj = new TerrainMesh(subHeights, {
      width: options.width || size,
      height: options.height || size,
      maxElevation: options.maxElevation || 120,
      wireframe: options.wireframe
    }).getMesh();
    this.meshObj.position.set(x - options.terrainHalfSize, 0, y - options.terrainHalfSize);
    this.meshObj.frustumCulled = true;
  }
  getMesh() {
    return this.meshObj;
  }
}
