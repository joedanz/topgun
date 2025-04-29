// src/components/EnemyDebugLabel.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Displays a floating label above an enemy aircraft in the 3D scene.
 * Props:
 *   enemy: EnemyAircraft instance
 *   camera: THREE.Camera
 *   label: string (state name)
 */
export default function EnemyDebugLabel({ enemy, camera, label }) {
  const divRef = useRef();

  useEffect(() => {
    function updatePosition() {
      if (!enemy || !camera || !divRef.current) return;
      // Project enemy position to screen
      const pos = enemy.position.clone();
      pos.y += 35; // raise label above aircraft
      const vector = pos.project(camera);
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
      divRef.current.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
      divRef.current.style.display = (vector.z < 1 && vector.z > 0) ? 'block' : 'none';
    }
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [enemy, camera]);

  // Update every frame
  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      if (enemy && camera && divRef.current) {
        const pos = enemy.position.clone();
        pos.y += 35;
        const vector = pos.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        divRef.current.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
        divRef.current.style.display = (vector.z < 1 && vector.z > 0) ? 'block' : 'none';
      }
      requestAnimationFrame(loop);
    }
    loop();
    return () => { running = false; };
  }, [enemy, camera]);

  return (
    <div ref={divRef} style={{
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: 999,
      color: '#fff',
      background: 'rgba(0,0,0,0.6)',
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 14,
      fontFamily: 'monospace',
      border: '1px solid #0ff',
      boxShadow: '0 1px 6px #000a',
      transition: 'opacity 0.2s',
      opacity: 0.85
    }}>{label}</div>
  );
}
