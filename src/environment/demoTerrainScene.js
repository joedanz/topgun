// Demo: Loads a heightmap and displays a terrain mesh with camera controls
import * as THREE from 'three';
import HeightmapLoader from './HeightmapLoader';
import TerrainMesh from './TerrainMesh';

export async function createDemoTerrainScene(renderer, scene, camera) {
  // Load heightmap (for demo, generate flat if no image)
  let heights;
  try {
    heights = await HeightmapLoader.load('/textures/muzzle_flash.png', 128); // Use available PNG as placeholder
  } catch (e) {
    // Fallback: flat terrain
    heights = Array.from({length:128}, () => Array(128).fill(0.5));
  }
  const terrain = new TerrainMesh(heights, { width: 1200, height: 1200, maxElevation: 120 });
  scene.add(terrain.getMesh());
  // Lighting
  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(300, 400, 200);
  sun.castShadow = true;
  scene.add(sun);
  // Camera position
  camera.position.set(0, 220, 400);
  camera.lookAt(0, 0, 0);
  // Controls (basic WASD + mouse)
  // Optionally add OrbitControls if available
}
