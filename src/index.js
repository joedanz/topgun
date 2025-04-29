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
import './components/PauseMenu.css';

const appDiv = document.getElementById('app');
const threeEnv = new ThreeEnvironment(appDiv);

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

function renderHUD() {
  const { currentWeapon, weapons } = getHUDWeaponProps();
  root.render(
    <HUD
      speed={window.playerAircraft?.speed || 420}
      altitude={window.playerAircraft?.position?.y || 12000}
      currentWeapon={currentWeapon}
      weapons={weapons}
      health={window.playerAircraft?.health ?? 87}
    />
  );
}

renderHUD();
// Optionally, call renderHUD() in your game loop or after weapon changes to update HUD

// --- Weapon Switching Input Integration ---
if (window.inputHandler) {
  // Next/Prev weapon
  window.inputHandler.onInput('nextWeapon', (pressed) => {
    if (pressed && window.playerAircraft) {
      window.playerAircraft.switchWeapon(+1);
      renderHUD();
    }
  });
  window.inputHandler.onInput('prevWeapon', (pressed) => {
    if (pressed && window.playerAircraft) {
      window.playerAircraft.switchWeapon(-1);
      renderHUD();
    }
  });
  // Direct weapon selection (number keys)
  for (let i = 1; i <= 4; ++i) {
    window.inputHandler.onInput(`selectWeapon${i}`, (pressed) => {
      if (pressed && window.playerAircraft) {
        window.playerAircraft.switchWeapon(i - 1);
        renderHUD();
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

// Utility: Get all valid enemy targets (simulate for now)
function getEnemyTargets() {
  // TODO: Replace with actual enemy list from game state
  if (!window.enemies) return [];
  return window.enemies.map(e => ({
    id: e.id,
    screenX: e.screenX,
    screenY: e.screenY,
    distance: e.distance,
    onScreen: e.onScreen,
    inRange: e.inRange,
    ref: e
  }));
}

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

// Mount TargetingSystem overlay (above HUD)
const targetingDiv = document.createElement('div');
targetingDiv.id = 'targeting-root';
targetingDiv.style.position = 'fixed';
targetingDiv.style.left = 0;
targetingDiv.style.right = 0;
targetingDiv.style.bottom = 0;
targetingDiv.style.top = 0;
targetingDiv.style.pointerEvents = 'none';
targetingDiv.style.zIndex = 110;
document.body.appendChild(targetingDiv);

const targetingRoot = createRoot(targetingDiv);
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
  return (
    <>
      <HitMarker trigger={hitMarkerTrigger} />
      <HUDOverlayEffects damageTrigger={damageFlash} onShake={handleShake} />
      <TargetingDemo />
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
    </>
  );
}

targetingRoot.render(<OverlayRoot />);


function animate() {
  requestAnimationFrame(animate);
  threeEnv.render();
}
animate();

console.log('Top Gun Game: Entry point loaded!');

if (module.hot) {
  module.hot.accept();
  console.log('HMR enabled');
}

