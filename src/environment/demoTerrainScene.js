// Demo: Loads a heightmap and displays a terrain mesh with camera controls
import * as THREE from 'three';
import HeightmapLoader from './HeightmapLoader';
import Quadtree from './Quadtree';
import TerrainChunk from './TerrainChunk';

import SkyDome from './SkyDome';
import TimeController from './TimeController';
import StarField from './StarField';
import CelestialBody from './CelestialBody';
import Water from './Water';
import ObjectPlacer from './ObjectPlacer';
import { makeHeightLookup } from './TerrainUtils';

export async function createDemoTerrainScene(renderer, scene, camera) {
  // --- Water Reflection Setup ---
  const reflectionRenderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  });
  const mirrorCamera = camera.clone();
  mirrorCamera.matrixAutoUpdate = true;

  // Load heightmap (for demo, generate flat if no image)
  let heights;
  const terrainSize = 1200;
  const heightmapSize = 128;
  try {
    heights = await HeightmapLoader.load('/textures/muzzle_flash.png', heightmapSize);
  } catch (e) {
    heights = Array.from({length:heightmapSize}, () => Array(heightmapSize).fill(0.5));
  }
  // --- Build Quadtree ---
  const maxDepth = 3; // 4x4 chunks at leaves
  const root = new Quadtree({ x: 0, y: 0, size: heightmapSize }, maxDepth);
  root.build();
  // Assign TerrainChunks to leaves
  function assignChunks(node, depth = 0) {
    if (!node.children) {
      // Pick LOD: higher depth = lower res
      const lodRes = [heightmapSize, 64, 32, 16][depth] || 16;
      node.chunk = new TerrainChunk(
        heights,
        node.bounds.x,
        node.bounds.y,
        node.bounds.size,
        lodRes,
        {
          width: (node.bounds.size / heightmapSize) * terrainSize,
          height: (node.bounds.size / heightmapSize) * terrainSize,
          maxElevation: 120,
          terrainHalfSize: terrainSize / 2
        }
      );
      return;
    }
    node.children.forEach(child => assignChunks(child, depth + 1));
  }
  assignChunks(root);
  // --- Dynamic LOD selection and frustum culling ---
  // Store visible chunk meshes for removal
  let visibleChunkMeshes = [];

  // Skydome (add first so it's always in the background)
  const sky = new SkyDome();
  scene.add(sky.getMesh());
  window.sky = sky; // Expose for debugging

  // Water (add after terrain, before sky/stars)
  const water = new Water({ elevation: 0 });
  scene.add(water.getMesh());
  window.water = water;
  // Set initial reflection texture
  water.setReflectionTexture(reflectionRenderTarget.texture);

  // --- Environmental Objects & Vegetation ---
  // Assume terrain mesh is the first visibleChunkMeshes[0] (for demo)
  let terrainMesh = null;
  if (visibleChunkMeshes && visibleChunkMeshes.length > 0) {
    terrainMesh = visibleChunkMeshes[0];
  }
  // Provide a height lookup function for object placement
  const terrainWidth = terrainSize;
  const terrainHeight = terrainSize;
  const maxElevation = 120;
  const getHeightAt = makeHeightLookup(heights, terrainWidth, terrainHeight, maxElevation);
  // Mock terrain object for ObjectPlacer
  const terrainForPlacer = { width: terrainWidth, height: terrainHeight, getHeightAt };
  const objectPlacer = new ObjectPlacer({ terrain: terrainForPlacer, scene });
  objectPlacer.placeObjects();
  window.objectPlacer = objectPlacer;

  // Star field (add behind skydome)
  const stars = new StarField();
  scene.add(stars.getMesh());
  window.stars = stars;

  // Sun and moon
  const sun = new CelestialBody({ color: 0xffffcc, radius: 80, distance: 4800, opacity: 1 });
  scene.add(sun.getMesh());
  window.sun = sun;
  const moon = new CelestialBody({ color: 0xbbccff, radius: 60, distance: 4800, opacity: 1 });
  scene.add(moon.getMesh());
  window.moon = moon;

  // Time controller for day/night cycle
  const timeController = new TimeController({ dayLengthSeconds: 120 });

  // Helper: Compute chunk center in world coordinates
  function chunkCenter(node) {
    const s = (node.bounds.size / heightmapSize) * terrainSize;
    return new THREE.Vector3(
      node.bounds.x - terrainSize / 2 + s / 2,
      0,
      node.bounds.y - terrainSize / 2 + s / 2
    );
  }

  // Traverse quadtree and select LOD based on camera distance
  function traverseLOD(node, camera, frustum, depth = 0) {
    const center = chunkCenter(node);
    const dist = camera.position.distanceTo(center);
    // LOD thresholds (tuned for visual quality and performance)
    const lodThresholds = [350, 700, 1400]; // Near, mid, far
    // Transition band (fraction of threshold)
    const transitionBand = 0.15;
    // Compute bounding box for frustum culling
    const s = (node.bounds.size / heightmapSize) * terrainSize;
    const box = new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(s, 300, s));
    if (!frustum.intersectsBox(box)) return; // Not visible
    // If this node has children and is near a threshold, cross-fade
    if (node.children && depth < lodThresholds.length) {
      const threshold = lodThresholds[depth];
      const bandStart = threshold * (1 - transitionBand);
      const bandEnd = threshold;
      if (dist >= bandStart && dist < bandEnd) {
        // In transition band: cross-fade parent (this) and children
        // Blend factor: 0 at bandStart, 1 at bandEnd
        const t = (dist - bandStart) / (bandEnd - bandStart);
        // Parent chunk (lower LOD): fade out
        if (node.chunk) {
          const mesh = node.chunk.getMesh();
          mesh.material.transparent = true;
          mesh.material.opacity = 1 - t;
          visibleChunkMeshes.push(mesh);
        }
        // Children (higher LOD): fade in
        node.children.forEach(child => {
          if (child.chunk) {
            const mesh = child.chunk.getMesh();
            mesh.material.transparent = true;
            mesh.material.opacity = t;
            visibleChunkMeshes.push(mesh);
          }
        });
        return;
      } else if (dist < bandStart) {
        // Use children only (higher LOD)
        node.children.forEach(child => traverseLOD(child, camera, frustum, depth + 1));
        return;
      }
    }
    // Use this chunk only (lower LOD, fully opaque)
    if (node.chunk) {
      const mesh = node.chunk.getMesh();
      mesh.material.transparent = false;
      mesh.material.opacity = 1.0;
      visibleChunkMeshes.push(mesh);
    }
  }

  // Animation loop: update visible chunks each frame
  function lerpColor(a, b, t) {
    return a.clone().lerp(b, t);
  }

  function getSkyColors(time) {
    // time: 0..1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
    // Define key sky colors
    const nightTop = new THREE.Color(0x0a1640);
    const nightBottom = new THREE.Color(0x18244b);
    const dayTop = new THREE.Color(0x87ceeb);
    const dayBottom = new THREE.Color(0xcfe7ff); // Soft pale blue, not pure white
    const sunriseTop = new THREE.Color(0xffb36a);
    const sunriseBottom = new THREE.Color(0xfff1c1);
    const sunsetTop = new THREE.Color(0xff7e5e);
    const sunsetBottom = new THREE.Color(0xffd1a4);

    // Blend between key times
    if (time < 0.20) { // Night to sunrise
      const t = (time - 0.0) / 0.20;
      return {
        top: lerpColor(nightTop, sunriseTop, t),
        bottom: lerpColor(nightBottom, sunriseBottom, t)
      };
    } else if (time < 0.30) { // Sunrise to day
      const t = (time - 0.20) / 0.10;
      return {
        top: lerpColor(sunriseTop, dayTop, t),
        bottom: lerpColor(sunriseBottom, dayBottom, t)
      };
    } else if (time < 0.70) { // Day
      return { top: dayTop, bottom: dayBottom };
    } else if (time < 0.80) { // Day to sunset
      const t = (time - 0.70) / 0.10;
      return {
        top: lerpColor(dayTop, sunsetTop, t),
        bottom: lerpColor(dayBottom, sunsetBottom, t)
      };
    } else if (time < 0.90) { // Sunset to night
      const t = (time - 0.80) / 0.10;
      return {
        top: lerpColor(sunsetTop, nightTop, t),
        bottom: lerpColor(sunsetBottom, nightBottom, t)
      };
    } else { // Night
      return { top: nightTop, bottom: nightBottom };
    }
  }

  function updateTerrainChunks() {
    // Remove old
    visibleChunkMeshes.forEach(mesh => scene.remove(mesh));
    visibleChunkMeshes = [];
    // Camera frustum
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const frustum = new THREE.Frustum();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    ));
    // Traverse
    traverseLOD(root, camera, frustum);
    // Add new
    visibleChunkMeshes.forEach(mesh => scene.add(mesh));
    // --- Animate sky ---
    timeController.update();
    const t = timeController.getTime();
    const { top, bottom } = getSkyColors(t);
    if (sky.mesh.material.uniforms) {
      sky.mesh.material.uniforms.topColor.value.copy(top);
      sky.mesh.material.uniforms.bottomColor.value.copy(bottom);
    }
    sky.updatePosition(camera);

    // Animate wind for trees
    objectPlacer.animateWind(timeController.time);

    // --- Water Reflection Pass ---
    // Position mirror camera below water plane, flip Y
    mirrorCamera.position.copy(camera.position);
    mirrorCamera.position.y *= -1; // Mirror over water
    mirrorCamera.up.set(0, -1, 0); // Flip up
    mirrorCamera.lookAt(
      camera.position.x,
      -camera.position.y,
      camera.position.z
    );
    mirrorCamera.updateMatrixWorld();
    mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
    // Hide water mesh for reflection pass
    water.getMesh().visible = false;
    renderer.setRenderTarget(reflectionRenderTarget);
    renderer.render(scene, mirrorCamera);
    renderer.setRenderTarget(null);
    water.getMesh().visible = true;
    // Set reflection texture
    water.setReflectionTexture(reflectionRenderTarget.texture);

    // Animate water
    water.update(timeController.time);

    // --- Animate sun and moon ---
    // Sun: rises at t=0.25 (6am), sets at t=0.75 (6pm)
    // Moon: opposite phase
    // Azimuth: east to west (PI/2 to 3PI/2)
    // Elevation: 0 at horizon, PI/2 at zenith
    const sunT = (t + 0.25) % 1; // Sun rises at t=0
    const sunAzimuth = Math.PI * (sunT * 2 - 0.5); // East to west
    const sunElevation = Math.max(0, Math.sin(Math.PI * sunT)); // 0 at horizon, 1 at zenith
    sun.setPosition(camera, sunAzimuth, sunElevation * Math.PI / 2);
    // Fade sun in/out at horizon
    sun.setOpacity(Math.max(0, Math.min(1, sunElevation)));

    const moonT = (t + 0.75) % 1; // Moon rises at t=0
    const moonAzimuth = Math.PI * (moonT * 2 - 0.5);
    const moonElevation = Math.max(0, Math.sin(Math.PI * moonT));
    moon.setPosition(camera, moonAzimuth, moonElevation * Math.PI / 2);
    // Fade moon in/out at horizon, dimmer than sun
    moon.setOpacity(0.7 * Math.max(0, Math.min(1, moonElevation)));
    // --- Animate moon phase ---
    // Lunar phase: 0=new, 0.5=full, 1=new, cycles every 30 days
    if (moon._isMoon && moon.mesh.material.uniforms && moon.mesh.material.uniforms.phase) {
      const lunarCycle = 30.0; // 30 days for a full cycle
      const phase = ((timeController.time / lunarCycle) % 1);
      moon.mesh.material.uniforms.phase.value = phase;
    }

    // --- Animate stars ---
    // Fade in at night (t < 0.18 or t > 0.92), fade out at dawn/dusk
    let starOpacity = 0;
    if (t < 0.16) {
      starOpacity = Math.min(1, (0.16 - t) / 0.12); // Fade in before dawn
    } else if (t > 0.92) {
      starOpacity = Math.min(1, (t - 0.92) / 0.08); // Fade in after dusk
    } else if (t < 0.18) {
      starOpacity = 1; // Full night
    } else if (t > 0.90) {
      starOpacity = 1; // Full night
    }
    stars.setOpacity(starOpacity);
    stars.updatePosition(camera);

    requestAnimationFrame(updateTerrainChunks);
  }
  updateTerrainChunks();
  // Lighting
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
  sunLight.position.set(300, 400, 200);
  sunLight.castShadow = true;
  scene.add(sunLight);
  // Camera position
  camera.position.set(0, 220, 400);
  camera.lookAt(0, 0, 0);
}
