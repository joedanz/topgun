import * as THREE from 'three';
import ThreeEnvironment from './three/ThreeEnvironment';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HUD } from './components/HUD';
import './components/HUD.css';
import HUDOverlayEffects from './components/HUDOverlayEffects';
import './components/ScreenFlash.css';
import HitMarker from './components/HitMarker';
import './components/HitMarker.css';
import { TargetingSystem } from './components/TargetingSystem';
import './components/TargetingSystem.css';
import { MissionObjectives, NotificationSystem } from './components/MissionObjectives';
import './components/MissionObjectives.css';
import { PauseMenu } from './components/PauseMenu';
import DebugMenu from './components/DebugMenu';
import EnemyDebugLabel from './components/EnemyDebugLabel';
import EnemyPatrolDebug from './components/EnemyPatrolDebug';
import EnemyFOVDebug from './components/EnemyFOVDebug';
import DDADebugPanel from './components/DDADebugPanel'; // DDA debug overlay
import './components/PauseMenu.css';

const appDiv = document.getElementById('app');
const threeEnv = new ThreeEnvironment(appDiv);
// Expose the Three.js scene globally so enemies can be added from console
window.scene = threeEnv.scene;

// --- AI Line-of-Sight Obstacle Setup ---
// Collect terrain and static obstacle meshes for AI LOS checks.
// Replace or expand this logic as needed for your project.
(function setupSceneObstacles() {
  // Example: If you have a terrain mesh and array of static obstacles globally
  let obstacles = [];
  if (typeof terrainMesh !== 'undefined') obstacles.push(terrainMesh);
  if (typeof staticObstacles !== 'undefined' && Array.isArray(staticObstacles)) obstacles.push(...staticObstacles);

  // Fallback: Find meshes in the scene with a name/tag indicating 'terrain' or 'obstacle'
  if (obstacles.length === 0 && window.scene) {
    window.scene.traverse(obj => {
      if (obj.isMesh && (obj.name?.toLowerCase().includes('terrain') || obj.name?.toLowerCase().includes('obstacle'))) {
        obstacles.push(obj);
      }
    });
  }

  // Assign to global for AI
  window.sceneObstacles = obstacles;
  // You can push more meshes to window.sceneObstacles as needed after loading assets
})();

// Mount HUD overlay
const hudDiv = document.createElement('div');
hudDiv.id = 'hud-root';
hudDiv.style.position = 'fixed';
hudDiv.style.left = 0;
hudDiv.style.right = 0;
hudDiv.style.bottom = 0;
hudDiv.style.top = 0;
hudDiv.style.pointerEvents = 'none';
hudDiv.style.zIndex = 100;
document.body.appendChild(hudDiv);

const root = createRoot(hudDiv);
// Helper to get current weapon info for HUD
function getHUDWeaponProps() {
  if (window.playerAircraft) {
    return {
      currentWeapon: window.playerAircraft.getCurrentWeapon(),
      weapons: window.playerAircraft.weapons || [],
    };
  }
  return { currentWeapon: null, weapons: [] };
}

// HUD and Targeting overlays are now managed by OverlayRoot. Render OverlayRoot as main overlay.
root.render(<OverlayRoot />);
// --- Weapon Switching Input Integration ---
if (window.inputHandler) {
  // Next/Prev weapon
  window.inputHandler.onInput('nextWeapon', (pressed) => {
    if (pressed && window.playerAircraft) {
      window.playerAircraft.switchWeapon(+1);
      // renderHUD() removed; OverlayRoot now manages HUD rendering.
    }
  });
  window.inputHandler.onInput('prevWeapon', (pressed) => {
    if (pressed && window.playerAircraft) {
      window.playerAircraft.switchWeapon(-1);
      // renderHUD() removed; OverlayRoot now manages HUD rendering.
    }
  });
  // Direct weapon selection (number keys)
  for (let i = 1; i <= 4; ++i) {
    window.inputHandler.onInput(`selectWeapon${i}`, (pressed) => {
      if (pressed && window.playerAircraft) {
        window.playerAircraft.switchWeapon(i - 1);
        // renderHUD() removed; OverlayRoot now manages HUD rendering.
      }
    });
  }
}

// --- Lock-On Targeting Logic ---
let lockOnMode = localStorage.getItem('lockOnMode') || 'manual';
window.setLockOnMode = mode => { lockOnMode = mode; localStorage.setItem('lockOnMode', mode); };

let lockedTargetId = null;
let lockStatus = 'none'; // 'none' | 'locking' | 'locked' | 'lost'
let lockProgress = 0;
let lockTimer = 0;
const LOCK_ON_TIME = 1.2; // seconds to lock
let lastEnemies = [];

// Utility: Get all valid enemy targets (real EnemyAircraft)
function getEnemyTargets() {
  if (!window.enemies || !window.scene || !window.scene.camera) return [];
  const camera = window.scene.camera;
  const width = window.innerWidth;
  const height = window.innerHeight;
  return window.enemies.map(e => {
    // Project enemy position to normalized device coordinates
    const pos = e.position.clone();
    const vector = pos.project(camera); // .project mutates the vector
    // Convert NDC to screen coordinates
    const screenX = (vector.x * 0.5 + 0.5) * width;
    const screenY = (1 - (vector.y * 0.5 + 0.5)) * height; // invert y for screen
    // Check if on screen and in front of camera
    const onScreen =
      vector.z > 0 && vector.z < 1 &&
      vector.x >= -1 && vector.x <= 1 &&
      vector.y >= -1 && vector.y <= 1;
    // Calculate distance
    const distance = window.playerAircraft ? e.position.distanceTo(window.playerAircraft.position) : 0;
    // In range logic (adjust threshold as needed)
    const inRange = window.playerAircraft ? distance < 1800 : false;
    return {
      id: e.id,
      screenX,
      screenY,
      distance,
      onScreen,
      inRange,
      ref: e
    };
  });
}


// --- Enemy Spawning ---
import EnemyAircraft from './aircraft/EnemyAircraft';
import Aircraft from './aircraft/Aircraft';
import FormationManager, { FORMATION_TYPES } from './aircraft/FormationManager';

// Expose classes and libraries globally for browser console testing
window.EnemyAircraft = EnemyAircraft;
window.THREE = THREE;

function spawnEnemies(num = 3) {
  // Use the existing enemies array if present, otherwise start fresh
  const enemies = [];
  for (let i = 0; i < num; ++i) {
    const enemy = new EnemyAircraft({
      type: 'MiG',
      mass: 9000,
      position: new THREE.Vector3(3000 + i * 500, 12000, -4000 - i * 1200),
      rotation: new THREE.Quaternion(),
      patrolRoute: [
        new THREE.Vector3(3000 + i * 500, 12000, -4000 - i * 1200),
        new THREE.Vector3(2000 + i * 400, 12500, -6000 - i * 1000),
        new THREE.Vector3(4000 + i * 300, 11800, -3000 - i * 800)
      ],
      aiConfig: {
        engageDistance: 1200,
        evadeDistance: 350,
        waypointRadius: 100
      }
    });
    // Assign a unique id for React and game logic
    enemy.id = 'enemy-' + Date.now() + '-' + Math.floor(Math.random() * 100000);

    // Attach a debug mesh for visibility (always visible, not affected by lighting)
    enemy.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(10, 4, 20),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    // Place each enemy at a unique, visible location for debugging
    enemy.mesh.position.set(i * 20, 100, 0); // Space out along x-axis
    enemy.position.copy(enemy.mesh.position);
    // Optionally: store reference to logic object
    enemy.mesh.userData.logic = enemy;

    // Add the mesh to the scene for debug visibility
    if (window.scene) {
      window.scene.add(enemy.mesh);
      console.log('Added enemy mesh to scene at', enemy.mesh.position);
    }
    enemies.push(enemy);
  }
  // --- Formation Integration ---
  if (enemies.length > 1) {
    const formation = new FormationManager(FORMATION_TYPES.V, enemies);
    // Assign aircraft to formation
    enemies.forEach((enemy, idx) => enemy.joinFormation(formation, idx));
    window.enemyFormation = formation;
  } else {
    window.enemyFormation = null;
  }
  window.enemies = enemies;
}

// Expose spawnEnemies globally for testing
window.spawnEnemies = spawnEnemies;

// Create player aircraft and expose it globally
function createPlayerAircraft() {
  // Use PlayerAircraft so .mesh exists
  const PlayerAircraft = require('./aircraft/PlayerAircraft').default;
  const player = new PlayerAircraft({
    position: new THREE.Vector3(0, 12000, 0),
    velocity: new THREE.Vector3(0, 0, 0)
  });
  
  // Expose the player to the window for AI and debug scripts
  window.playerAircraft = player;
  
  // Add to the scene if needed
  if (window.scene) {
    // Only add Object3D instances (player.mesh preferred)
    if (player.mesh && player.mesh.isObject3D) {
      window.scene.add(player.mesh);
    } else {
      console.error('Player aircraft .mesh is missing or not a THREE.Object3D:', player.mesh);
    }
  }
  
  return player;
}

// Create player aircraft before spawning enemies
createPlayerAircraft();

// Then spawn enemies in a formation
spawnEnemies(4);

// --- Formation update in main loop ---
function updateFormations(dt) {
  if (window.enemyFormation) {
    window.enemyFormation.update(dt);
    // Optional: draw formation debug lines
    if (window.DEBUG_AI_STATE && window.scene) {
      window.enemyFormation.debugDraw(window.scene);
    }
  }
}

// Patch into main game loop (example, you may need to call this from your own loop)
const _origGameLoop = window.gameLoop;
window.gameLoop = function(dt) {
  if (_origGameLoop) _origGameLoop(dt);
  updateFormations(dt);
};


// --- Enemy AI update in main game loop ---
function updateEnemies(dt, gameContext = {}) {
  if (!window.enemies) return;
  for (const enemy of window.enemies) {
    enemy.update(dt, gameContext);
  }
}

// Example: Call updateEnemies in your main game loop (not shown here)
// updateEnemies(dt, { player: window.playerAircraft });


// Target cycling (manual mode)
window.cycleTarget = (dir = 1) => {
  const enemies = getEnemyTargets().filter(e => e.onScreen);
  if (enemies.length === 0) return;
  const idx = enemies.findIndex(e => e.id === lockedTargetId);
  let nextIdx = (idx + dir + enemies.length) % enemies.length;
  lockedTargetId = enemies[nextIdx].id;
  lockStatus = 'locking';
  lockProgress = 0;
  lockTimer = 0;
};

// Main targeting update (call in game loop)
function updateTargeting(dt) {
  const enemies = getEnemyTargets();
  let nextTargetId = lockedTargetId;
  // Auto mode: pick closest in reticle
  if (lockOnMode === 'automatic') {
    const onscreen = enemies.filter(e => e.onScreen && e.inRange);
    if (onscreen.length > 0) {
      const closest = onscreen.reduce((a, b) => (a.distance < b.distance ? a : b));
      nextTargetId = closest.id;
    } else {
      nextTargetId = null;
    }
  }
  // Manual: keep current unless lost
  if (nextTargetId && enemies.some(e => e.id === nextTargetId && e.onScreen && e.inRange)) {
    if (lockStatus !== 'locked') {
      lockStatus = 'locking';
      lockTimer += dt;
      lockProgress = Math.min(1, lockTimer / LOCK_ON_TIME);
      if (lockProgress >= 1) {
        lockStatus = 'locked';
        lockProgress = 1;
      }
    }
  } else {
    lockStatus = 'none';
    lockProgress = 0;
    lockTimer = 0;
    nextTargetId = null;
  }
  lockedTargetId = nextTargetId;
  // Update player aircraft's locked target
  if (window.playerAircraft && lockedTargetId) {
    const targetObj = enemies.find(e => e.id === lockedTargetId)?.ref;
    window.playerAircraft.setLockedTarget(targetObj);
  } else if (window.playerAircraft) {
    window.playerAircraft.setLockedTarget(null);
  }
}

// --- Targeting Input ---
if (window.inputHandler) {
  window.inputHandler.onInput('nextTarget', (pressed) => {
    if (pressed && lockOnMode === 'manual') window.cycleTarget(+1);
  });
  window.inputHandler.onInput('prevTarget', (pressed) => {
    if (pressed && lockOnMode === 'manual') window.cycleTarget(-1);
  });
}

// (Removed targeting-root overlay; TargetingSystem is now part of OverlayRoot HUD tree)
function TargetingDemo() {
  const [hit, setHit] = useState(false);
  const [tick, setTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [targetingState, setTargetingState] = useState({
    lockedTargetId: null,
    lockStatus: 'none',
    lockProgress: 0,
    enemies: [],
  });

  // Main targeting update (simulate game loop)
  useEffect(() => {
    let lastTime = performance.now();
    let running = true;
    function loop() {
      if (!running) return;
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      updateTargeting(dt);
      setTargetingState({
        lockedTargetId,
        lockStatus,
        lockProgress,
        enemies: getEnemyTargets(),
      });
      requestAnimationFrame(loop);
    }
    loop();
    return () => { running = false; };
  }, []);

  // Enable sound after first user interaction
  useEffect(() => {
    if (soundEnabled) return;
    const enable = () => {
      setSoundEnabled(true);
      window.removeEventListener('click', enable);
      window.removeEventListener('keydown', enable);
      window.removeEventListener('touchstart', enable);
    };
    window.addEventListener('click', enable);
    window.addEventListener('keydown', enable);
    window.addEventListener('touchstart', enable);
    return () => {
      window.removeEventListener('click', enable);
      window.removeEventListener('keydown', enable);
      window.removeEventListener('touchstart', enable);
    };
  }, [soundEnabled]);

  return (
    <TargetingSystem
      enemies={targetingState.enemies}
      lockedTargetId={targetingState.lockedTargetId}
      lockStatus={targetingState.lockStatus}
      lockProgress={targetingState.lockProgress}
      hitMarker={hit}
      soundEnabled={soundEnabled}
    />
  );
}


import { ControlSettingsMenu } from './input/ControlSettingsMenu';
import ReactDOM from 'react-dom';

function OverlayRoot() {
  const [pauseOpen, setPauseOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [hitMarkerTrigger, setHitMarkerTrigger] = useState(false);
  const [debug, setDebug] = React.useState(window.DEBUG_AI_STATE || false);
  const [enemies, setEnemies] = React.useState(window.enemies || []);
  const [camera, setCamera] = React.useState(window.scene ? window.scene.camera : null);

  React.useEffect(() => {
    // Sync with global
    function sync() {
      setEnemies(window.enemies || []);
      setCamera(window.scene ? window.scene.camera : null);
    }
    const id = setInterval(sync, 500);
    return () => clearInterval(id);
  }, []);

  // Listen for player damage event (set window.triggerPlayerDamageFlash externally)
  useEffect(() => {
    window.triggerPlayerDamageFlash = () => {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 220);
    };
    window.triggerPlayerHitMarker = () => {
      setHitMarkerTrigger(true);
      setTimeout(() => setHitMarkerTrigger(false), 130);
    };
    return () => {
      window.triggerPlayerDamageFlash = undefined;
      window.triggerPlayerHitMarker = undefined;
    };
  }, []);

  // Camera shake callback
  const handleShake = () => {
    if (window.cameraController && typeof window.cameraController.addShake === 'function') {
      window.cameraController.addShake(1.2); // Intensity
    }
  };

  // React wrapper for ControlSettingsMenu
  function ControlSettingsWrapper({ onClose }) {
    React.useEffect(() => {
      let menuInstance = null;
      try {
        // Fallback: create dummy handler/mappers if missing
        if (!window.inputHandler) {
          window.inputHandler = { activeScheme: 'desktop', setActiveScheme: () => {} };
        }
        if (!window.mappers) {
          window.mappers = { desktop: { setSensitivity: () => {} }, tilt: { setSensitivity: () => {}, options: {} }, mobile: { options: {} } };
        }
        menuInstance = new ControlSettingsMenu({ inputHandler: window.inputHandler, mappers: window.mappers });
      } catch (e) {
        console.error('Failed to create ControlSettingsMenu:', e);
        // Show a fallback menu div
        let fallback = document.createElement('div');
        fallback.textContent = 'Settings menu failed to load.';
        fallback.style.position = 'fixed';
        fallback.style.top = '40px';
        fallback.style.right = '40px';
        fallback.style.background = '#222';
        fallback.style.color = '#fff';
        fallback.style.padding = '2em';
        fallback.style.zIndex = 2001;
        fallback.id = 'fallback-settings-menu';
        document.body.appendChild(fallback);
        menuInstance = { menu: fallback };
      }
      // Add close on Escape
      const escListener = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', escListener);
      // Add close on click outside (on backdrop)
      const backdrop = document.getElementById('settings-backdrop');
      if (backdrop) {
        backdrop.addEventListener('mousedown', onClose);
      }
      return () => {
        window.removeEventListener('keydown', escListener);
        if (menuInstance && menuInstance.menu && menuInstance.menu.parentNode) {
          menuInstance.menu.parentNode.removeChild(menuInstance.menu);
        }
        if (backdrop) backdrop.removeEventListener('mousedown', onClose);
      };
    }, [onClose]);
    // Render a backdrop for modal feel
    return (
      <div id="settings-backdrop" style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:1999,background:'rgba(0,0,0,0.25)'}} />
    );
  }
  React.useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') setPauseOpen(open => !open);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  // Debug overlay for enemy AI state
  let enemyLabels = null;
  if (typeof window !== 'undefined' && window.DEBUG_AI_STATE && window.enemies && window.enemies.length) {
    enemyLabels = window.enemies.map(enemy => (
      <EnemyDebugLabel key={enemy.id} enemy={enemy} camera={threeEnv.camera} label={enemy.stateDebug || enemy.stateName || '?'} />
    ));
  }
  // Patrol debug overlays (one canvas per enemy, only if debug)
  let patrolDebugs = null;
  if (typeof window !== 'undefined' && window.DEBUG_AI_STATE && window.enemies && window.enemies.length) {
    patrolDebugs = window.enemies.map(enemy => (
      <EnemyPatrolDebug key={enemy.id} enemy={enemy} camera={threeEnv.camera} />
    ));
  }
  // FOV debug overlays (one canvas per enemy, only if debug)
  let fovDebugs = null;
  if (typeof window !== 'undefined' && window.DEBUG_AI_STATE && window.enemies && window.enemies.length) {
    fovDebugs = window.enemies.map(enemy => (
      <EnemyFOVDebug key={enemy.id} enemy={enemy} camera={threeEnv.camera} />
    ));
  }
  return (
    <>
      {enemyLabels}
      {patrolDebugs}
      {fovDebugs}
      <HitMarker trigger={hitMarkerTrigger} />
      <HUDOverlayEffects damageTrigger={damageFlash} onShake={handleShake} />
      <TargetingSystem
        enemies={enemies}
        hoverTarget={false}
        hitMarker={hitMarkerTrigger}
        soundEnabled={true}
        lockedTargetId={window.lockedTargetId}
        lockStatus={window.lockStatus}
        lockProgress={window.lockProgress}
        onSetLockedTarget={id => { window.lockedTargetId = id; }}
      />
      <HUD
        speed={window.playerAircraft?.speed || 420}
        altitude={window.playerAircraft?.position?.y || 12000}
        currentWeapon={window.playerAircraft?.getCurrentWeapon?.()}
        weapons={window.playerAircraft?.weapons || []}
        health={window.playerAircraft?.health ?? 87}
      />
      <MissionObjectives
        objectives={[
          { id: 1, text: 'Destroy all enemy fighters', completed: false },
          { id: 2, text: 'Protect allied transport', completed: true },
          { id: 3, text: 'Return to carrier', completed: false },
        ]}
      />
      <NotificationSystem notifications={["Mission updated", "Low health!"]} />
      <PauseMenu
        open={pauseOpen}
        onResume={() => setPauseOpen(false)}
        onRestart={() => { setPauseOpen(false); alert('Restart mission!'); }}
        onSettings={() => { 
          console.log('Settings button clicked');
          setPauseOpen(false); 
          setSettingsOpen(true); 
        }}
        onQuit={() => { setPauseOpen(false); alert('Quit game!'); }}
      />
      {settingsOpen && <ControlSettingsWrapper onClose={() => setSettingsOpen(false)} />}
      {/* DDA Debug Overlay (F5 to toggle) */}
      <DDADebugPanel dda={window.DDA} />
    </>
  );
}

// targetingRoot removed; OverlayRoot is now rendered via root.render(<OverlayRoot />);


let lastFrameTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  updateEnemies(dt, { player: window.playerAircraft });
  threeEnv.render();
}
animate();

console.log('Top Gun Game: Entry point loaded!');

// --- Debug/Dev Menu Integration ---
(function setupDebugMenu() {
  if (document.getElementById('debug-menu')) return; // Prevent duplicates
  const menu = document.createElement('div');
  menu.id = 'debug-menu';
  menu.style.position = 'fixed';
  menu.style.top = '10px';
  menu.style.right = '10px';
  menu.style.background = 'rgba(0,0,0,0.85)';
  menu.style.color = '#fff';
  menu.style.padding = '14px';
  menu.style.zIndex = 10001;
  menu.style.borderRadius = '8px';
  menu.style.fontSize = '14px';
  menu.innerHTML = `
    <h4 style="margin-top:0">Debug Menu</h4>
    <button id="test-ai-engagement">AI Engagement Test</button><br><br>
    <button id="test-formation">Test Formation</button><br><br>
    <label style="display:block;margin-bottom:4px">
      <input type="checkbox" id="debug-ai-aim" /> Show AI Aim Line
    </label>
    <label style="display:block;margin-bottom:4px">
      <input type="checkbox" id="debug-ai-stats" /> Log AI Stats
    </label>
    <button id="close-debug-menu" style="margin-top:8px;float:right">×</button>
  `;
  document.body.appendChild(menu);
  document.getElementById('close-debug-menu').onclick = () => menu.remove();
  document.getElementById('debug-ai-aim').onchange = e => window.DEBUG_AI_AIM = e.target.checked;
  document.getElementById('debug-ai-stats').onchange = e => window.DEBUG_AI_STATS = e.target.checked;
  document.getElementById('test-ai-engagement').onclick = () => runAIEngagementTest();
  document.getElementById('test-formation').onclick = () => runFormationTestScenario();

  // --- Test Scenario: Formation Flight ---
function runFormationTestScenario() {
  // Remove previous enemies and formation
  if (window.enemies && Array.isArray(window.enemies)) {
    window.enemies.forEach(e => {
      if (e.mesh && window.scene) window.scene.remove(e.mesh);
    });
  }
  window.enemies = [];
  window.enemyFormation = null;
  // Spawn a visible V-formation of 4 enemies
  spawnEnemies(4);
  // Set all to formation state
  window.enemies.forEach(e => e.stateDebug = 'formation');
  // Put formation in easy-to-see position
  if (window.enemyFormation && window.enemyFormation.leader) {
    window.enemyFormation.leader.position.set(0, 100, -100);
    window.enemyFormation.leader.mesh.position.copy(window.enemyFormation.leader.position);
  }
  // Animate formation for demo
  let t = 0;
  function animateFormation() {
    t += 0.016;
    if (window.enemyFormation && window.enemyFormation.leader) {
      // Move leader in a slow circle
      const r = 60;
      window.enemyFormation.leader.position.set(
        Math.cos(t) * r,
        100,
        Math.sin(t) * r - 100
      );
      window.enemyFormation.leader.mesh.position.copy(window.enemyFormation.leader.position);
    }
    requestAnimationFrame(animateFormation);
  }
  animateFormation();
}
window.runFormationTestScenario = runFormationTestScenario;

  // --- Test Scenario ---
  function runAIEngagementTest() {
    // Remove existing test actors
    if (window.testPlayer && window.scene) window.scene.remove(window.testPlayer.mesh);
    if (window.testEnemy && window.scene) window.scene.remove(window.testEnemy.mesh);
    window.testPlayer = undefined;
    window.testEnemy = undefined;

    // Import AI config if not already
    let aiConfigs = window.aiDifficultyConfigs;
    if (!aiConfigs) {
      try {
        aiConfigs = require('./ai/aiDifficultyConfigs').aiDifficultyConfigs;
        window.aiDifficultyConfigs = aiConfigs;
      } catch (e) {
        aiConfigs = {
          medium: { aimError: 0.06, reactionTime: 0.6, predictionAccuracy: 0.75, minHitProbability: 0.35 }
        };
      }
    }
    // Import classes if not already
    const EnemyAircraft = window.EnemyAircraft || require('./aircraft/EnemyAircraft').default;
    const PlayerAircraft = window.PlayerAircraft || require('./aircraft/PlayerAircraft').default;
    const THREE = window.THREE || require('three');

    // Spawn test player
    const player = new PlayerAircraft({
      position: new THREE.Vector3(0, 100, 0),
      velocity: new THREE.Vector3(0, 0, -200)
    });
    window.testPlayer = player;
    window.scene.add(player.mesh);

    // Spawn test enemy
    const enemy = new EnemyAircraft({
      position: new THREE.Vector3(0, 100, 1200),
      aiConfig: aiConfigs['medium']
    });
    window.testEnemy = enemy;
    window.scene.add(enemy.mesh);

    // Test loop (separate from main game loop)
    function testLoop() {
      if (!window.testPlayer || !window.testEnemy) return;
      const dt = 1/60;
      window.testPlayer.update(dt);
      window.testEnemy.update(dt, { playerAircraft: window.testPlayer });
      // Draw aim line if enabled
      if (window.DEBUG_AI_AIM && window.testEnemy._lastAimPoint) {
        if (!window.testEnemy._aimLine) {
          const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
          const points = [window.testEnemy.position.clone(), window.testEnemy._lastAimPoint.clone()];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          window.testEnemy._aimLine = new THREE.Line(geometry, material);
          window.scene.add(window.testEnemy._aimLine);
        } else {
          window.testEnemy._aimLine.geometry.setFromPoints([
            window.testEnemy.position.clone(),
            window.testEnemy._lastAimPoint.clone()
          ]);
        }
      } else if (window.testEnemy._aimLine) {
        window.scene.remove(window.testEnemy._aimLine);
        window.testEnemy._aimLine = null;
      }
      // Optionally log stats
      if (window.DEBUG_AI_STATS) {
        // Example: log every shot or hit/miss in EnemyAircraft.fireWeaponAtPlayer()
      }
      window._testLoopId = requestAnimationFrame(testLoop);
    }
    if (window._testLoopId) cancelAnimationFrame(window._testLoopId);
    testLoop();
  }
})();

if (module.hot) {
  module.hot.accept();
  console.log('HMR enabled');
}

