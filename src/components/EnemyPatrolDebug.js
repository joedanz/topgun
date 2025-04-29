// src/components/EnemyPatrolDebug.js
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Visualizes patrol waypoints and current target for an enemy aircraft.
 * Props:
 *   enemy: EnemyAircraft instance
 *   camera: THREE.Camera
 */
export default function EnemyPatrolDebug({ enemy, camera }) {
  const canvasRef = useRef();

  useEffect(() => {
    function draw() {
      if (!enemy || !camera || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      if (!enemy.patrolRoute || enemy.patrolRoute.length === 0) return;
      // Draw waypoints as circles
      enemy.patrolRoute.forEach((wp, i) => {
        const pos = wp.clone().project(camera);
        if (pos.z < 0 || pos.z > 1) return;
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = (i === enemy.currentWaypointIndex) ? '#0ff' : '#fff';
        ctx.lineWidth = (i === enemy.currentWaypointIndex) ? 3 : 1;
        ctx.stroke();
        ctx.font = '12px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${i+1}`, x + 12, y + 4);
      });
      // Draw lines between waypoints
      ctx.beginPath();
      let first = true;
      enemy.patrolRoute.forEach((wp) => {
        const pos = wp.clone().project(camera);
        if (pos.z < 0 || pos.z > 1) return;
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.stroke();
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
      if (!enemy.patrolRoute || enemy.patrolRoute.length === 0) return;
      // Draw waypoints as circles
      enemy.patrolRoute.forEach((wp, i) => {
        const pos = wp.clone().project(camera);
        if (pos.z < 0 || pos.z > 1) return;
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = (i === enemy.currentWaypointIndex) ? '#0ff' : '#fff';
        ctx.lineWidth = (i === enemy.currentWaypointIndex) ? 3 : 1;
        ctx.stroke();
        ctx.font = '12px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${i+1}`, x + 12, y + 4);
      });
      // Draw lines between waypoints
      ctx.beginPath();
      let first = true;
      enemy.patrolRoute.forEach((wp) => {
        const pos = wp.clone().project(camera);
        if (pos.z < 0 || pos.z > 1) return;
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.stroke();
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
        zIndex: 998,
        background: 'transparent',
      }}
    />
  );
}
