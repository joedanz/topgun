// src/components/HUD.js
// Main HUD container and core flight info components
import React, { useState, useEffect } from 'react';
import './HUD.css';

export function HUD({ speed = 0, altitude = 0, ammo = 0, health = 100 }) {
  return (
    <div className="hud-container">
      <SpeedDisplay speed={speed} />
      <AltitudeDisplay altitude={altitude} />
      <AmmoDisplay ammo={ammo} />
      <HealthBar health={health} />
    </div>
  );
}

function SpeedDisplay({ speed }) {
  const [prev, setPrev] = useState(speed);
  useEffect(() => { setPrev(speed); }, [speed]);
  return (
    <div className="hud-speed hud-block">
      <span className="hud-label">SPD</span>
      <span className="hud-value">{speed.toFixed(0)}
        <span className="hud-unit">kn</span>
      </span>
    </div>
  );
}

function AltitudeDisplay({ altitude }) {
  return (
    <div className="hud-altitude hud-block">
      <span className="hud-label">ALT</span>
      <span className="hud-value">{altitude.toFixed(0)}
        <span className="hud-unit">ft</span>
      </span>
    </div>
  );
}

function AmmoDisplay({ ammo }) {
  return (
    <div className="hud-ammo hud-block">
      <span role="img" aria-label="ammo" className="hud-icon">🔫</span>
      <span className="hud-value">{ammo}</span>
    </div>
  );
}

function HealthBar({ health }) {
  // Green to red gradient
  const color = `linear-gradient(90deg, #0f0 ${(health)}%, #ff0 ${(100-health)/2+health}%, #f00 100%)`;
  return (
    <div className="hud-health hud-block">
      <span className="hud-label">HP</span>
      <div className="hud-health-bar" style={{ background: color }}>
        <div className="hud-health-fill" style={{ width: `${health}%` }} />
      </div>
      <span className="hud-value">{health}</span>
    </div>
  );
}
