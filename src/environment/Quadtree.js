// Quadtree for terrain chunk LOD management
export default class Quadtree {
  constructor(bounds, maxDepth = 5) {
    this.bounds = bounds; // {x, y, size}
    this.maxDepth = maxDepth;
    this.children = null;
    this.chunk = null; // Will hold a TerrainChunk
  }
  // Subdivide node into 4 children
  subdivide() {
    const { x, y, size } = this.bounds;
    const h = size / 2;
    this.children = [
      new Quadtree({ x: x,     y: y,     size: h }, this.maxDepth - 1),
      new Quadtree({ x: x + h, y: y,     size: h }, this.maxDepth - 1),
      new Quadtree({ x: x,     y: y + h, size: h }, this.maxDepth - 1),
      new Quadtree({ x: x + h, y: y + h, size: h }, this.maxDepth - 1)
    ];
  }
  // Recursively build tree to target depth
  build(depth = 0) {
    if (depth >= this.maxDepth) return;
    this.subdivide();
    this.children.forEach(child => child.build(depth + 1));
  }
  // Traverse visible chunks for rendering
  traverseVisible(camera, callback) {
    // Placeholder: always traverse all leaves
    if (!this.children) {
      if (this.chunk) callback(this.chunk);
      return;
    }
    this.children.forEach(child => child.traverseVisible(camera, callback));
  }
}
