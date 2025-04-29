import ThreeEnvironment from './three/ThreeEnvironment';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HUD } from './components/HUD';
import './components/HUD.css';
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
root.render(
  <HUD speed={420} altitude={12000} ammo={36} health={87} /> // TODO: wire real data
);

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
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setHit(h => !h);
    }, 2000);
    return () => clearInterval(interval);
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

  const enemies = [
    { id: 1, screenX: '60vw', screenY: '40vh', distance: 900, onScreen: true, inRange: tick % 4 === 0 },
    { id: 2, screenX: '90vw', screenY: '10vh', distance: 1200, onScreen: false, inRange: tick % 4 === 1 },
    { id: 3, screenX: '50vw', screenY: '90vh', distance: 450, onScreen: true, inRange: tick % 4 === 2 }
  ];
  return (
    <TargetingSystem
      hoverTarget={true}
      enemies={enemies}
      hitMarker={hit}
      soundEnabled={soundEnabled}
    />
  );
}

function OverlayRoot() {
  const [pauseOpen, setPauseOpen] = useState(false);
  React.useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') setPauseOpen(open => !open);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return (
    <>
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
        onSettings={() => { setPauseOpen(false); alert('Settings!'); }}
        onQuit={() => { setPauseOpen(false); alert('Quit game!'); }}
      />
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

