// src/components/EnemyFOVDebug.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Visualizes the FOV cone and detection status for an enemy aircraft.
 * Props:
 *   enemy: EnemyAircraft instance
 *   camera: THREE.Camera
 */
export default function EnemyFOVDebug({ enemy, camera }) {
  const canvasRef = useRef();

  // 2D Overlay: Draw FOV cone projected to screen
  useEffect(() => {
    function draw() {
      if (!enemy || !camera || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      // Parameters
      const origin = enemy.position.clone();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.rotation).normalize();
      const fov = enemy.fieldOfView || (80 * Math.PI / 180);
      const range = enemy.detectionRange || 1400;
      // Project origin to screen
      const originProj = origin.clone().project(camera);
      if (originProj.z < 0 || originProj.z > 1) return;
      const ox = (originProj.x * 0.5 + 0.5) * window.innerWidth;
      const oy = (-originProj.y * 0.5 + 0.5) * window.innerHeight;
      // Draw FOV cone as an arc
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      const steps = 32;
      for (let i = 0; i <= steps; ++i) {
        const angle = -fov/2 + (fov * i/steps);
        const dir = forward.clone().applyAxisAngle(new THREE.Vector3(0,1,0), angle);
        const endpoint = origin.clone().add(dir.multiplyScalar(range));
        const epProj = endpoint.project(camera);
        if (epProj.z < 0 || epProj.z > 1) continue;
        const ex = (epProj.x * 0.5 + 0.5) * window.innerWidth;
        const ey = (-epProj.y * 0.5 + 0.5) * window.innerHeight;
        ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.fillStyle = enemy.detectingPlayer ? '#0f0' : '#f00';
      ctx.fill();
      ctx.restore();
      // Draw detection timer as a bar
      if (enemy.detectingPlayer) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#0f0';
        ctx.fillRect(ox-20, oy-40, Math.min(40, 40*enemy.detectionTimer/enemy.reactionTime), 6);
        ctx.strokeStyle = '#222';
        ctx.strokeRect(ox-20, oy-40, 40, 6);
        ctx.restore();
      }
    }
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [enemy, camera]);

  // Redraw every frame
  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      draw();
      requestAnimationFrame(loop);
    }
    function draw() {
      if (!enemy || !camera || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      // Parameters
      const origin = enemy.position.clone();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(enemy.rotation).normalize();
      const fov = enemy.fieldOfView || (80 * Math.PI / 180);
      const range = enemy.detectionRange || 1400;
      // Project origin to screen
      const originProj = origin.clone().project(camera);
      if (originProj.z < 0 || originProj.z > 1) return;
      const ox = (originProj.x * 0.5 + 0.5) * window.innerWidth;
      const oy = (-originProj.y * 0.5 + 0.5) * window.innerHeight;
      // Draw FOV cone as an arc
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      const steps = 32;
      for (let i = 0; i <= steps; ++i) {
        const angle = -fov/2 + (fov * i/steps);
        const dir = forward.clone().applyAxisAngle(new THREE.Vector3(0,1,0), angle);
        const endpoint = origin.clone().add(dir.multiplyScalar(range));
        const epProj = endpoint.project(camera);
        if (epProj.z < 0 || epProj.z > 1) continue;
        const ex = (epProj.x * 0.5 + 0.5) * window.innerWidth;
        const ey = (-epProj.y * 0.5 + 0.5) * window.innerHeight;
        ctx.lineTo(ex, ey);
      }
      ctx.closePath();
      ctx.fillStyle = enemy.detectingPlayer ? '#0f0' : '#f00';
      ctx.fill();
      ctx.restore();
      // Draw detection timer as a bar
      if (enemy.detectingPlayer) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#0f0';
        ctx.fillRect(ox-20, oy-40, Math.min(40, 40*enemy.detectionTimer/enemy.reactionTime), 6);
        ctx.strokeStyle = '#222';
        ctx.strokeRect(ox-20, oy-40, 40, 6);
        ctx.restore();
      }
    }
    loop();
    return () => { running = false; };
  }, [enemy, camera]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 997,
        background: 'transparent',
      }}
    />
  );
}
