// TerrainUtils.js - Utility for terrain height lookup
export function makeHeightLookup(heights, width, height, maxElevation) {
  // Returns a function (x, z) => y
  return function(x, z) {
    // Map world x/z to heightmap indices
    const ix = Math.floor((x / width + 0.5) * (heights.length - 1));
    const iz = Math.floor((z / height + 0.5) * (heights.length - 1));
    if (ix < 0 || ix >= heights.length || iz < 0 || iz >= heights.length) return 0;
    return heights[iz][ix] * maxElevation;
  };
}
